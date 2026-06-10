const { Project, ProjectMember, Release, Task, Column, ActivityLog } = require('../models');
const notifService   = require('../services/notificationService');
const activityLogger = require('../utils/activityLogger');

const USER_SELECT = 'id name email avatar';

function err(res, status, message, error) {
  return res.status(status).json({ statusCode: status, message, error });
}

async function getRole(userId, projectId) {
  const m = await ProjectMember.findOne({ user: userId, projectId });
  return m?.role || null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function suggestNextVersion(current, type) {
  const clean = current.replace(/^v/, '');
  const parts = clean.split('.');
  let major = parseInt(parts[0]) || 1;
  let minor = parseInt(parts[1]) || 0;
  let patch = parseInt(parts[2]) || 0;

  switch (type) {
    case 'major':  return `v${major + 1}.0.0`;
    case 'minor':  return `v${major}.${minor + 1}.0`;
    case 'patch':  return `v${major}.${minor}.${patch + 1}`;
    case 'hotfix': return `v${major}.${minor}.${patch}-hotfix.1`;
    default:       return `v${major}.${minor}.${patch + 1}`;
  }
}

async function buildTaskStats(boardIds) {
  const now = new Date();
  const total      = await Task.countDocuments({ boardId: { $in: boardIds }, deletedAt: null });
  const inProgress = await Task.countDocuments({ boardId: { $in: boardIds }, deletedAt: null });
  const overdue    = await Task.countDocuments({ boardId: { $in: boardIds }, deletedAt: null, dueDate: { $lt: now, $ne: null } });

  // "completed" = tasks in last column (approximation: tasks with progress 100)
  const completed  = await Task.countDocuments({ boardId: { $in: boardIds }, deletedAt: null, progress: 100 });

  return { total, completed, inProgress: inProgress - completed, overdue };
}

// ─── GET /api/releases/overview ──────────────────────────────────────────────

exports.getOverview = async (req, res) => {
  try {
    const { status, role: roleFilter, sortBy = 'recent' } = req.query;

    let memberFilter = { user: req.user._id };
    if (roleFilter) memberFilter.role = roleFilter;

    const memberships = await ProjectMember.find(memberFilter)
      .populate('projectId')
      .sort({ lastAccessedAt: -1 });

    const valid = memberships.filter(m => m.projectId && !m.projectId.deletedAt);

    const projectIds = valid.map(m => m.projectId._id);
    const memberCounts = await ProjectMember.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: '$projectId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    memberCounts.forEach(c => { countMap[c._id.toString()] = c.count; });

    // Latest release per project
    const latestReleases = await Release.aggregate([
      { $match: { projectId: { $in: projectIds }, deletedAt: null } },
      { $sort: { releaseDate: -1 } },
      { $group: { _id: '$projectId', version: { $first: '$version' }, releaseDate: { $first: '$releaseDate' } } },
    ]);
    const latestReleaseMap = {};
    latestReleases.forEach(r => { latestReleaseMap[r._id.toString()] = r; });

    // Last activity (latest ActivityLog per project via Task→Board→Project)
    const lastActivityMap = {};
    const boardsByProject = {};
    const { Board } = require('../models');
    const boards = await Board.find({ projectId: { $in: projectIds }, deletedAt: null });
    boards.forEach(b => {
      const pid = b.projectId.toString();
      if (!boardsByProject[pid]) boardsByProject[pid] = [];
      boardsByProject[pid].push(b._id);
    });

    const allBoardIds = boards.map(b => b._id);
    const allTasks    = await Task.find({ boardId: { $in: allBoardIds }, deletedAt: null }).select('boardId updatedAt');
    allTasks.forEach(t => {
      const board = boards.find(b => b._id.equals(t.boardId));
      if (!board) return;
      const pid = board.projectId.toString();
      const cur = lastActivityMap[pid];
      if (!cur || new Date(t.updatedAt) > new Date(cur)) {
        lastActivityMap[pid] = t.updatedAt;
      }
    });

    let projects = await Promise.all(valid.map(async (m) => {
      const p   = m.projectId;
      const pid = p._id.toString();
      const bIds = boardsByProject[pid] || [];
      const taskStats = bIds.length ? await buildTaskStats(bIds) : { total: 0, completed: 0, inProgress: 0, overdue: 0 };

      return {
        id:          p.id,
        name:        p.name,
        description: p.description || '',
        status:      p.status || 'in_development',
        version:     p.version || '1.0.0',
        progress:    p.progress || 0,
        releaseDate: p.releaseDate || null,
        startDate:   p.startDate  || null,
        endDate:     p.endDate    || null,
        techStack:   p.techStack  || [],
        repository:  p.repository || '',
        demoUrl:     p.demoUrl    || '',
        role:        m.role,
        memberCount: countMap[pid] || 1,
        taskStats,
        lastActivity:    lastActivityMap[pid]  || p.updatedAt,
        latestRelease:   latestReleaseMap[pid] || null,
      };
    }));

    // Filter by status
    if (status) projects = projects.filter(p => p.status === status);

    // Sort
    if (sortBy === 'progress') projects.sort((a, b) => b.progress - a.progress);
    else if (sortBy === 'name') projects.sort((a, b) => a.name.localeCompare(b.name));
    // default: 'recent' — already sorted by lastAccessedAt

    // Summary
    const byStatus = {};
    const byRole   = { owner: 0, admin: 0, member: 0 };
    for (const p of projects) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      if (byRole[p.role] !== undefined) byRole[p.role]++;
    }

    const totalReleases = await Release.countDocuments({ projectId: { $in: projectIds }, deletedAt: null });

    res.json({
      summary: { total: projects.length, byStatus, byRole, totalReleases },
      projects,
    });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/releases/timeline ──────────────────────────────────────────────

exports.getTimeline = async (req, res) => {
  try {
    const memberships = await ProjectMember.find({ user: req.user._id }, 'projectId');
    const projectIds  = memberships.map(m => m.projectId);

    const releases = await Release.find({ projectId: { $in: projectIds } })
      .populate('projectId', 'name status')
      .populate('createdBy', USER_SELECT)
      .sort({ releaseDate: -1 })
      .limit(100);

    res.json({ releases });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/releases/statistics ────────────────────────────────────────────

exports.getStatistics = async (req, res) => {
  try {
    const memberships = await ProjectMember.find({ user: req.user._id }, 'projectId');
    const projectIds  = memberships.map(m => m.projectId);

    const now        = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [releasedThisYear, totalReleases, byMonth, topProject] = await Promise.all([
      Release.countDocuments({ projectId: { $in: projectIds }, releaseDate: { $gte: startOfYear } }),
      Release.countDocuments({ projectId: { $in: projectIds } }),
      Release.aggregate([
        { $match: { projectId: { $in: projectIds }, releaseDate: { $gte: startOfYear } } },
        { $group: { _id: { $month: '$releaseDate' }, count: { $sum: 1 } } },
        { $sort: { '_id': 1 } },
      ]),
      Release.aggregate([
        { $match: { projectId: { $in: projectIds } } },
        { $group: { _id: '$projectId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
    ]);

    // Monthly release data for heatmap (last 12 months)
    const releasesByDay = await Release.aggregate([
      {
        $match: {
          projectId:   { $in: projectIds },
          releaseDate: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()) },
        },
      },
      {
        $group: {
          _id:   { $dateToString: { format: '%Y-%m-%d', date: '$releaseDate' } },
          count: { $sum: 1 },
        },
      },
    ]);

    // Top project name
    let topProjectName = null;
    if (topProject.length) {
      const proj = await Project.findById(topProject[0]._id).select('name');
      topProjectName = proj?.name || null;
    }

    // Releases this month vs last month
    const [thisMonth, lastMonth] = await Promise.all([
      Release.countDocuments({ projectId: { $in: projectIds }, releaseDate: { $gte: startOfThisMonth } }),
      Release.countDocuments({ projectId: { $in: projectIds }, releaseDate: { $gte: startOfLastMonth, $lt: startOfThisMonth } }),
    ]);

    res.json({
      releasedThisYear,
      totalReleases,
      topProject: topProjectName,
      topProjectCount: topProject[0]?.count || 0,
      byMonth,
      releasesByDay,
      thisMonth,
      lastMonth,
      monthGrowth: lastMonth ? Math.round((thisMonth - lastMonth) / lastMonth * 100) : 0,
    });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/projects/:id/releases ──────────────────────────────────────────

exports.getProjectReleases = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [releases, total] = await Promise.all([
      Release.find({ projectId: req.params.id })
        .populate('createdBy', USER_SELECT)
        .populate('tasks', 'title')
        .sort({ releaseDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Release.countDocuments({ projectId: req.params.id }),
    ]);

    res.json({ releases, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/projects/:id/releases ─────────────────────────────────────────

exports.createRelease = async (req, res) => {
  try {
    const role = await getRole(req.user._id, req.params.id);
    if (!['owner', 'admin'].includes(role)) {
      return err(res, 403, 'Chỉ Owner/Admin mới có thể tạo release', 'Forbidden');
    }

    const { version, releaseDate, releaseNotes = '', type = 'minor', tasks = [] } = req.body;
    if (!version?.trim()) return err(res, 400, 'version là bắt buộc', 'Bad Request');
    if (!releaseDate)      return err(res, 400, 'releaseDate là bắt buộc', 'Bad Request');

    const project = await Project.findById(req.params.id);
    if (!project) return err(res, 404, 'Project not found', 'Not Found');

    const release = await Release.create({
      projectId:    project._id,
      version:      version.trim(),
      releaseDate:  new Date(releaseDate),
      releaseNotes,
      type,
      status:       'released',
      createdBy:    req.user._id,
      tasks,
    });

    // Update project version
    project.version = version.trim();
    await project.save();

    await release.populate('createdBy', USER_SELECT);

    // Notify all members
    const members = await ProjectMember.find({ projectId: project._id });
    for (const m of members) {
      if (m.user.toString() !== req.user.id) {
        notifService.create({
          recipient: m.user,
          type:      'task_updated',
          title:     `Release ${version} mới`,
          body:      `Dự án "${project.name}" vừa phát hành phiên bản ${version}`,
          link:      `/project/releases/${project.id}`,
          meta:      { releaseId: release.id },
        });
      }
    }

    activityLogger.log(null, req.user.id, 'created', null, {
      type: 'release', version, projectId: project.id,
    });

    res.status(201).json({ release });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── PUT /api/releases/:id ────────────────────────────────────────────────────

exports.updateRelease = async (req, res) => {
  try {
    const release = await Release.findById(req.params.id);
    if (!release) return err(res, 404, 'Release not found', 'Not Found');

    const role = await getRole(req.user._id, release.projectId);
    if (!['owner', 'admin'].includes(role)) {
      return err(res, 403, 'Chỉ Owner/Admin mới có thể sửa release', 'Forbidden');
    }

    const { releaseNotes, status } = req.body;
    if (releaseNotes !== undefined) release.releaseNotes = releaseNotes;
    if (status       !== undefined) release.status       = status;
    await release.save();

    res.json({ release });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── POST /api/projects/:id/status ───────────────────────────────────────────

exports.changeProjectStatus = async (req, res) => {
  try {
    const role = await getRole(req.user._id, req.params.id);
    if (role !== 'owner') return err(res, 403, 'Chỉ Owner mới có thể đổi trạng thái', 'Forbidden');

    const { status, note = '' } = req.body;
    const VALID = ['planning','in_development','testing','released','maintenance','paused','cancelled'];
    if (!VALID.includes(status)) return err(res, 400, 'status không hợp lệ', 'Bad Request');

    const project = await Project.findById(req.params.id);
    if (!project) return err(res, 404, 'Project not found', 'Not Found');

    const oldStatus = project.status;
    project.status  = status;
    if (status === 'released' && !project.releaseDate) project.releaseDate = new Date();
    await project.save();

    activityLogger.log(null, req.user.id, 'updated', { status: oldStatus }, { status, note });

    const members = await ProjectMember.find({ projectId: project._id });
    for (const m of members) {
      if (m.user.toString() !== req.user.id) {
        notifService.create({
          recipient: m.user,
          type:      'task_updated',
          title:     'Trạng thái dự án thay đổi',
          body:      `Dự án "${project.name}" đổi trạng thái sang "${status}"${note ? ': ' + note : ''}`,
          link:      '/project/releases',
          meta:      { projectId: project.id },
        });
      }
    }

    res.json({ project });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── GET /api/projects/:id/suggest-version ───────────────────────────────────

exports.suggestVersion = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).select('version');
    if (!project) return err(res, 404, 'Not found', 'Not Found');
    const { type = 'minor' } = req.query;
    res.json({ suggested: suggestNextVersion(project.version || '1.0.0', type) });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/projects/:id/done-tasks ────────────────────────────────────────
// Tasks in the last column (Done) not yet in any release

exports.getDoneTasks = async (req, res) => {
  try {
    const { Board, Column } = require('../models');
    const board   = await Board.findOne({ projectId: req.params.id, deletedAt: null });
    if (!board) return res.json({ tasks: [] });

    const columns  = await Column.find({ boardId: board._id, deletedAt: null }).sort({ position: 1 });
    if (!columns.length) return res.json({ tasks: [] });

    const lastCol  = columns[columns.length - 1];
    const allTasks = await Task.find({ columnId: lastCol._id, deletedAt: null }).select('id title');

    // Exclude tasks already in a release
    const released = await Release.find({ projectId: req.params.id }).select('tasks');
    const releasedIds = new Set(released.flatMap(r => r.tasks.map(t => t.toString())));
    const doneTasks = allTasks.filter(t => !releasedIds.has(t._id.toString()));

    res.json({ tasks: doneTasks });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};
