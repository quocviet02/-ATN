import { ProjectState, ProjectStore } from './project.store';
import { Injectable } from '@angular/core';
import { Query } from '@datorama/akita';
import { IssueStatus, JIssue } from '@trungk18/interface/issue';
import { map, delay } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProjectQuery extends Query<ProjectState> {
  isLoading$     = this.selectLoading();
  all$           = this.select();
  issues$        = this.select('issues');
  users$         = this.select('users');
  myRole$        = this.select('myRole');
  columns$       = this.select('columns');
  myPermissions$ = this.select('myPermissions');
  background$    = this.select('background');
  hasProject$    = this.select('id').pipe(map(id => !!id));

  constructor(protected store: ProjectStore) {
    super(store);
  }

  lastIssuePosition = (status: IssueStatus): number => {
    const raw = this.store.getValue();
    return raw.issues.filter(x => x.status === status).length;
  };

  issueByStatusSorted$ = (status: IssueStatus): Observable<JIssue[]> =>
    this.issues$.pipe(
      map((issues) =>
        issues
          .filter((x) => x.status === status)
          .sort((a, b) => a.listPosition - b.listPosition)
      )
    );

  issueById$(issueId: string) {
    return this.issues$.pipe(
      delay(500),
      map((issues) => issues.find(x => x.id === issueId))
    );
  }
}
