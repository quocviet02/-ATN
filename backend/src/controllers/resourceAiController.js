const Groq = require('groq-sdk');
const { Task, User, UserSkill, Skill, TaskAssignment, WorkloadSnapshot, OrganizationMember, TimeOff } = require('../models');
const { getWeekLabel, getWeeksInRange, getWeekStart, calcBurnoutRisk } = require('../utils/workloadUtils');

const groq  = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

// POST /api/tasks/:taskId/ai/recommend-assignee
exports.recommendAssignee = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId).populate('boardId', 'projectId');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Get project members
    const { ProjectMember } = require('../models');
    const projectId = task.boardId?.projectId;
    const members   = await ProjectMember.find({ projectId }).populate('user', 'name email avatar workCapacity');

    if (!members.length) return res.json({ candidates: [] });

    const userIds = members.map(m => m.user?._id).filter(Boolean);

    // Get skills for all members
    const allUserSkills = await UserSkill.find({ userId: { $in: userIds } })
      .populate('skillId', 'name category');

    // Get workload for current week
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd   = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);

    const weeklyLoad = {};
    const taskCounts = {};
    for (const uid of userIds) {
      const uidStr = uid.toString();
      const tasks = await Task.find({ assignee: uid, deletedAt: null }).select('estimatedHours startDate dueDate');
      let thisWeekHours = 0;
      tasks.forEach(t => {
        if (!t.estimatedHours || !t.dueDate) return;
        const wks = getWeeksInRange(t.startDate || t.dueDate, t.dueDate);
        const hrs = t.estimatedHours / Math.max(wks.length, 1);
        if (wks.some(w => w.weekLabel === getWeekLabel(now))) thisWeekHours += hrs;
      });
      const completedTasks = await Task.countDocuments({ assignee: uid, deletedAt: null });
      weeklyLoad[uidStr]  = thisWeekHours;
      taskCounts[uidStr]  = completedTasks;
    }

    // Check time off
    const timeOffs = await TimeOff.find({
      userId: { $in: userIds },
      status: 'approved',
      startDate: { $lte: weekEnd },
      endDate:   { $gte: weekStart },
    }).select('userId totalHours');

    const timeOffMap = {};
    timeOffs.forEach(t => {
      const uid = t.userId.toString();
      timeOffMap[uid] = (timeOffMap[uid] || 0) + t.totalHours;
    });

    // Build context for AI
    const memberContext = members.filter(m => m.user).map(m => {
      const uid = m.user._id.toString();
      const userSkills = allUserSkills.filter(us => us.userId.toString() === uid);
      const capacity = m.user.workCapacity?.hoursPerWeek || 40;
      const util = capacity > 0 ? Math.round((weeklyLoad[uid] || 0) / capacity * 100) : 0;
      return {
        userId: uid,
        name: m.user.name,
        skills: userSkills.map(us => ({ name: us.skillId?.name, level: us.level })),
        workloadPercent: util,
        tasksCompleted: taskCounts[uid] || 0,
        hoursOnLeave: timeOffMap[uid] || 0,
        availableHours: Math.max(0, capacity - (weeklyLoad[uid] || 0) - (timeOffMap[uid] || 0)),
      };
    });

    const prompt = `You are a smart project manager AI. Recommend the best assignees for this task.

Task Title: "${task.title}"
Task Description: "${task.description || 'No description'}"
Estimated Hours: ${task.estimatedHours || 'Unknown'}
Priority: ${task.priority}

Team members:
${JSON.stringify(memberContext, null, 2)}

Analyze and return TOP 3 candidates as JSON:
{
  "candidates": [
    {
      "userId": "<string>",
      "matchScore": <0-100>,
      "reasons": ["<reason 1>", "<reason 2>", "<reason 3>"],
      "concerns": ["<concern if any>"],
      "recommendation": "<short recommendation>"
    }
  ],
  "taskSkillsDetected": ["<skill name>", ...]
}
Only output valid JSON.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      temperature: 0.3,
      max_tokens: 1000,
    });

    const text      = completion.choices[0]?.message?.content?.trim() || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const aiResult  = jsonMatch ? JSON.parse(jsonMatch[0]) : { candidates: [], taskSkillsDetected: [] };

    // Enrich with user details
    const enriched = (aiResult.candidates || []).map(c => {
      const member = members.find(m => m.user?._id.toString() === c.userId);
      const uid    = c.userId;
      const capacity = member?.user?.workCapacity?.hoursPerWeek || 40;
      return {
        ...c,
        name:            member?.user?.name || 'Unknown',
        avatar:          member?.user?.avatar || null,
        currentWorkload: weeklyLoad[uid] || 0,
        utilization:     capacity > 0 ? Math.round(((weeklyLoad[uid] || 0) / capacity) * 100) : 0,
        availableHours:  Math.max(0, capacity - (weeklyLoad[uid] || 0)),
        skills:          allUserSkills.filter(us => us.userId.toString() === uid).map(us => ({
          name: us.skillId?.name, level: us.level,
        })),
      };
    });

    res.json({ candidates: enriched, taskSkillsDetected: aiResult.taskSkillsDetected || [] });
  } catch (err) {
    console.error('AI recommend-assignee error:', err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/projects/:projectId/ai/rebalance
exports.rebalanceWorkload = async (req, res) => {
  try {
    const { ProjectMember } = require('../models');
    const members = await ProjectMember.find({ projectId: req.params.projectId })
      .populate('user', 'name email avatar workCapacity');

    const now = new Date();
    const weekLabel = getWeekLabel(now);

    const userLoads = await Promise.all(members.filter(m => m.user).map(async m => {
      const u = m.user;
      const capacity = u.workCapacity?.hoursPerWeek || 40;
      const tasks = await Task.find({
        assignee: u._id, deletedAt: null, dueDate: { $gte: now },
      }).select('_id title estimatedHours dueDate startDate');

      let totalHours = 0;
      tasks.forEach(t => {
        const wks = getWeeksInRange(t.startDate || t.dueDate, t.dueDate).filter(w => w.weekLabel >= weekLabel);
        totalHours += t.estimatedHours ? t.estimatedHours / Math.max(wks.length, 1) : 0;
      });

      return {
        userId: u._id.toString(),
        name: u.name,
        avatar: u.avatar,
        capacity,
        allocatedHours: Math.round(totalHours),
        utilization: Math.round((totalHours / capacity) * 100),
        tasks: tasks.map(t => ({ id: t._id, title: t.title, hours: t.estimatedHours || 0 })),
      };
    }));

    const overloaded   = userLoads.filter(u => u.utilization > 100);
    const underloaded  = userLoads.filter(u => u.utilization < 70);

    if (!overloaded.length) {
      return res.json({ suggestions: [], message: 'No rebalancing needed — team workload is balanced.' });
    }

    const prompt = `You are a project manager AI. Suggest task reassignments to balance workload.

