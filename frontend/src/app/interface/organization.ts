import { JUser } from './user';

export type OrgRole = 'owner' | 'admin' | 'department_head' | 'team_lead' | 'member' | 'guest';
export type MemberStatus = 'active' | 'invited' | 'suspended' | 'deactivated';

export interface JOrganization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  description: string;
  industry: string;
  size: string;
  country: string;
  website: string;
  plan: 'free' | 'starter' | 'business' | 'enterprise';
  maxMembers: number;
  maxProjects: number;
  settings: {
    allowMemberInvite: boolean;
    requireApprovalForJoin: boolean;
    defaultProjectVisibility: 'public' | 'private';
    ssoEnabled: boolean;
  };
  createdBy?: JUser;
  ownerId?: string | JUser;
  myRole?: OrgRole;
  stats?: {
    memberCount: number;
    deptCount: number;
    projectCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface JDepartment {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  headId?: JUser | null;
  parentDepartmentId?: string | null;
  color: string;
  icon: string;
  memberCount?: number;
  children?: JDepartment[];
  createdAt: string;
  updatedAt: string;
}

export interface JOrgMember {
  id: string;
  organizationId: string;
  userId: JUser;
  departmentId?: JDepartment | null;
  orgRole: OrgRole;
  jobTitle: string;
  employeeId: string;
  joinedAt: string;
  invitedBy?: JUser | null;
  status: MemberStatus;
  permissions: string[];
}
