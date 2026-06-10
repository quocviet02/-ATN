export interface WorkflowState {
  id: string;
  name: string;
  color: string;
  position: number;
  isInitial: boolean;
  isFinal: boolean;
  slaHours: number | null;
}

export interface AutoAction {
  type: 'send_notification' | 'assign_user' | 'send_email' | 'update_field';
  config: Record<string, any>;
}

export interface WorkflowTransition {
  id: string;
  name: string;
  fromStateId: string;
  toStateId: string;
  allowedRoles: ('owner' | 'admin' | 'member')[];
  allowedUsers: string[];
  requiredFields: string[];
  requireApproval: boolean;
  approvers: string[];
  approvalCount: number;
  autoActions: AutoAction[];
}

export interface JWorkflow {
  id: string;
  projectId: string;
  name: string;
  description: string;
  isDefault: boolean;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
}

export interface WorkflowStats {
  taskCount: number;
  byState: Record<string, number>;
  avgHoursByState: Record<string, number>;
}

export interface AvailableTransitionsResult {
  transitions: WorkflowTransition[];
  currentStateId: string | null;
  workflow: { states: WorkflowState[] };
}

export interface StateHistoryEntry {
  stateId: string;
  stateName: string;
  stateColor: string;
  enteredAt: string;
  exitedAt: string | null;
  durationHours: number | null;
}

export const WORKFLOW_TEMPLATES: Omit<JWorkflow, 'id' | 'projectId' | 'createdBy' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Basic (3 trạng thái)',
    description: 'Quy trình cơ bản: Cần làm → Đang làm → Hoàn thành',
    isDefault: false,
    states: [
      { id: 'tpl-1', name: 'Cần làm',   color: '#6b7280', position: 0, isInitial: true,  isFinal: false, slaHours: null },
      { id: 'tpl-2', name: 'Đang làm',  color: '#3b82f6', position: 1, isInitial: false, isFinal: false, slaHours: null },
      { id: 'tpl-3', name: 'Hoàn thành',color: '#10b981', position: 2, isInitial: false, isFinal: true,  slaHours: null },
    ],
    transitions: [
      { id: 'tpl-t1', name: 'Bắt đầu',   fromStateId: 'tpl-1', toStateId: 'tpl-2', allowedRoles: ['owner','admin','member'], allowedUsers: [], requiredFields: [], requireApproval: false, approvers: [], approvalCount: 1, autoActions: [] },
      { id: 'tpl-t2', name: 'Hoàn thành',fromStateId: 'tpl-2', toStateId: 'tpl-3', allowedRoles: ['owner','admin','member'], allowedUsers: [], requiredFields: [], requireApproval: false, approvers: [], approvalCount: 1, autoActions: [] },
      { id: 'tpl-t3', name: 'Hoàn tác',  fromStateId: 'tpl-2', toStateId: 'tpl-1', allowedRoles: ['owner','admin'],          allowedUsers: [], requiredFields: [], requireApproval: false, approvers: [], approvalCount: 1, autoActions: [] },
    ],
  },
  {
    name: 'Code Review (5 trạng thái)',
    description: 'Quy trình phát triển phần mềm có review code',
    isDefault: false,
    states: [
      { id: 'cr-1', name: 'Draft',              color: '#6b7280', position: 0, isInitial: true,  isFinal: false, slaHours: null },
      { id: 'cr-2', name: 'Code Review',        color: '#f59e0b', position: 1, isInitial: false, isFinal: false, slaHours: 24 },
      { id: 'cr-3', name: 'Changes Requested',  color: '#ef4444', position: 2, isInitial: false, isFinal: false, slaHours: 8  },
      { id: 'cr-4', name: 'Approved',           color: '#3b82f6', position: 3, isInitial: false, isFinal: false, slaHours: null },
      { id: 'cr-5', name: 'Done',               color: '#10b981', position: 4, isInitial: false, isFinal: true,  slaHours: null },
    ],
    transitions: [
      { id: 'cr-t1', name: 'Submit Review',      fromStateId: 'cr-1', toStateId: 'cr-2', allowedRoles: ['owner','admin','member'], allowedUsers: [], requiredFields: ['description'], requireApproval: false, approvers: [], approvalCount: 1, autoActions: [] },
      { id: 'cr-t2', name: 'Request Changes',    fromStateId: 'cr-2', toStateId: 'cr-3', allowedRoles: ['owner','admin'],          allowedUsers: [], requiredFields: [], requireApproval: false, approvers: [], approvalCount: 1, autoActions: [] },
      { id: 'cr-t3', name: 'Approve',            fromStateId: 'cr-2', toStateId: 'cr-4', allowedRoles: ['owner','admin'],          allowedUsers: [], requiredFields: [], requireApproval: false, approvers: [], approvalCount: 1, autoActions: [] },
      { id: 'cr-t4', name: 'Re-submit',          fromStateId: 'cr-3', toStateId: 'cr-2', allowedRoles: ['owner','admin','member'], allowedUsers: [], requiredFields: [], requireApproval: false, approvers: [], approvalCount: 1, autoActions: [] },
      { id: 'cr-t5', name: 'Merge',              fromStateId: 'cr-4', toStateId: 'cr-5', allowedRoles: ['owner','admin'],          allowedUsers: [], requiredFields: [], requireApproval: false, approvers: [], approvalCount: 1, autoActions: [] },
    ],
  },
  {
    name: 'Approval Flow (4 trạng thái)',
    description: 'Quy trình phê duyệt có approve',
    isDefault: false,
    states: [
      { id: 'af-1', name: 'Draft',     color: '#6b7280', position: 0, isInitial: true,  isFinal: false, slaHours: null },
      { id: 'af-2', name: 'Submitted', color: '#f59e0b', position: 1, isInitial: false, isFinal: false, slaHours: 48 },
      { id: 'af-3', name: 'Approved',  color: '#10b981', position: 2, isInitial: false, isFinal: false, slaHours: null },
      { id: 'af-4', name: 'Completed', color: '#3b82f6', position: 3, isInitial: false, isFinal: true,  slaHours: null },
      { id: 'af-5', name: 'Rejected',  color: '#ef4444', position: 4, isInitial: false, isFinal: false, slaHours: null },
    ],
    transitions: [
      { id: 'af-t1', name: 'Submit',   fromStateId: 'af-1', toStateId: 'af-2', allowedRoles: ['owner','admin','member'], allowedUsers: [], requiredFields: ['description','assignee'], requireApproval: false, approvers: [], approvalCount: 1, autoActions: [] },
      { id: 'af-t2', name: 'Approve',  fromStateId: 'af-2', toStateId: 'af-3', allowedRoles: ['owner'],                  allowedUsers: [], requiredFields: [], requireApproval: true,  approvers: [], approvalCount: 1, autoActions: [] },
      { id: 'af-t3', name: 'Reject',   fromStateId: 'af-2', toStateId: 'af-5', allowedRoles: ['owner'],                  allowedUsers: [], requiredFields: [], requireApproval: false, approvers: [], approvalCount: 1, autoActions: [] },
      { id: 'af-t4', name: 'Complete', fromStateId: 'af-3', toStateId: 'af-4', allowedRoles: ['owner','admin','member'], allowedUsers: [], requiredFields: [], requireApproval: false, approvers: [], approvalCount: 1, autoActions: [] },
      { id: 'af-t5', name: 'Revise',   fromStateId: 'af-5', toStateId: 'af-1', allowedRoles: ['owner','admin','member'], allowedUsers: [], requiredFields: [], requireApproval: false, approvers: [], approvalCount: 1, autoActions: [] },
    ],
  },
];
