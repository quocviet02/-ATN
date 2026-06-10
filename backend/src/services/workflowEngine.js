/**
 * WorkflowEngine — state machine logic for custom workflows.
 * All methods are pure (no side-effects); callers persist results.
 */

const notifService   = require('./notificationService');
const activityLogger = require('../utils/activityLogger');
const ioInstance     = require('../utils/ioInstance');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findTransition(workflow, transitionId) {
  return workflow.transitions.find(t => t.id === transitionId) || null;
}

function findState(workflow, stateId) {
  return workflow.states.find(s => s.id === stateId) || null;
}

// ─── Permission check ─────────────────────────────────────────────────────────

function canUserTransition(transition, userId, userRole) {
  if (!transition) return false;

  const roleOk = !transition.allowedRoles?.length ||
    transition.allowedRoles.includes(userRole);

  const userOk = !transition.allowedUsers?.length ||
    transition.allowedUsers.some(u => u.toString() === userId.toString());

  // If both allowedRoles and allowedUsers are set, either condition satisfies
  if (transition.allowedRoles?.length && transition.allowedUsers?.length) {
    return roleOk || userOk;
  }
  return roleOk && userOk;
}

// ─── Required field check ─────────────────────────────────────────────────────

function getMissingFields(task, transition) {
  if (!transition.requiredFields?.length) return [];
  return transition.requiredFields.filter(f => {
    const val = task[f];
    return val === null || val === undefined || val === '';
  });
}

// ─── Available transitions ────────────────────────────────────────────────────

exports.getAvailableTransitions = function (workflow, task, userId, userRole) {
  if (!workflow || !task.currentStateId) return [];
  return workflow.transitions.filter(t =>
    t.fromStateId === task.currentStateId &&
    canUserTransition(t, userId, userRole)
  );
};

// ─── Execute transition ───────────────────────────────────────────────────────

exports.executeTransition = async function ({ task, workflow, transitionId, userId, userRole, comment = '' }) {
  const transition = findTransition(workflow, transitionId);
  if (!transition) return { ok: false, error: 'Transition not found' };

  if (transition.fromStateId !== task.currentStateId) {
    return { ok: false, error: 'Transition không khớp trạng thái hiện tại của task' };
  }

  if (!canUserTransition(transition, userId, userRole)) {
    return { ok: false, error: 'Bạn không có quyền thực hiện transition này' };
  }

  const missing = getMissingFields(task, transition);
  if (missing.length > 0) {
    return { ok: false, error: `Thiếu thông tin bắt buộc: ${missing.join(', ')}`, missingFields: missing };
  }

  // Requires approval → create pending approval
  if (transition.requireApproval) {
    const approverEntries = (transition.approvers || []).map(approverId => ({
      userId:    approverId,
      status:    'pending',
      decidedAt: null,
      comment:   '',
    }));

    task.pendingApprovals = task.pendingApprovals || [];
    task.pendingApprovals.push({
      transitionId,
      requesterId: userId,
      requestedAt: new Date(),
      comment,
      approvers:   approverEntries,
    });

    await task.save();

    // Notify each approver
    for (const approverId of (transition.approvers || [])) {
      notifService.create({
        recipient: approverId,
        type:      'task_updated',
        title:     'Yêu cầu phê duyệt',
        body:      `Task "${task.title}" đang chờ bạn phê duyệt chuyển sang "${findState(workflow, transition.toStateId)?.name}"`,
        link:      '/project/board',
        meta:      { taskId: task.id },
      });
    }

    return { ok: true, status: 'pending_approval', task };
  }

  // Immediate transition
  return _applyTransition({ task, workflow, transition, userId, comment });
};

// ─── Approve / Reject ─────────────────────────────────────────────────────────

exports.processApproval = async function ({ task, workflow, transitionId, userId, decision, comment = '' }) {
  const pendingIdx = (task.pendingApprovals || []).findIndex(p => p.transitionId === transitionId);
  if (pendingIdx === -1) return { ok: false, error: 'Không tìm thấy yêu cầu phê duyệt' };

  const pending = task.pendingApprovals[pendingIdx];
  const approverEntry = pending.approvers.find(a => a.userId.toString() === userId.toString());
  if (!approverEntry) return { ok: false, error: 'Bạn không phải approver của transition này' };
  if (approverEntry.status !== 'pending') return { ok: false, error: 'Bạn đã quyết định rồi' };

  approverEntry.status    = decision;
  approverEntry.decidedAt = new Date();
  approverEntry.comment   = comment;

  const transition = findTransition(workflow, transitionId);

  if (decision === 'rejected') {
    task.pendingApprovals.splice(pendingIdx, 1);
    await task.save();

    // Notify requester
    notifService.create({
      recipient: pending.requesterId,
      type:      'task_updated',
      title:     'Yêu cầu bị từ chối',
      body:      `Yêu cầu chuyển task "${task.title}" sang "${findState(workflow, transition?.toStateId)?.name}" đã bị từ chối`,
      link:      '/project/board',
      meta:      { taskId: task.id },
    });

    return { ok: true, status: 'rejected', task };
  }

  // Check if enough approvals
  const approvedCount = pending.approvers.filter(a => a.status === 'approved').length;
  const requiredCount = transition?.approvalCount || 1;

  if (approvedCount >= requiredCount) {
    task.pendingApprovals.splice(pendingIdx, 1);
    return _applyTransition({ task, workflow, transition, userId, comment: pending.comment });
  }

  await task.save();
  return { ok: true, status: 'waiting_more_approvals', task };
};

