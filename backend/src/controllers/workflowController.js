const { Workflow, Task, ProjectMember, Board } = require('../models');
const workflowEngine = require('../services/workflowEngine');
const notifService   = require('../services/notificationService');
const activityLogger = require('../utils/activityLogger');

const USER_SELECT = 'id name email avatar';

function err(res, status, message, error) {
  return res.status(status).json({ statusCode: status, message, error });
}

async function getOwnerRole(userId, projectId) {
  const m = await ProjectMember.findOne({ user: userId, projectId });
  return m?.role || null;
}

// ─── GET /api/projects/:projectId/workflows ───────────────────────────────────

exports.listWorkflows = async (req, res) => {
  try {
    const { projectId } = req.params;
    const workflows = await Workflow.find({ projectId }).sort({ createdAt: 1 });

    // Attach task counts
    const withCounts = await Promise.all(workflows.map(async (wf) => {
      const count = await Task.countDocuments({ workflowId: wf._id, deletedAt: null });
      return { ...wf.toJSON(), taskCount: count };
    }));

    res.json({ workflows: withCounts });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/projects/:projectId/workflows ──────────────────────────────────

exports.createWorkflow = async (req, res) => {
  try {
    const { projectId } = req.params;
    const role = await getOwnerRole(req.user._id, projectId);
    if (role !== 'owner') return err(res, 403, 'Chỉ Owner mới có thể tạo workflow', 'Forbidden');

    const { name, description = '', states = [], transitions = [], isDefault = false } = req.body;
    if (!name?.trim()) return err(res, 400, 'Tên workflow là bắt buộc', 'Bad Request');

    const validationErrors = workflowEngine.validateWorkflow(states, transitions);
    if (validationErrors.length) return err(res, 422, validationErrors.join('; '), 'Validation Error');

    // Assign UUIDs if missing
    const crypto = require('crypto');
    const mappedStates = states.map(s => ({ ...s, id: s.id || crypto.randomUUID() }));
    const mappedTrans  = transitions.map(t => ({ ...t, id: t.id || crypto.randomUUID() }));

    if (isDefault) {
      await Workflow.updateMany({ projectId, isDefault: true }, { $set: { isDefault: false } });
    }

    const workflow = await Workflow.create({
      projectId, name: name.trim(), description, isDefault,
      states: mappedStates, transitions: mappedTrans,
      createdBy: req.user._id,
    });

    res.status(201).json({ workflow });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── GET /api/workflows/:id ───────────────────────────────────────────────────

exports.getWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return err(res, 404, 'Workflow not found', 'Not Found');

    const tasks = await Task.find({ workflowId: workflow._id, deletedAt: null });
    const statsCounts = {};
    for (const t of tasks) {
      if (t.currentStateId) statsCounts[t.currentStateId] = (statsCounts[t.currentStateId] || 0) + 1;
    }

    // Average time per state from stateHistory
    const avgTime = {};
    for (const t of tasks) {
      for (const h of (t.stateHistory || [])) {
        if (h.durationHours != null) {
          if (!avgTime[h.stateId]) avgTime[h.stateId] = [];
          avgTime[h.stateId].push(h.durationHours);
        }
      }
    }
    const avgTimeResult = {};
    for (const [sid, arr] of Object.entries(avgTime)) {
      avgTimeResult[sid] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10;
    }

    res.json({ workflow, stats: { taskCount: tasks.length, byState: statsCounts, avgHoursByState: avgTimeResult } });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── PUT /api/workflows/:id ───────────────────────────────────────────────────

exports.updateWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return err(res, 404, 'Workflow not found', 'Not Found');

    const role = await getOwnerRole(req.user._id, workflow.projectId);
    if (role !== 'owner') return err(res, 403, 'Chỉ Owner mới có thể sửa workflow', 'Forbidden');

    const { name, description, states, transitions, isDefault } = req.body;

    if (states !== undefined || transitions !== undefined) {
      const s = states ?? workflow.states;
      const t = transitions ?? workflow.transitions;
      const validationErrors = workflowEngine.validateWorkflow(s, t);
      if (validationErrors.length) return err(res, 422, validationErrors.join('; '), 'Validation Error');
    }

    const crypto = require('crypto');
    if (name        !== undefined) workflow.name        = name.trim();
    if (description !== undefined) workflow.description = description;
    if (states      !== undefined) workflow.states      = states.map(s => ({ ...s, id: s.id || crypto.randomUUID() }));
    if (transitions !== undefined) workflow.transitions = transitions.map(t => ({ ...t, id: t.id || crypto.randomUUID() }));

    if (isDefault) {
      await Workflow.updateMany({ projectId: workflow.projectId, isDefault: true }, { $set: { isDefault: false } });
      workflow.isDefault = true;
    }

    await workflow.save();
    res.json({ workflow });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── DELETE /api/workflows/:id ────────────────────────────────────────────────

exports.deleteWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return err(res, 404, 'Workflow not found', 'Not Found');

    if (workflow.isDefault) return err(res, 400, 'Không thể xóa workflow mặc định', 'Bad Request');

    const role = await getOwnerRole(req.user._id, workflow.projectId);
    if (role !== 'owner') return err(res, 403, 'Chỉ Owner mới có thể xóa workflow', 'Forbidden');

    const inUse = await Task.countDocuments({ workflowId: workflow._id, deletedAt: null });
    if (inUse > 0) return err(res, 400, `Workflow đang được dùng bởi ${inUse} task. Vui lòng chuyển sang workflow khác trước.`, 'Bad Request');

    await workflow.softDelete();
    res.json({ statusCode: 200, message: 'Đã xóa workflow' });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/workflows/:id/clone ───────────────────────────────────────────

exports.cloneWorkflow = async (req, res) => {
  try {
    const source = await Workflow.findById(req.params.id);
    if (!source) return err(res, 404, 'Workflow not found', 'Not Found');

    const role = await getOwnerRole(req.user._id, source.projectId);
    if (role !== 'owner') return err(res, 403, 'Chỉ Owner mới có thể sao chép workflow', 'Forbidden');

    const { name } = req.body;
    const crypto = require('crypto');

    // Re-map state/transition IDs to avoid collision
    const oldToNew = {};
    const newStates = source.states.map(s => {
      const newId = crypto.randomUUID();
      oldToNew[s.id] = newId;
      return { ...s.toObject ? s.toObject() : s, id: newId };
    });
    const newTransitions = source.transitions.map(t => ({
      ...t.toObject ? t.toObject() : t,
      id:          crypto.randomUUID(),
      fromStateId: oldToNew[t.fromStateId] || t.fromStateId,
      toStateId:   oldToNew[t.toStateId]   || t.toStateId,
    }));

    const clone = await Workflow.create({
      projectId:   source.projectId,
      name:        name?.trim() || `${source.name} (bản sao)`,
      description: source.description,
      isDefault:   false,
      states:      newStates,
      transitions: newTransitions,
      createdBy:   req.user._id,
    });

    res.status(201).json({ workflow: clone });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── POST /api/tasks/:id/transitions ─────────────────────────────────────────

exports.executeTaskTransition = async (req, res) => {
  try {
    const task = req.task;
    if (!task.workflowId) return err(res, 400, 'Task chưa được gán workflow', 'Bad Request');

    const workflow = await Workflow.findById(task.workflowId);
    if (!workflow) return err(res, 404, 'Workflow not found', 'Not Found');

    const membership = await ProjectMember.findOne({
      user:      req.user._id,
      projectId: { $exists: true },
    });
    const board = await Board.findById(task.boardId);
    const mem   = await ProjectMember.findOne({ user: req.user._id, projectId: board?.projectId });
    const role  = mem?.role || 'member';

    const { transitionId, comment = '' } = req.body;
    if (!transitionId) return err(res, 400, 'transitionId là bắt buộc', 'Bad Request');

    const result = await workflowEngine.executeTransition({
      task, workflow, transitionId, userId: req.user._id, userRole: role, comment,
    });

    if (!result.ok) return err(res, 400, result.error, 'Bad Request');

    await result.task.populate('assignee', USER_SELECT);
    res.json({ task: result.task, status: result.status });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/tasks/:id/approve ─────────────────────────────────────────────

exports.approveTaskTransition = async (req, res) => {
  try {
    const task = req.task;
    if (!task.workflowId) return err(res, 400, 'Task chưa được gán workflow', 'Bad Request');

    const workflow = await Workflow.findById(task.workflowId);
    if (!workflow) return err(res, 404, 'Workflow not found', 'Not Found');

    const { transitionId, decision, comment = '' } = req.body;
    if (!transitionId || !['approve', 'reject'].includes(decision)) {
      return err(res, 400, 'transitionId và decision (approve|reject) là bắt buộc', 'Bad Request');
    }

    const result = await workflowEngine.processApproval({
      task, workflow, transitionId, userId: req.user._id,
      decision: decision === 'approve' ? 'approved' : 'rejected', comment,
    });

    if (!result.ok) return err(res, 400, result.error, 'Bad Request');

    await result.task.populate('assignee', USER_SELECT);
    res.json({ task: result.task, status: result.status });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/tasks/:id/available-transitions ────────────────────────────────

exports.getAvailableTransitions = async (req, res) => {
  try {
    const task = req.task;
    if (!task.workflowId) return res.json({ transitions: [] });

    const workflow = await Workflow.findById(task.workflowId);
    if (!workflow) return res.json({ transitions: [] });

    const board = await Board.findById(task.boardId);
    const mem   = await ProjectMember.findOne({ user: req.user._id, projectId: board?.projectId });
    const role  = mem?.role || 'member';

    const transitions = workflowEngine.getAvailableTransitions(workflow, task, req.user._id, role);
    res.json({ transitions, currentStateId: task.currentStateId, workflow: { states: workflow.states } });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/tasks/:id/state-history ────────────────────────────────────────

exports.getStateHistory = async (req, res) => {
  try {
    const task = req.task;
    if (!task.workflowId) return res.json({ history: [] });

    const workflow = await Workflow.findById(task.workflowId);
    const stateMap = {};
    (workflow?.states || []).forEach(s => { stateMap[s.id] = s; });

    const history = (task.stateHistory || []).map(h => ({
      stateId:       h.stateId,
      stateName:     stateMap[h.stateId]?.name || h.stateId,
      stateColor:    stateMap[h.stateId]?.color || '#3b82f6',
      enteredAt:     h.enteredAt,
      exitedAt:      h.exitedAt,
      durationHours: h.durationHours,
    }));

    res.json({ history });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/tasks/:id/assign-workflow ─────────────────────────────────────

exports.assignWorkflow = async (req, res) => {
  try {
    const task = req.task;
    const { workflowId } = req.body;
    if (!workflowId) return err(res, 400, 'workflowId là bắt buộc', 'Bad Request');

    const workflow = await Workflow.findById(workflowId);
    if (!workflow) return err(res, 404, 'Workflow not found', 'Not Found');

    const initialState = workflow.states.find(s => s.isInitial);
    if (!initialState) return err(res, 400, 'Workflow không có trạng thái bắt đầu', 'Bad Request');

    task.workflowId     = workflow._id;
    task.currentStateId = initialState.id;
    task.stateHistory   = [{ stateId: initialState.id, enteredAt: new Date(), userId: req.user._id }];
    await task.save();

    await task.populate('assignee', USER_SELECT);
    res.json({ task });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/workflows/:id/ai/analyze ──────────────────────────────────────

exports.aiAnalyzeWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) return err(res, 404, 'Workflow not found', 'Not Found');

    const tasks = await Task.find({ workflowId: workflow._id, deletedAt: null });

    // Build stats per state
    const stateStats = {};
    for (const state of workflow.states) {
      stateStats[state.id] = { name: state.name, totalHours: 0, count: 0 };
    }
    for (const t of tasks) {
      for (const h of (t.stateHistory || [])) {
        if (h.durationHours != null && stateStats[h.stateId]) {
          stateStats[h.stateId].totalHours += h.durationHours;
          stateStats[h.stateId].count++;
        }
      }
    }
    const avgByState = Object.entries(stateStats).map(([id, s]) => ({
      stateId: id, stateName: s.name,
      avgHours: s.count ? Math.round(s.totalHours / s.count * 10) / 10 : null,
    }));

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    if (!process.env.GEMINI_API_KEY) return err(res, 503, 'AI service not configured', 'Service Unavailable');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Bạn là AI tư vấn quy trình phần mềm. Phân tích workflow sau và đưa ra insights bằng tiếng Việt.

Workflow: "${workflow.name}"
Trạng thái: ${workflow.states.map(s => `${s.name}(slaHours:${s.slaHours||'N/A'})`).join(', ')}
Số transition: ${workflow.transitions.length}
Số task đã xử lý: ${tasks.length}

Thống kê thời gian trung bình ở mỗi trạng thái:
${avgByState.map(s => `- ${s.stateName}: ${s.avgHours != null ? s.avgHours + ' giờ' : 'chưa có dữ liệu'}`).join('\n')}

Hãy phân tích và trả về JSON hợp lệ (không có text ngoài JSON):
{
  "bottleneck": { "stateName": "...", "reason": "..." },
  "avgCompletionDays": 0,
  "recommendations": ["...", "...", "..."],
  "suggestedSLA": [{ "stateName": "...", "hours": 0, "reason": "..." }]
}`;

    const result  = await model.generateContent(prompt);
    const text    = result.response.text();
    const jsonStr = text.match(/\{[\s\S]*\}/)?.[0];
    let parsed;
    try { parsed = jsonStr ? JSON.parse(jsonStr) : null; } catch { parsed = null; }

    res.json({ analysis: parsed, rawStats: avgByState });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};
