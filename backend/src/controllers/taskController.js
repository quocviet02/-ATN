const { Task, Column, User, ProjectMember, Comment, Board, Project } = require('../models');
const activityLogger   = require('../utils/activityLogger');
const notifService     = require('../services/notificationService');
const ioInstance       = require('../utils/ioInstance');

const USER_SELECT = 'id name email avatar';

function err(res, status, message, error) {
  return res.status(status).json({ statusCode: status, message, error });
}

// ─── GET /api/boards/:boardId/tasks ──────────────────────────────────────────

exports.getBoardTasks = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { assigneeId, priority, search, dueDateFrom, dueDateTo } = req.query;

    const filter = { boardId };
    if (assigneeId) filter.assignee = assigneeId;
    if (priority)   filter.priority = priority;
    if (search)     filter.title    = { $regex: search, $options: 'i' };
    if (dueDateFrom || dueDateTo) {
      filter.dueDate = {};
      if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
      if (dueDateTo)   filter.dueDate.$lte = new Date(dueDateTo);
    }

    const tasks = await Task.find(filter)
      .populate('assignee', USER_SELECT)
      .sort({ position: 1 });

    const grouped = {};
    for (const task of tasks) {
      const key = task.columnId.toString();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(task);
    }

    res.json({ tasks: grouped });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/columns/:columnId/tasks ────────────────────────────────────────

exports.getColumnTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ columnId: req.params.columnId })
      .populate('assignee', USER_SELECT)
      .sort({ position: 1 });
    res.json({ tasks });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/columns/:columnId/tasks ───────────────────────────────────────