// ─── Internal: apply state change ────────────────────────────────────────────

async function _applyTransition({ task, workflow, transition, userId, comment }) {
  const now          = new Date();
  const oldStateId   = task.currentStateId;
  const newStateId   = transition.toStateId;

  // Close current state history entry
  if (task.stateHistory?.length) {
    const last = task.stateHistory[task.stateHistory.length - 1];
    if (!last.exitedAt) {
      last.exitedAt      = now;
      last.durationHours = Math.round((now - last.enteredAt) / 3600000 * 10) / 10;
    }
  }

  // Open new state history entry
  task.stateHistory = task.stateHistory || [];
  task.stateHistory.push({ stateId: newStateId, enteredAt: now, userId });

  task.currentStateId = newStateId;
  await task.save();

  // Activity log
  activityLogger.log(task.id, userId, 'state_changed',
    { stateId: oldStateId, stateName: findState(workflow, oldStateId)?.name },
    { stateId: newStateId, stateName: findState(workflow, newStateId)?.name, comment }
  );

  // Auto actions
  await _executeAutoActions(task, transition, userId, workflow);

  // Emit socket
  const io = ioInstance.getIO();
  if (io) {
    const { ProjectMember, Board } = require('../models/index');
    const board = await Board.findById(task.boardId).lean();
    if (board) {
      const members = await ProjectMember.find({ projectId: board.projectId });
      for (const m of members) {
        io.to(`user_${m.user.toString()}`).emit('task_state_changed', {
          taskId:     task.id,
          oldStateId,
          newStateId,
          stateName:  findState(workflow, newStateId)?.name,
          updatedBy:  userId,
        });
      }
    }
  }

  return { ok: true, status: 'transitioned', task };
}

// ─── Auto actions ─────────────────────────────────────────────────────────────

async function _executeAutoActions(task, transition, userId, workflow) {
  for (const action of (transition.autoActions || [])) {
    try {
      if (action.type === 'send_notification') {
        const { recipientIds = [], message = '' } = action.config || {};
        for (const recipientId of recipientIds) {
          notifService.create({
            recipient: recipientId,
            type:      'task_updated',
            title:     'Task cập nhật tự động',
            body:      message || `Task "${task.title}" đã chuyển trạng thái`,
            link:      '/project/board',
            meta:      { taskId: task.id },
          });
        }
      } else if (action.type === 'assign_user') {
        const { userId: assigneeId } = action.config || {};
        if (assigneeId) {
          task.assignee = assigneeId;
          await task.save();
        }
      }
    } catch (e) {
      console.error('[WorkflowEngine] autoAction error:', e.message);
    }
  }
}

// ─── Validate workflow definition ─────────────────────────────────────────────

exports.validateWorkflow = function (states, transitions) {
  const errors = [];

  if (!states?.length) { errors.push('Cần ít nhất một trạng thái'); return errors; }

  const initialStates = states.filter(s => s.isInitial);
  const finalStates   = states.filter(s => s.isFinal);
  if (!initialStates.length) errors.push('Cần ít nhất một trạng thái bắt đầu (isInitial)');
  if (!finalStates.length)   errors.push('Cần ít nhất một trạng thái kết thúc (isFinal)');

  const stateIds = new Set(states.map(s => s.id));
  for (const t of (transitions || [])) {
    if (!t.name?.trim())          errors.push(`Transition thiếu tên`);
    if (!stateIds.has(t.fromStateId)) errors.push(`Transition "${t.name}" có fromStateId không hợp lệ`);
    if (!stateIds.has(t.toStateId))   errors.push(`Transition "${t.name}" có toStateId không hợp lệ`);
  }

  return errors;
};

// ─── SLA check ────────────────────────────────────────────────────────────────

exports.isSlaBreach = function (task, workflow) {
  if (!task.currentStateId || !workflow) return false;
  const state = findState(workflow, task.currentStateId);
  if (!state?.slaHours) return false;
  const last = (task.stateHistory || []).findLast(h => h.stateId === task.currentStateId && !h.exitedAt);
  if (!last) return false;
  const hoursInState = (Date.now() - new Date(last.enteredAt).getTime()) / 3600000;
  return hoursInState > state.slaHours;
};
