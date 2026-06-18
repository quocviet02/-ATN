const { User, Task, TaskAssignment, WorkloadSnapshot, TimeOff, OrganizationMember } = require('../models');
const { getWeeksInRange, getWeekStart, getWeekLabel, calcBurnoutRisk } = require('../utils/workloadUtils');

// GET /api/users/:userId/capacity
exports.getUserCapacity = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('name email avatar workCapacity');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user, capacity: user.workCapacity });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/users/:userId/capacity
exports.updateUserCapacity = async (req, res) => {
  try {
    const { hoursPerWeek, workingDays, timezone, startTime, endTime } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { 'workCapacity.hoursPerWeek': hoursPerWeek, 'workCapacity.workingDays': workingDays,
        'workCapacity.timezone': timezone, 'workCapacity.startTime': startTime, 'workCapacity.endTime': endTime },
      { new: true, runValidators: true }
    ).select('name email avatar workCapacity');
    res.json({ user, capacity: user.workCapacity });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/users/:userId/workload?startDate=&endDate=&weeks=
exports.getUserWorkload = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('name email avatar workCapacity');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const weeksBack = parseInt(req.query.weeks) || 8;
    const endDate   = req.query.endDate   ? new Date(req.query.endDate)   : new Date();
    const startDate = req.query.startDate ? new Date(req.query.startDate) : (() => {
      const d = new Date(endDate);
      d.setDate(d.getDate() - weeksBack * 7);
      return d;
    })();

    const weekSlots = getWeeksInRange(startDate, endDate);
    const capacityHours = user.workCapacity?.hoursPerWeek || 40;

    // Build week → hours map from TaskAssignments
    const assignments = await TaskAssignment.find({
      userId,
      $or: [
        { startDate: { $lte: endDate }, dueDate: { $gte: startDate } },
        { startDate: null, dueDate: { $gte: startDate, $lte: endDate } },
      ],
    }).populate({ path: 'taskId', select: 'title boardId', populate: { path: 'boardId', select: 'projectId' } });

    // Also get tasks directly from Task model (tasks with assignee but no TaskAssignment)
    const directTasks = await Task.find({
      assignee: userId,
      deletedAt: null,
      $or: [
        { startDate: { $lte: endDate }, dueDate: { $gte: startDate } },
        { dueDate: { $gte: startDate, $lte: endDate } },
      ],
    }).populate({ path: 'boardId', select: 'projectId', populate: { path: 'projectId', select: 'name' } });

    // Build weekly hours map
    const weekMap = {};
    weekSlots.forEach(w => {
      weekMap[w.weekLabel] = {
        ...w,
        capacityHours,
        allocatedHours: 0,
        projects: {},
      };
    });

    // Add hours from TaskAssignments
    assignments.forEach(a => {
      const wAlloc = a.weeklyAllocation ? Object.fromEntries(a.weeklyAllocation) : {};
      Object.entries(wAlloc).forEach(([wLabel, hrs]) => {
        if (weekMap[wLabel]) {
          weekMap[wLabel].allocatedHours += hrs;
          const projId = a.taskId?.boardId?.projectId?.toString() || 'unknown';
          weekMap[wLabel].projects[projId] = (weekMap[wLabel].projects[projId] || 0) + hrs;
        }
      });
    });

    // Add hours from direct task estimation (distribute evenly)
    const assignedTaskIds = new Set(assignments.map(a => a.taskId?._id?.toString()));
    directTasks.forEach(task => {
      if (assignedTaskIds.has(task._id.toString())) return; // already counted
      if (!task.estimatedHours) return;
      const tStart = task.startDate || task.dueDate;
      const tEnd   = task.dueDate;
      if (!tStart || !tEnd) return;
      const taskWeeks = getWeeksInRange(tStart, tEnd).filter(w => weekMap[w.weekLabel]);
      if (!taskWeeks.length) return;
      const hrsPerWeek = task.estimatedHours / taskWeeks.length;
      taskWeeks.forEach(w => {
        weekMap[w.weekLabel].allocatedHours += hrsPerWeek;
        const projName = task.boardId?.projectId?.name || 'Unknown';
        const projId   = task.boardId?.projectId?._id?.toString() || 'unknown';
        weekMap[w.weekLabel].projects[projId] = (weekMap[w.weekLabel].projects[projId] || 0) + hrsPerWeek;
      });
    });

    // Get time-off per week
    const timeOffs = await TimeOff.find({
      userId,
      status: 'approved',
      startDate: { $lte: endDate },
      endDate:   { $gte: startDate },
    });

    // Build final weeks array
    const Project = require('../models/Project');
    const projectIds = [...new Set(Object.values(weekMap).flatMap(w => Object.keys(w.projects)))];
    const projects = await Project.find({ _id: { $in: projectIds } }).select('name');
    const projNameMap = {};
    projects.forEach(p => { projNameMap[p._id.toString()] = p.name; });

    // Calculate consecutive overloaded weeks for burnout
    let consecutiveOverloaded = 0;

    const weeks = weekSlots.map(slot => {
      const w = weekMap[slot.weekLabel];
      const util = capacityHours > 0 ? Math.round((w.allocatedHours / capacityHours) * 100) : 0;
      if (util > 100) consecutiveOverloaded++;
      else consecutiveOverloaded = 0;
      const burnoutRisk = calcBurnoutRisk(util, consecutiveOverloaded);
      return {
        weekLabel:      slot.weekLabel,
        weekStart:      slot.weekStart,
        weekEnd:        slot.weekEnd,
        capacityHours,
        allocatedHours: Math.round(w.allocatedHours * 10) / 10,
        utilization:    util,
        isOverloaded:   util > 100,
        burnoutRisk,
        projects: Object.entries(w.projects).map(([id, hrs]) => ({
          projectId:   id,
          projectName: projNameMap[id] || 'Unknown',
          hours:       Math.round(hrs * 10) / 10,
        })),
      };
    });

    const currentWeek = weeks.find(w => w.weekLabel === getWeekLabel(new Date())) || weeks[weeks.length - 1];
    const avgUtil = weeks.length ? Math.round(weeks.reduce((s, w) => s + w.utilization, 0) / weeks.length) : 0;
    const overloadedWeeks = weeks.filter(w => w.isOverloaded).length;
    const overallBurnoutRisk = calcBurnoutRisk(currentWeek?.utilization || 0, overloadedWeeks);

    res.json({ user, capacity: user.workCapacity, weeks, currentWeek, avgUtilization: avgUtil, burnoutRisk: overallBurnoutRisk });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/organizations/:orgId/capacity-overview
exports.getOrgCapacityOverview = async (req, res) => {
  try {
    const orgId = req.organization._id;
    const members = await OrganizationMember.find({ organizationId: orgId, status: { $ne: 'suspended' } })
      .populate('userId', 'name email avatar workCapacity');

    const now        = new Date();
    const weekStart  = getWeekStart(now);
    const weekEnd    = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    const weekLabel  = getWeekLabel(now);

    const userWorkloads = await Promise.all(
      members.filter(m => m.userId).map(async m => {
        const u = m.userId;
        const capacity = u.workCapacity?.hoursPerWeek || 40;

        const tasks = await Task.find({
          assignee:  u._id,
          deletedAt: null,
          dueDate:   { $gte: weekStart, $lte: weekEnd },
        }).select('estimatedHours startDate dueDate');

        let allocHours = 0;
        tasks.forEach(t => {
          const taskWeeks = getWeeksInRange(t.startDate || t.dueDate, t.dueDate);
          const hrs = t.estimatedHours ? t.estimatedHours / Math.max(taskWeeks.length, 1) : 0;
          allocHours += hrs;
        });

        const util = capacity > 0 ? Math.round((allocHours / capacity) * 100) : 0;
        return {
          user: u,
          orgRole: m.orgRole,
          capacityHours: capacity,
          allocatedHours: Math.round(allocHours),
          utilization: util,
          isOverloaded: util > 100,
          burnoutRisk: calcBurnoutRisk(util),
          status: util > 120 ? 'critical' : util > 100 ? 'overloaded' : util > 80 ? 'near_capacity' : util < 30 ? 'underloaded' : 'healthy',
        };
      })
    );

    const overloaded    = userWorkloads.filter(u => u.utilization > 100).length;
    const nearCapacity  = userWorkloads.filter(u => u.utilization > 80 && u.utilization <= 100).length;
    const underloaded   = userWorkloads.filter(u => u.utilization < 30).length;
    const healthy       = userWorkloads.length - overloaded - nearCapacity - underloaded;
    const avgUtil       = userWorkloads.length ? Math.round(userWorkloads.reduce((s, u) => s + u.utilization, 0) / userWorkloads.length) : 0;
    const burnoutAtRisk = userWorkloads.filter(u => ['high','critical'].includes(u.burnoutRisk)).length;

    res.json({
      weekLabel,
      members:   userWorkloads.sort((a, b) => b.utilization - a.utilization),
      summary:   { total: userWorkloads.length, overloaded, nearCapacity, healthy, underloaded, avgUtilization: avgUtil, burnoutAtRisk },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/projects/:projectId/workload
exports.getProjectWorkload = async (req, res) => {
  try {
    const { ProjectMember } = require('../models');
    const members = await ProjectMember.find({ projectId: req.params.projectId })
      .populate('user', 'name email avatar workCapacity');

    const now       = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd   = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);

    const result = await Promise.all(
      members.filter(m => m.user).map(async m => {
        const u = m.user;
        const capacity = u.workCapacity?.hoursPerWeek || 40;
        const tasks = await Task.find({ assignee: u._id, deletedAt: null, dueDate: { $gte: weekStart, $lte: weekEnd } }).select('estimatedHours startDate dueDate');
        let hours = 0;
        tasks.forEach(t => {
          const wks = getWeeksInRange(t.startDate || t.dueDate, t.dueDate);
          hours += t.estimatedHours ? t.estimatedHours / Math.max(wks.length, 1) : 0;
        });
        const util = capacity > 0 ? Math.round((hours / capacity) * 100) : 0;
        return { user: u, role: m.role, capacityHours: capacity, allocatedHours: Math.round(hours), utilization: util, isOverloaded: util > 100 };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
