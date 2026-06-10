const { Task, Board, Project, ProjectMember, Column } = require('../models');
const notifService   = require('../services/notificationService');
const ioInstance     = require('../utils/ioInstance');
const activityLogger = require('../utils/activityLogger');

const USER_SELECT = 'id name email avatar';

function err(res, status, message, error) {
  return res.status(status).json({ statusCode: status, message, error });
}

async function getBoardForProject(projectId) {
  return Board.findOne({ projectId, deletedAt: null });
}

async function checkAdminAccess(userId, projectIds) {
  const memberships = await ProjectMember.find({
    user:      userId,
    projectId: { $in: projectIds },
    role:      { $in: ['owner', 'admin'] },
  });
  const accessible = new Set(memberships.map(m => m.projectId.toString()));
  return projectIds.every(id => accessible.has(id.toString()));
}

function effectiveStartDate(task) {
  if (task.startDate) return task.startDate;
  if (task.dueDate) {
    const d = new Date(task.dueDate);
    d.setDate(d.getDate() - 1);
    return d;
  }
  return null;
}

function mapTaskForTimeline(task, boardMap, columnMap, boardColumnPositions) {
  const board    = boardMap[task.boardId.toString()];
  const boardCols = boardColumnPositions[task.boardId.toString()] || [];
  const colIdx   = boardCols.findIndex(c => c._id.toString() === task.columnId.toString());
  const isDone   = colIdx === boardCols.length - 1 && boardCols.length > 0;
  const col      = columnMap[task.columnId.toString()];
  const start    = effectiveStartDate(task);

  return {
    id:             task.id,
    title:          task.title,
    projectId:      board?.projectId?.id || board?.projectId?.toString() || '',
    projectName:    board?.projectId?.name || '',
    assignee:       task.assignee
      ? { id: task.assignee.id, name: task.assignee.name, avatar: task.assignee.avatar || '' }
      : null,
    startDate:      start ? start.toISOString() : null,
    dueDate:        task.dueDate ? task.dueDate.toISOString() : null,
    priority:       task.priority,
    status:         col?.name || '',
    progress:       task.progress || 0,
    dependencies:   (task.dependencies || []).map(d => d.toString()),
    estimatedHours: task.estimatedHours,
    actualHours:    task.actualHours,
    isDone,
  };
}

// ─── GET /api/timeline/projects ──────────────────────────────────────────────

