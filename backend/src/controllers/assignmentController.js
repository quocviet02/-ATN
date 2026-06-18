const { Task, TaskAssignment, User } = require('../models');
const { distributeHours, getWeeksInRange, getWeekLabel } = require('../utils/workloadUtils');

// GET /api/tasks/:taskId/assignments
exports.list = async (req, res) => {
  try {
    const assignments = await TaskAssignment.find({ taskId: req.params.taskId })
      .populate('userId', 'name email avatar workCapacity');
    res.json(assignments);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/tasks/:taskId/assignments
exports.create = async (req, res) => {
  try {
    const { userId, estimatedHours, startDate, dueDate } = req.body;
    const taskId = req.params.taskId;

    const user = await User.findById(userId).select('workCapacity name email avatar');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Calculate weekly allocation
    const weeklyAllocation = new Map(Object.entries(
      distributeHours(startDate || dueDate, dueDate, estimatedHours)
    ));

    // Check for overcapacity
    const warnings = [];
    const capacityPerWeek = user.workCapacity?.hoursPerWeek || 40;
    const currentTasks = await TaskAssignment.find({ userId });
    const currentAlloc = {};
    currentTasks.forEach(a => {
      if (a.weeklyAllocation) {
        for (const [wk, hrs] of a.weeklyAllocation) {
          currentAlloc[wk] = (currentAlloc[wk] || 0) + hrs;
        }
      }
    });
    for (const [wk, hrs] of weeklyAllocation) {
      const total = (currentAlloc[wk] || 0) + hrs;
      if (total > capacityPerWeek) {
        warnings.push({ week: wk, allocated: Math.round(total), capacity: capacityPerWeek });
      }
    }

    const assignment = await TaskAssignment.findOneAndUpdate(
      { taskId, userId },
      { taskId, userId, estimatedHours, startDate: startDate || null, dueDate: dueDate || null, weeklyAllocation },
      { upsert: true, new: true, runValidators: true }
    ).populate('userId', 'name email avatar workCapacity');

    // Also update the task's assignee field
    await Task.findByIdAndUpdate(taskId, { assignee: userId, estimatedHours, startDate: startDate || null, dueDate: dueDate || null });

    res.status(201).json({ assignment, warnings });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/assignments/:id
exports.update = async (req, res) => {
  try {
    const { estimatedHours, actualHours, startDate, dueDate, status } = req.body;
    const assignment = await TaskAssignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Not found' });

    if (estimatedHours !== undefined || startDate !== undefined || dueDate !== undefined) {
      const hrs   = estimatedHours ?? assignment.estimatedHours;
      const sDate = startDate ?? assignment.startDate;
      const eDate = dueDate   ?? assignment.dueDate;
      assignment.weeklyAllocation = new Map(Object.entries(distributeHours(sDate || eDate, eDate, hrs)));
      assignment.estimatedHours = hrs;
      if (startDate !== undefined) assignment.startDate = startDate;
      if (dueDate   !== undefined) assignment.dueDate   = dueDate;
    }
    if (actualHours !== undefined) assignment.actualHours = actualHours;
    if (status      !== undefined) assignment.status      = status;

    await assignment.save();
    res.json(await assignment.populate('userId', 'name email avatar'));
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/assignments/:id/log-time
exports.logTime = async (req, res) => {
  try {
    const { hours } = req.body;
    const assignment = await TaskAssignment.findByIdAndUpdate(
      req.params.id,
      { $inc: { actualHours: hours } },
      { new: true }
    ).populate('userId', 'name email avatar');
    if (!assignment) return res.status(404).json({ message: 'Not found' });

    // Also update task actualHours
    await Task.findByIdAndUpdate(assignment.taskId, { $inc: { actualHours: hours } });
    res.json(assignment);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
