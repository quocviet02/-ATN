import { JProject } from '@trungk18/interface/project';
import { IssueStatus } from '@trungk18/interface/issue';
import { Store, StoreConfig } from '@datorama/akita';
import { Injectable } from '@angular/core';

export interface ProjectColumn {
  id: string;
  name: string;
  status: IssueStatus;
}

export interface MyPermissions {
  canEditTask: boolean;
  canDragTask: boolean;
  canAssignSelf: boolean;
  canAssignOthers: boolean;
}

export interface ProjectState extends JProject {
  boardId: string;
  columnIdToStatus: Record<string, IssueStatus>;
  columnStatusToId: Record<string, string>;
  myRole: string;
  columns: ProjectColumn[];
  myPermissions: MyPermissions;
}

const DEFAULT_PERMISSIONS: MyPermissions = {
  canEditTask: false, canDragTask: false, canAssignSelf: false, canAssignOthers: false
};

function createInitialState(): ProjectState {
  return {
    issues: [],
    users: [],
    boardId: '',
    columnIdToStatus: {},
    columnStatusToId: {},
    myRole: '',
    columns: [],
    myPermissions: { ...DEFAULT_PERMISSIONS }
  } as ProjectState;
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'project' })
export class ProjectStore extends Store<ProjectState> {
  constructor() {
    super(createInitialState());
  }
}