exports.getTimelineProjects = async (req, res) => {
  try {
    const memberships = await ProjectMember.find({
      user: req.user._id,
      role: { $in: ['owner', 'admin'] },
    }).populate('projectId', 'name description owner createdAt');

    const projects = await Promise.all(memberships.map(async (m) => {
      if (!m.projectId) return null;
      const proj  = m.projectId;
      const board = await getBoardForProject(proj._id);

      if (!board) {
        return { id: proj.id, name: proj.name, ownerId: proj.owner, role: m.role, taskCount: 0, minDate: null, maxDate: null };
      }

      const [stats] = await Task.aggregate([
        { $match: { boardId: board._id, deletedAt: null } },
        { $group: {
          _id:     null,
          count:   { $sum: 1 },
          minDate: { $min: { $ifNull: ['$startDate', '$dueDate'] } },
          maxDate: { $max: '$dueDate' },
        }},
      ]);

      return {
        id:        proj.id,
        name:      proj.name,
        ownerId:   proj.owner,
        role:      m.role,
        taskCount: stats?.count || 0,
        minDate:   stats?.minDate || null,
        maxDate:   stats?.maxDate || null,
        startDate: proj.startDate || null,
        dueDate:   proj.dueDate   || null,
      };
    }));

    res.json({ projects: projects.filter(Boolean) });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/timeline/tasks ──────────────────────────────────────────────────

exports.getTimelineTasks = async (req, res) => {
  try {
    let { projectIds, startDate, endDate, assigneeIds, priority } = req.query;

    if (!projectIds) return err(res, 400, 'projectIds is required', 'Bad Request');
    if (typeof projectIds === 'string') projectIds = [projectIds];

    const ok = await checkAdminAccess(req.user._id, projectIds);
    if (!ok) return err(res, 403, 'Bạn phải là Owner/Admin của tất cả dự án yêu cầu', 'Forbidden');

    const boards = await Board.find({ projectId: { $in: projectIds }, deletedAt: null })
      .populate('projectId', 'name');

    const boardIds  = boards.map(b => b._id);
    const boardMap  = {};
    boards.forEach(b => { boardMap[b._id.toString()] = b; });

    const columns = await Column.find({ boardId: { $in: boardIds }, deletedAt: null }).sort({ position: 1 });
    const columnMap            = {};
    const boardColumnPositions = {};
    columns.forEach(col => {
      columnMap[col._id.toString()] = col;
      const bid = col.boardId.toString();
      if (!boardColumnPositions[bid]) boardColumnPositions[bid] = [];
      boardColumnPositions[bid].push(col);
    });

    const filter = { boardId: { $in: boardIds } };
    if (assigneeIds) {
      const ids = typeof assigneeIds === 'string' ? [assigneeIds] : assigneeIds;
      filter.assignee = { $in: ids };
    }
    if (priority) {
      filter.priority = typeof priority === 'string' ? priority : { $in: priority };
    }
    if (startDate || endDate) {
      const range = {};
      if (startDate) range.$gte = new Date(startDate);
      if (endDate)   range.$lte = new Date(endDate);
      filter.$or = [{ dueDate: range }, { startDate: range }];
    }

    const tasks = await Task.find(filter)
      .populate('assignee', USER_SELECT)
      .sort({ dueDate: 1, position: 1 });

    res.json({ tasks: tasks.map(t => mapTaskForTimeline(t, boardMap, columnMap, boardColumnPositions)) });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── PUT /api/timeline/tasks/:id/reschedule ───────────────────────────────────

exports.rescheduleTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, dueDate } = req.body;

    const task = await Task.findById(id).populate('assignee', USER_SELECT);
    if (!task) return err(res, 404, 'Task not found', 'Not Found');

    const board = await Board.findById(task.boardId).populate('projectId', 'name');
    if (!board) return err(res, 404, 'Board not found', 'Not Found');

    const membership = await ProjectMember.findOne({ projectId: board.projectId._id, user: req.user._id });
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return err(res, 403, 'Chỉ Owner/Admin mới có thể lên lịch lại task', 'Forbidden');
    }

    const oldStart = task.startDate;
    const oldDue   = task.dueDate;

    if (startDate !== undefined) task.startDate = startDate ? new Date(startDate) : null;
    if (dueDate   !== undefined) task.dueDate   = dueDate   ? new Date(dueDate)   : null;

    await task.save();

    activityLogger.log(task.id, req.user.id, 'rescheduled',
      { startDate: oldStart, dueDate: oldDue },
      { startDate: task.startDate, dueDate: task.dueDate }
    );

    if (task.assignee) {
      const assigneeId = (task.assignee._id || task.assignee).toString();
      if (assigneeId !== req.user.id) {
        notifService.create({
          recipient: task.assignee._id || task.assignee,
          type:      'task_updated',
          title:     'Task được lên lịch lại',
          body:      `"${task.title}" đã được cập nhật thời gian bởi ${req.user.name}`,
          link:      '/project/board',
          meta:      { taskId: task.id },
        });
      }
    }

    const io = ioInstance.getIO();
    if (io && board?.projectId) {
      const members = await ProjectMember.find({ projectId: board.projectId._id });
      for (const member of members) {
        io.to(`user_${member.user.toString()}`).emit('task_rescheduled', {
          taskId:    task.id,
          startDate: task.startDate,
          dueDate:   task.dueDate,
          updatedBy: { id: req.user.id, name: req.user.name },
        });
      }
    }

    res.json({ task });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/timeline/conflicts ─────────────────────────────────────────────

exports.getConflicts = async (req, res) => {
  try {
    let { projectIds, startDate, endDate } = req.query;
    if (!projectIds) return err(res, 400, 'projectIds is required', 'Bad Request');
    if (typeof projectIds === 'string') projectIds = [projectIds];

    const ok = await checkAdminAccess(req.user._id, projectIds);
    if (!ok) return err(res, 403, 'Forbidden', 'Forbidden');

    const boards = await Board.find({ projectId: { $in: projectIds }, deletedAt: null })
      .populate('projectId', 'name');
    const boardIds  = boards.map(b => b._id);
    const boardMap  = {};
    boards.forEach(b => { boardMap[b._id.toString()] = b; });

    const columns = await Column.find({ boardId: { $in: boardIds }, deletedAt: null }).sort({ position: 1 });
    const columnMap            = {};
    const boardColumnPositions = {};
    columns.forEach(col => {
      columnMap[col._id.toString()] = col;
      const bid = col.boardId.toString();
      if (!boardColumnPositions[bid]) boardColumnPositions[bid] = [];
      boardColumnPositions[bid].push(col);
    });

    const filter = { boardId: { $in: boardIds }, dueDate: { $ne: null } };
    if (startDate) filter.dueDate.$gte = new Date(startDate);
    if (endDate)   filter.dueDate.$lte = new Date(endDate);

    const tasks = await Task.find(filter)
      .populate('assignee', USER_SELECT)
      .sort({ dueDate: 1 });

    const now = new Date();
    const mapped = tasks.map(t => mapTaskForTimeline(t, boardMap, columnMap, boardColumnPositions));

    // Overdue: dueDate < now and not done
    const overdue = mapped.filter(t => !t.isDone && t.dueDate && new Date(t.dueDate) < now);

    // Overlaps: same assignee, overlapping time range
    const byAssignee = {};
    for (const t of mapped) {
      if (!t.assignee) continue;
      const key = t.assignee.id;
      if (!byAssignee[key]) byAssignee[key] = [];
      byAssignee[key].push(t);
    }

    const overlaps = [];
    for (const [, aTasks] of Object.entries(byAssignee)) {
      if (aTasks.length < 2) continue;
      const overlappingIds = new Set();
      for (let i = 0; i < aTasks.length; i++) {
        for (let j = i + 1; j < aTasks.length; j++) {
          const t1 = aTasks[i], t2 = aTasks[j];
          if (!t1.startDate || !t1.dueDate || !t2.startDate || !t2.dueDate) continue;
          const s1 = new Date(t1.startDate), e1 = new Date(t1.dueDate);
          const s2 = new Date(t2.startDate), e2 = new Date(t2.dueDate);
          if (s1 <= e2 && s2 <= e1) { overlappingIds.add(t1.id); overlappingIds.add(t2.id); }
        }
      }
      if (overlappingIds.size > 0) {
        overlaps.push({
          assigneeId:   aTasks[0].assignee.id,
          assigneeName: aTasks[0].assignee.name,
          tasks:        aTasks.filter(t => overlappingIds.has(t.id)),
        });
      }
    }

    // Blocked: dependencies not done but startDate reached
    const taskById = {};
    mapped.forEach(t => { taskById[t.id] = t; });

    const blocked = [];
    for (const task of mapped) {
      if (!task.dependencies?.length) continue;
      if (!task.startDate || new Date(task.startDate) > now) continue;
      const incompleteDeps = task.dependencies.map(id => taskById[id]).filter(d => d && !d.isDone);
      if (incompleteDeps.length > 0) blocked.push({ task, blockedBy: incompleteDeps });
    }

    res.json({ overlaps, overdue, blocked });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/timeline/critical-path/:projectId ───────────────────────────────

exports.getCriticalPath = async (req, res) => {
  try {
    const { projectId } = req.params;

    const membership = await ProjectMember.findOne({ projectId, user: req.user._id });
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return err(res, 403, 'Forbidden', 'Forbidden');
    }

    const board = await getBoardForProject(projectId);
    if (!board) return res.json({ criticalPath: [], totalDays: 0 });

    const tasks = await Task.find({ boardId: board._id }).populate('assignee', USER_SELECT);

    const nodeMap = {};
    tasks.forEach(t => {
      nodeMap[t.id] = {
        id:           t.id,
        title:        t.title,
        duration:     t.estimatedHours ? Math.max(1, Math.ceil(t.estimatedHours / 8)) : 1,
        deps:         (t.dependencies || []).map(d => d.toString()),
        es: 0, ef: 0, ls: Infinity, lf: Infinity, slack: 0,
        assignee:     t.assignee ? { id: t.assignee.id, name: t.assignee.name, avatar: t.assignee.avatar || '' } : null,
        estimatedHours: t.estimatedHours,
      };
    });

    // Build adjacency & in-degree for topological sort
    const adjList  = {};
    const inDegree = {};
    Object.keys(nodeMap).forEach(id => { adjList[id] = []; inDegree[id] = 0; });

    Object.values(nodeMap).forEach(n => {
      n.deps.forEach(depId => {
        if (nodeMap[depId]) { adjList[depId].push(n.id); inDegree[n.id]++; }
      });
    });

    const queue = Object.keys(nodeMap).filter(id => inDegree[id] === 0);
    const order = [];
    while (queue.length) {
      const id = queue.shift();
      order.push(id);
      adjList[id].forEach(nid => { if (--inDegree[nid] === 0) queue.push(nid); });
    }

    // Forward pass
    for (const id of order) {
      const n  = nodeMap[id];
      n.es     = n.deps.reduce((max, d) => Math.max(max, nodeMap[d]?.ef || 0), 0);
      n.ef     = n.es + n.duration;
    }

    const projectDuration = Math.max(0, ...Object.values(nodeMap).map(n => n.ef));

    // Backward pass
    for (const id of [...order].reverse()) {
      const n  = nodeMap[id];
      const successorLS = adjList[id].map(sid => nodeMap[sid]?.ls ?? Infinity);
      n.lf     = successorLS.length ? Math.min(...successorLS) : projectDuration;
      n.ls     = n.lf - n.duration;
      n.slack  = n.ls - n.es;
    }

    const criticalPath = Object.values(nodeMap)
      .filter(n => n.slack === 0)
      .map(n => ({ ...n, deps: n.deps }));

    res.json({ criticalPath, totalDays: projectDuration });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/timeline/ai/resolve-conflict ───────────────────────────────────

exports.aiResolveConflict = async (req, res) => {
  try {
    const { conflictType, tasks } = req.body;
    if (!conflictType || !Array.isArray(tasks) || !tasks.length) {
      return err(res, 400, 'conflictType và tasks là bắt buộc', 'Bad Request');
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    if (!process.env.GEMINI_API_KEY) return err(res, 503, 'AI service not configured', 'Service Unavailable');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const taskList = tasks.map(t =>
      `- "${t.title}": ${t.startDate?.split('T')[0] || 'N/A'} → ${t.dueDate?.split('T')[0] || 'N/A'}, ` +
      `Priority: ${t.priority}, Assignee: ${t.assignee?.name || 'None'}`
    ).join('\n');

    const prompt = `Bạn là một AI quản lý dự án. Phân tích các task xung đột sau và đề xuất giải pháp bằng tiếng Việt.

Loại xung đột: ${conflictType === 'overlap' ? 'Trùng lịch' : conflictType === 'overdue' ? 'Quá hạn' : 'Bị block'}
Các task:
${taskList}

Hãy đề xuất 3 giải pháp cụ thể. Phản hồi PHẢI là JSON hợp lệ (không có text ngoài JSON):
{
  "suggestions": [
    {
      "title": "Tên giải pháp ngắn gọn",
      "description": "Mô tả chi tiết cách thực hiện",
      "action": null
    }
  ]
}`;

    const result  = await model.generateContent(prompt);
    const text    = result.response.text();
    const jsonStr = text.match(/\{[\s\S]*\}/)?.[0];

    let parsed;
    try {
      parsed = jsonStr ? JSON.parse(jsonStr) : null;
    } catch {
      parsed = null;
    }

    if (!parsed?.suggestions) {
      parsed = { suggestions: [{ title: 'Gợi ý từ AI', description: text, action: null }] };
    }

    res.json(parsed);
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};
