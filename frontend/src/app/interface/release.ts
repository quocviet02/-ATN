export type ReleaseType   = 'major' | 'minor' | 'patch' | 'hotfix';
export type ReleaseStatus = 'draft' | 'released' | 'rollback';

export type ProjectStatus =
  | 'planning'
  | 'in_development'
  | 'testing'
  | 'released'
  | 'maintenance'
  | 'paused'
  | 'cancelled';

export interface JRelease {
  id: string;
  projectId: string;
  version: string;
  releaseDate: string;
  releaseNotes: string;
  type: ReleaseType;
  status: ReleaseStatus;
  createdBy?: { id: string; name: string; email: string; avatar?: string };
  tasks?: { id: string; title: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
}

export interface ProjectOverviewItem {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  version: string;
  progress: number;
  releaseDate: string | null;
  startDate: string | null;
  endDate: string | null;
  techStack: string[];
  repository: string;
  demoUrl: string;
  role: 'owner' | 'admin' | 'member';
  memberCount: number;
  taskStats: TaskStats;
  lastActivity: string;
  latestRelease: { version: string; releaseDate: string } | null;
}

export interface OverviewSummary {
  total: number;
  byStatus: Record<ProjectStatus, number>;
  byRole: { owner: number; admin: number; member: number };
  totalReleases: number;
}

export interface OverviewResponse {
  summary: OverviewSummary;
  projects: ProjectOverviewItem[];
}

export interface ReleaseStatistics {
  releasedThisYear: number;
  totalReleases: number;
  topProject: string | null;
  topProjectCount: number;
  byMonth: { _id: number; count: number }[];
  releasesByDay: { _id: string; count: number }[];
  thisMonth: number;
  lastMonth: number;
  monthGrowth: number;
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  planning:       'purple',
  in_development: 'blue',
  testing:        'orange',
  released:       'green',
  maintenance:    'cyan',
  paused:         'gold',
  cancelled:      'red',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning:       'Lên kế hoạch',
  in_development: 'Đang phát triển',
  testing:        'Đang kiểm thử',
  released:       'Đã phát hành',
  maintenance:    'Bảo trì',
  paused:         'Tạm dừng',
  cancelled:      'Đã hủy',
};

export const RELEASE_TYPE_COLORS: Record<ReleaseType, string> = {
  major:  'red',
  minor:  'blue',
  patch:  'green',
  hotfix: 'orange',
};