Current workload:
${JSON.stringify(userLoads.map(u => ({ name: u.name, utilization: u.utilization + '%', tasks: u.tasks.map(t => t.title) })), null, 2)}

Overloaded members (>100%): ${overloaded.map(u => u.name).join(', ')}
Available members (<70%):   ${underloaded.map(u => u.name).join(', ')}

Suggest up to 5 task reassignments. Return JSON:
{
  "suggestions": [
    {
      "taskTitle": "<task name>",
      "fromUser":  "<name>",
      "toUser":    "<name>",
      "reason":    "<short reason>"
    }
  ],
  "summary": "<overall rebalancing strategy>"
}
Only output valid JSON.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL, temperature: 0.3, max_tokens: 800,
    });

    const text      = completion.choices[0]?.message?.content?.trim() || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result    = jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestions: [], summary: '' };

    res.json({ ...result, currentLoads: userLoads });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/organizations/:orgId/ai/burnout-prediction
exports.burnoutPrediction = async (req, res) => {
  try {
    const orgId   = req.organization._id;
    const members = await OrganizationMember.find({ organizationId: orgId, status: { $ne: 'suspended' } })
      .populate('userId', 'name email avatar workCapacity');

    const now = new Date();
    const fourWeeksAgo = new Date(now); fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const memberData = await Promise.all(members.filter(m => m.userId).map(async m => {
      const u = m.userId;
      const snapshots = await WorkloadSnapshot.find({ userId: u._id, weekStart: { $gte: fourWeeksAgo } }).sort({ weekStart: -1 }).limit(4);
      const avgUtil = snapshots.length ? Math.round(snapshots.reduce((s, snap) => s + snap.utilization, 0) / snapshots.length) : 0;
      const overloadedWeeks = snapshots.filter(s => s.isOverloaded).length;
      const risk = calcBurnoutRisk(avgUtil, overloadedWeeks);
      return { user: u, avgUtilization: avgUtil, overloadedWeeks, snapshots: snapshots.length, burnoutRisk: risk };
    }));

    const atRisk = memberData.filter(m => ['medium','high','critical'].includes(m.burnoutRisk));

    if (!atRisk.length) {
      return res.json({ atRisk: [], message: 'No burnout risks detected.', analysedUsers: memberData.length });
    }

    const prompt = `You are an HR wellbeing AI. Analyze burnout risk for these team members:

${JSON.stringify(atRisk.map(m => ({
  name: m.user.name,
  avgUtilization: m.avgUtilization + '%',
  overloadedWeeks: m.overloadedWeeks + '/4',
  riskLevel: m.burnoutRisk,
})), null, 2)}

Provide detailed analysis. Return JSON:
{
  "userAnalyses": [
    {
      "name": "<name>",
      "riskLevel": "<low|medium|high|critical>",
      "indicators": ["<indicator 1>", ...],
      "recommendations": ["<rec 1>", ...],
      "urgency": "<immediate|soon|monitor>"
    }
  ],
  "teamHealthSummary": "<overall team health assessment>",
  "organizationalRecommendations": ["<org-level action 1>", ...]
}
Only output valid JSON.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL, temperature: 0.3, max_tokens: 1200,
    });

    const text      = completion.choices[0]?.message?.content?.trim() || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const aiResult  = jsonMatch ? JSON.parse(jsonMatch[0]) : { userAnalyses: [], teamHealthSummary: '', organizationalRecommendations: [] };

    res.json({ atRisk, aiAnalysis: aiResult, analysedUsers: memberData.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
