import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { JIssue } from '@trungk18/interface/issue';
import { JUser } from '@trungk18/interface/user';
import { ProjectService } from '@trungk18/project/state/project/project.service';
import { AuthQuery } from '@trungk18/project/auth/auth.query';
import { NzMenuDirective, NzMenuItemComponent } from 'ng-zorro-antd/menu';
import { NzIconDirective } from 'ng-zorro-antd/icon';
import { NzDropDownADirective, NzDropDownDirective, NzDropdownMenuComponent } from 'ng-zorro-antd/dropdown';
import { SvgIconComponent } from '../../../../jira-control/svg-icon/svg-icon.component';
import { UserComponent } from '../../user/user.component';
import { ButtonComponent } from '../../../../jira-control/button/button.component';
import { NgIf } from '@angular/common';


@Component({
    selector: 'issue-assignees',
    templateUrl: './issue-assignees.component.html',
    styleUrls: ['./issue-assignees.component.scss'],
    imports: [ButtonComponent, UserComponent, SvgIconComponent, NzDropDownADirective, NzDropDownDirective, NzIconDirective, NzDropdownMenuComponent, NzMenuDirective, NzMenuItemComponent, NgIf]
})
@UntilDestroy()
export class IssueAssigneesComponent implements OnInit, OnChanges {
  @Input() issue: JIssue;
  @Input() users: JUser[];
  @Input() canAssignSelf   = false;
  @Input() canAssignOthers = false;
  assignees: JUser[];
  currentUserId: string | null = null;

  constructor(private _projectService: ProjectService, private _authQuery: AuthQuery) {}

  ngOnInit(): void {
    this.updateAssignees();
    this._authQuery.userId$.pipe(untilDestroyed(this)).subscribe(uid => this.currentUserId = uid);
  }

  assignToMe(): void {
    if (!this.currentUserId) return;
    const me = this.users?.find(u => u.id === this.currentUserId);
    if (me) this.addUserToIssue(me);
  }

  get isAlreadyAssignedToMe(): boolean {
    return !!this.currentUserId && this.issue?.userIds?.includes(this.currentUserId);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.issue || changes.users) {
      this.updateAssignees();
    }
  }

  private updateAssignees(): void {
    if (!this.users || !this.issue) return;
    this.assignees = this.issue.userIds
      .map((userId) => this.users.find((x) => x.id === userId))
      .filter(Boolean) as any[];
  }

  removeUser(userId: string) {
    const newUserIds = this.issue.userIds.filter((x) => x !== userId);
    this._projectService.updateIssue({
      ...this.issue,
      userIds: newUserIds
    });
  }

  addUserToIssue(user: JUser) {
    this._projectService.updateIssue({
      ...this.issue,
      userIds: [user.id]
    });
  }

  isUserSelected(user: JUser): boolean {
    return this.issue.userIds.includes(user.id);
  }
}
