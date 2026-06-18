import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { ResourceService } from '../resource.service';
import { OrganizationService } from '../../organization/organization.service';
import { AuthQuery } from '@trungk18/project/auth/auth.query';
import { JSkill, JSkillMatrixRow, JUserSkill, SkillCategory } from '../../interface/resource';

@Component({
  selector: 'app-skills-matrix',
  templateUrl: './skills-matrix.component.html',
  styleUrls: ['./skills-matrix.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    NzSpinModule, NzButtonModule, NzIconModule, NzTagModule,
    NzSelectModule, NzInputModule, NzToolTipModule, NzEmptyModule,
    NzAvatarModule, NzModalModule, NzFormModule, NzInputNumberModule,
  ],
  providers: [NzModalService],
})
export class SkillsMatrixComponent implements OnInit {
  matrix: JSkillMatrixRow[] = [];
  skills: JSkill[] = [];
  loading = false;

  categoryFilter: string = 'all';
  nameSearch = '';

  editVisible = false;
  editUserId = '';
  editUserName = '';
  editSkills: { skillId: string; level: number; yearsOfExperience: number }[] = [];
  saving = false;

  readonly categories: { label: string; value: string }[] = [
    { label: 'Tất cả', value: 'all' },
    { label: 'Lập trình', value: 'programming' },
    { label: 'Framework', value: 'framework' },
    { label: 'Database', value: 'database' },
    { label: 'DevOps', value: 'devops' },
    { label: 'Thiết kế', value: 'design' },
    { label: 'Kỹ năng mềm', value: 'soft_skill' },
    { label: 'Ngoại ngữ', value: 'language' },
  ];

  readonly levelLabels = ['', 'Beginner', 'Intermediate', 'Proficient', 'Advanced', 'Expert'];

  constructor(
    private _svc: ResourceService,
    private _orgSvc: OrganizationService,
    private _authQ: AuthQuery,
    private _modal: NzModalService,
    private _msg: NzMessageService,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    const orgId = this._orgSvc.currentOrgId;
    if (!orgId) return;
    this.loading = true;
    this._svc.getOrgSkillsMatrix(orgId).subscribe({
      next: data => { this.matrix = data.matrix; this.skills = data.skills; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  get filteredSkills(): JSkill[] {
    if (this.categoryFilter === 'all') return this.skills;
    return this.skills.filter(s => s.category === this.categoryFilter);
  }

  get filteredMatrix(): JSkillMatrixRow[] {
    if (!this.nameSearch) return this.matrix;
    const q = this.nameSearch.toLowerCase();
    return this.matrix.filter(r => r.user?.name?.toLowerCase().includes(q));
  }

  getSkillLevel(row: JSkillMatrixRow, skill: JSkill): number {
    const us = row.skills.find(s => {
      const sid = typeof s.skillId === 'string' ? s.skillId : (s.skillId as JSkill)?.id;
      return sid === skill.id;
    });
    return us?.level || 0;
  }

  cellBg(level: number): string {
    if (!level) return '#fafafa';
    const colors = ['', '#e6f7ff', '#bae7ff', '#69c0ff', '#1890ff', '#0050b3'];
    return colors[level] || '#fafafa';
  }

  cellColor(level: number): string {
    return level >= 4 ? '#fff' : level >= 2 ? '#003a8c' : '#8c8c8c';
  }

  openEdit(row: JSkillMatrixRow): void {
    this.editUserId   = row.user?.id || row.user?._id;
    this.editUserName = row.user?.name;
    this.editSkills = this.filteredSkills.map(skill => {
      const existing = row.skills.find(s => {
        const sid = typeof s.skillId === 'string' ? s.skillId : (s.skillId as JSkill)?.id;
        return sid === skill.id;
      });
      return { skillId: skill.id, level: existing?.level || 0, yearsOfExperience: existing?.yearsOfExperience || 0 };
    });
    this.editVisible = true;
  }

  saveEdit(): void {
    const toSave = this.editSkills.filter(s => s.level > 0);
    this.saving = true;
    this._svc.updateUserSkills(this.editUserId, toSave).subscribe({
      next: () => {
        this._msg.success('Cập nhật skills thành công');
        this.editVisible = false;
        this.saving = false;
        this.load();
      },
      error: err => { this._msg.error(err?.error?.message || 'Lỗi'); this.saving = false; },
    });
  }

  getSkillName(skillId: string): string {
    return this.skills.find(s => s.id === skillId)?.name || skillId;
  }
}
