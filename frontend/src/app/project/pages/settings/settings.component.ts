import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { UntypedFormBuilder, UntypedFormGroup, ReactiveFormsModule } from '@angular/forms';
import { AsyncPipe, NgIf } from '@angular/common';
import { ProjectConst } from '@trungk18/project/config/const';
import { JProject, ProjectCategory } from '@trungk18/interface/project';
import { ProjectQuery } from '@trungk18/project/state/project/project.query';
import { ProjectService } from '@trungk18/project/state/project/project.service';
import { PermissionService } from '@trungk18/core/services/permission.service';
import { NoWhitespaceValidator } from '@trungk18/core/validators/no-whitespace.validator';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ButtonComponent } from '../../../jira-control/button/button.component';
import { AutofocusDirective } from '../../../core/directives/autofocus.directive';
import { BreadcrumbsComponent } from '../../../jira-control/breadcrumbs/breadcrumbs.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@UntilDestroy()
@Component({
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
    imports: [BreadcrumbsComponent, ReactiveFormsModule, AutofocusDirective, ButtonComponent, AsyncPipe, NgIf, TranslateModule]
})
export class SettingsComponent implements OnInit {
  project: JProject;
  projectForm: UntypedFormGroup;
  categories: ProjectCategory[];

  get breadcrumbs(): string[] {
    return [ProjectConst.Projects, this.project?.name, 'Settings'];
  }

  constructor(
    private _projectQuery: ProjectQuery,
    private _projectService: ProjectService,
    public permissionService: PermissionService,
    private _notification: NzNotificationService,
    private _modal: NzModalService,
    private _fb: UntypedFormBuilder,
    private _router: Router,
    private _translate: TranslateService
  ) {
    this.categories = [ProjectCategory.BUSINESS, ProjectCategory.MARKETING, ProjectCategory.SOFTWARE];
  }

  ngOnInit(): void {
    this.initForm();
    this._projectQuery.all$.pipe(untilDestroyed(this)).subscribe((project) => {
      this.project = project;
      this.updateForm(project);
    });
  }

  initForm() {
    this.projectForm = this._fb.group({
      name:        ['', NoWhitespaceValidator()],
      url:         [''],
      description: [''],
      category:    [ProjectCategory.SOFTWARE]
    });
  }

  updateForm(project: JProject) {
    this.projectForm.patchValue({
      name:        project.name,
      url:         project.url,
      description: project.description,
      category:    project.category
    });
  }

  submitForm() {
    const formValue: Partial<JProject> = this.projectForm.getRawValue();
    this._projectService.updateProject(formValue);
    this._notification.create('success', this._translate.instant('settings.save'), '');
  }

  confirmDeleteProject() {
    this._modal.confirm({
      nzTitle:   this._translate.instant('settings.deleteProjectTitle'),
      nzContent: this._translate.instant('settings.deleteProjectDesc'),
      nzOkText:  this._translate.instant('settings.deleteProjectBtn'),
      nzOkDanger: true,
      nzOnOk: () => {
        const obs = this._projectService.deleteProject();
        if (!obs) return;
        obs.subscribe(() => {
          this._notification.create('success', this._translate.instant('settings.deleteProjectTitle'), '');
          this._router.navigate(['/login']);
        });
      }
    });
  }

  cancel() { this._router.navigate(['/']); }
}
