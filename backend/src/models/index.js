// Mongoose models — associations handled via populate() in queries, not here.

const User               = require('./User');
const RefreshToken       = require('./RefreshToken');
const Project            = require('./Project');
const ProjectMember      = require('./ProjectMember');
const ProjectInvitation  = require('./ProjectInvitation');
const Board              = require('./Board');
const Column             = require('./Column');
const Task               = require('./Task');
const Comment            = require('./Comment');
const ActivityLog        = require('./ActivityLog');
const Notification       = require('./Notification');
const Workflow           = require('./Workflow');
const Release            = require('./Release');
const Organization       = require('./Organization');
const Department         = require('./Department');
const OrganizationMember = require('./OrganizationMember');
const Portfolio          = require('./Portfolio');
const Program            = require('./Program');
const ProjectDependency  = require('./ProjectDependency');
const Risk               = require('./Risk');
const Skill              = require('./Skill');
const UserSkill          = require('./UserSkill');
const TaskAssignment     = require('./TaskAssignment');
const TimeOff            = require('./TimeOff');
const WorkloadSnapshot   = require('./WorkloadSnapshot');

module.exports = {
  User, RefreshToken,
  Project, ProjectMember, ProjectInvitation,
  Board, Column, Task,
  Comment, ActivityLog,
  Notification, Workflow, Release,
  Organization, Department, OrganizationMember,
  Portfolio, Program, ProjectDependency, Risk,
  Skill, UserSkill, TaskAssignment, TimeOff, WorkloadSnapshot,
};
