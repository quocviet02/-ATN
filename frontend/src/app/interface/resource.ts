export type SkillCategory = 'programming' | 'framework' | 'database' | 'devops' | 'design' | 'soft_skill' | 'language' | 'other';
export type BurnoutRisk   = 'low' | 'medium' | 'high' | 'critical';
export type TimeOffType   = 'vacation' | 'sick' | 'personal' | 'training' | 'public_holiday' | 'maternity' | 'other';
export type TimeOffStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface JSkill {
  id:          string;
  name:        string;
  category:    SkillCategory;
  description: string;
  color:       string;
  icon:        string;
}

export interface JUserSkill {
  id:                string;
  userId:            string;
  skillId:           JSkill | string;
  level:             number;
  yearsOfExperience: number;
  selfAssessed:      boolean;
  endorsedBy:        any[];
  lastUsedDate:      string | null;
  certificates:      string[];
}

export interface JWorkCapacity {
  hoursPerWeek: number;
  workingDays:  string[];
  timezone:     string;
  startTime:    string;
  endTime:      string;
}

export interface JProjectBreakdown {
  projectId:   string;
  projectName: string;
  hours:       number;
}

export interface JWeekWorkload {
  weekLabel:      string;
  weekStart:      string;
  weekEnd:        string;
  capacityHours:  number;
  allocatedHours: number;
  utilization:    number;
  isOverloaded:   boolean;
  burnoutRisk:    BurnoutRisk;
  projects:       JProjectBreakdown[];
}

export interface JUserWorkload {
  user:           any;
  capacity:       JWorkCapacity;
  weeks:          JWeekWorkload[];
  currentWeek:    JWeekWorkload;
  avgUtilization: number;
  burnoutRisk:    BurnoutRisk;
}

export interface JMemberLoad {
  user:           any;
  orgRole:        string;
  capacityHours:  number;
  allocatedHours: number;
  utilization:    number;
  isOverloaded:   boolean;
  burnoutRisk:    BurnoutRisk;
  status:         'critical' | 'overloaded' | 'near_capacity' | 'healthy' | 'underloaded';
}

export interface JOrgCapacityOverview {
  weekLabel: string;
  members:   JMemberLoad[];
  summary: {
    total:          number;
    overloaded:     number;
    nearCapacity:   number;
    healthy:        number;
    underloaded:    number;
    avgUtilization: number;
    burnoutAtRisk:  number;
  };
}

export interface JTimeOff {
  id:             string;
  userId:         any;
  organizationId: string;
  type:           TimeOffType;
  startDate:      string;
  endDate:        string;
  hoursPerDay:    number;
  totalHours:     number;
  status:         TimeOffStatus;
  reason:         string;
  approvedBy?:    any;
  createdAt:      string;
}

export interface JAssignmentCandidate {
  userId:          string;
  name:            string;
  avatar:          string | null;
  matchScore:      number;
  reasons:         string[];
  concerns:        string[];
  recommendation:  string;
  currentWorkload: number;
  utilization:     number;
  availableHours:  number;
  skills:          { name: string; level: number }[];
}

export interface JSkillMatrixRow {
  user:    any;
  orgRole: string;
  skills:  JUserSkill[];
}