exports.createTask = async (req, res) => {
  try {
    const { title, description = '', assigneeId, priority = 'medium', dueDate } = req.body;
    if (!title?.trim()) return err(res, 400, 'Title is required', 'Bad Request');

    const column = req.column;

    const last = await Task.findOne({ columnId: column._id }).sort({ position: -1 }).select('position');
    const position = last ? last.position + 1 : 0;

    const task = await Task.create({
      columnId:    column._id,
      boardId:     column.boardId,
      title:       title.trim(),
      description: description.trim(),
      assignee:    assigneeId ?? null,
      priority,
      dueDate:     dueDate ?? null,
      position,
      createdBy:   req.user._id,
    });

    await task.populate('assignee', USER_SELECT);

    // Log: created
    activityLogger.log(task.id, req.user.id, 'created', null, {
      title:    task.title,
      columnId: task.columnId,
      priority: task.priority,
    });

    // Log: assigned (if assignee set at creation)
    if (task.assignee) {
      activityLogger.log(task.id, req.user.id, 'assigned',
        { assigneeId: null },
        { assigneeId: task.assignee._id ?? task.assignee }
      );
      const assigneeId = task.assignee._id ?? task.assignee;
      if (assigneeId.toString() !== req.user.id) {
        notifService.create({
          recipient: assigneeId,
          type:      'task_assigned',
          title:     'Bạn được giao một task mới',
          body:      `"${task.title}" đã được giao cho bạn bởi ${req.user.name}`,
          link:      `/project/board`,
          meta:      { taskId: task.id },
        });
      }
    }

    res.status(201).json({ task });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── GET /api/tasks/:id ───────────────────────────────────────────────────────

exports.getTask = async (req, res) => {
  try {
    await req.task.populate('assignee', USER_SELECT);
    res.json({ task: req.task });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── PUT /api/tasks/:id ───────────────────────────────────────────────────────

exports.updateTask = async (req, res) => {
  try {
    const { title, description, assigneeId, priority, dueDate } = req.body;
    const task = req.task;

    // Snapshot before changes
    const snapshot = {
      title:       task.title,
      description: task.description,
      assigneeId:  task.assignee ? task.assignee.toString() : null,
      priority:    task.priority,
      dueDate:     task.dueDate,
    };

    if (title       !== undefined) task.title       = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (assigneeId  !== undefined) task.assignee    = assigneeId || null;
    if (priority    !== undefined) task.priority    = priority;
    if (dueDate     !== undefined) task.dueDate     = dueDate || null;

    await task.save();

    // ── Activity logging ────────────────────────────────────────────────────
    const newAssigneeId = task.assignee ? task.assignee.toString() : null;

    if (snapshot.assigneeId !== newAssigneeId) {
      activityLogger.log(task.id, req.user.id, 'assigned',
        { assigneeId: snapshot.assigneeId },
        { assigneeId: newAssigneeId }
      );
      if (newAssigneeId && newAssigneeId !== req.user.id) {
        notifService.create({
          recipient: newAssigneeId,
          type:      'task_assigned',
          title:     'Bạn được giao một task',
          body:      `"${task.title}" đã được giao cho bạn bởi ${req.user.name}`,
          link:      `/project/board`,
          meta:      { taskId: task.id },
        });
      }
    }

    const oldDiff = {};
    const newDiff = {};
    for (const f of ['title', 'description', 'priority', 'dueDate']) {
      if (String(snapshot[f]) !== String(task[f])) {
        oldDiff[f] = snapshot[f];
        newDiff[f] = task[f];
      }
    }
    if (Object.keys(newDiff).length > 0) {
      activityLogger.log(task.id, req.user.id, 'updated', oldDiff, newDiff);
    }

    await task.populate('assignee', USER_SELECT);
    res.json({ task });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────

exports.deleteTask = async (req, res) => {
  try {
    const task       = req.task;
    const membership = req.membership;

    // Permission: owner/admin can delete any; member can only delete their own task
    const isOwnerOrAdmin = ['owner', 'admin'].includes(membership.role);
    if (!isOwnerOrAdmin) {
      const createdById = task.createdBy?.toString();
      if (!createdById || createdById !== req.user.id) {
        return err(res, 403, 'Bạn không có quyền xóa task này', 'Forbidden');
      }
    }

    const { columnId, position, title } = task;

    // Populate assignee for notification
    await task.populate('assignee', 'id name email');

    // Soft delete task and all its comments
    await task.softDelete();
    await Comment.updateMany({ taskId: task._id, deletedAt: null }, { $set: { deletedAt: new Date() } });

    // Reorder remaining tasks in the column
    await Task.updateMany(
      { columnId, position: { $gt: position }, deletedAt: null },
      { $inc: { position: -1 } }
    );

    activityLogger.log(task.id, req.user.id, 'deleted', { title }, null);

    // Get board and project info for notification and socket
    const board = await Board.findById(task.boardId).populate('projectId');
    const projectName = board?.projectId?.name || '';

    // Notify assignee if different from deleter
    if (task.assignee) {
      const assigneeId = task.assignee._id?.toString() || task.assignee.toString();
      if (assigneeId !== req.user.id) {
        notifService.create({
          recipient: task.assignee._id || task.assignee,
          type:      'task_deleted',
          title:     'Task của bạn đã bị xóa',
          body:      `${req.user.name} đã xóa task "${title}" trong project "${projectName}"`,
          link:      '/project/board',
          meta:      { taskId: task.id },
        });
      }
    }

    // Emit socket event to all project members so their boards update in realtime
    const io = ioInstance.getIO();
    if (io && board) {
      const members = await ProjectMember.find({ projectId: board.projectId });
      for (const member of members) {
        io.to(`user_${member.user.toString()}`).emit('task_deleted', {
          taskId:    task.id,
          deletedBy: { id: req.user.id, name: req.user.name },
          title,
        });
      }
    }

    res.json({ statusCode: 200, message: 'Đã xóa task', taskId: task.id });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── PUT /api/tasks/:id/move ──────────────────────────────────────────────────

exports.moveTask = async (req, res) => {
  try {
    const { targetColumnId, newPosition } = req.body;
    if (!targetColumnId || newPosition == null || !Number.isInteger(newPosition)) {
      return err(res, 400, 'targetColumnId (string) and newPosition (integer) are required', 'Bad Request');
    }

    const task           = req.task;
    const sourceColumnId = task.columnId;
    const oldPosition    = task.position;
    const isSameColumn   = sourceColumnId.toString() === targetColumnId;

    const targetColumn = await Column.findById(targetColumnId);
    if (!targetColumn) return err(res, 404, 'Target column not found', 'Not Found');

    if (targetColumn.boardId.toString() !== task.boardId.toString()) {
      return err(res, 400, 'Cannot move a task across boards', 'Bad Request');
    }

    if (isSameColumn && oldPosition === newPosition) {
      await task.populate('assignee', USER_SELECT);
      return res.json({ task });
    }

    if (isSameColumn) {
      if (newPosition > oldPosition) {
        await Task.updateMany(
          { columnId: sourceColumnId, position: { $gte: oldPosition + 1, $lte: newPosition }, deletedAt: null },
          { $inc: { position: -1 } }
        );
      } else {
        await Task.updateMany(
          { columnId: sourceColumnId, position: { $gte: newPosition, $lte: oldPosition - 1 }, deletedAt: null },
          { $inc: { position: 1 } }
        );
      }
    } else {
      await Task.updateMany(
        { columnId: sourceColumnId, position: { $gt: oldPosition }, deletedAt: null },
        { $inc: { position: -1 } }
      );
      await Task.updateMany(
        { columnId: targetColumnId, position: { $gte: newPosition }, deletedAt: null },
        { $inc: { position: 1 } }
      );
      task.columnId = targetColumnId;
    }

    task.position = newPosition;
    await task.save();

    // Log after successful save
    activityLogger.log(task.id, req.user.id, 'moved',
      { columnId: sourceColumnId.toString(), position: oldPosition },
      { columnId: task.columnId.toString(),  position: newPosition }
    );

    await task.populate('assignee', USER_SELECT);
    res.json({ task });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};
