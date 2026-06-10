import { JIssue } from './issue';
import { JUser } from './user';

export interface JProject {
  id: string;
  name: string;
  url: string;
  description: string;
  category: ProjectCategory;
  createdAt: string;
  updateAt: string;
  issues: JIssue[];
  users: JUser[];
  background: string;
  startDate?: string | null;
  dueDate?: string | null;
}

export enum ProjectCategory {
  SOFTWARE = 'Software',
  MARKETING = 'Marketing',
  BUSINESS = 'Business'
}
