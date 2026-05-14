import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ProjectQuery } from '@trungk18/project/state/project/project.query';
import { ProjectService } from '@trungk18/project/state/project/project.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { environment } from 'src/environments/environment';

export interface MyProject {
  id:             string;
  name:           string;
  description:    string;
  role:           'owner' | 'admin' | 'member';
  memberCount:    number;
  lastAccessedAt: string | null;
}

const ROLE_PRIORITY: Record<string, number> = { owner: 0, admin: 1, member: 2 };

@UntilDestroy()
@Component({
  selector: 'app-project-switcher',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-switcher.component.html',
  styleUrls: ['./project-switcher.component.scss']
})
export class ProjectSwitcherComponent implements OnInit {
  isOpen          = false;
  searchQuery     = '';
  projects: MyProject[] = [];
  loadingProjects = false;
  switching       = false;
  showCreateForm  = false;
  newProjectName  = '';
  creating        = false;

  currentProjectId   = '';
  currentProjectName = '';
  currentRole        = '';

  dropdownStyle: { top: string; left: string; width: string } = { top: '0', left: '0', width: '260px' };

  constructor(
    private _projectQuery: ProjectQuery,
    private _projectService: ProjectService,
    private _http: HttpClient,
    private _router: Router,
    private _elRef: ElementRef,
    private _notify: NzNotificationService
  ) {}

  ngOnInit(): void {
    this._projectQuery.all$.pipe(untilDestroyed(this)).subscribe(p => {
      this.currentProjectId   = p.id   || '';
      this.currentProjectName = p.name || '';
    });
    this._projectQuery.myRole$.pipe(untilDestroyed(this)).subscribe(r => {
      this.currentRole = r;
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this._elRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  toggleDropdown(): void {
    if (this.isOpen) { this.close(); return; }

    const trigger = this._elRef.nativeElement.querySelector('.switcher-trigger');
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      this.dropdownStyle = {
        top:   `${rect.bottom + 6}px`,
        left:  `${rect.left}px`,
        width: `${Math.max(rect.width, 260)}px`
      };
    }

    this.isOpen     = true;
    this.searchQuery = '';
    this.showCreateForm = false;
    if (this.projects.length === 0) {
      this.loadProjects();
    }
  }

  close(): void {
    this.isOpen = false;
    this.showCreateForm = false;
    this.newProjectName = '';
  }

  loadProjects(): void {
    this.loadingProjects = true;
    this._http.get<{ projects: MyProject[] }>(`${environment.apiUrl}/projects/my-projects`)
      .subscribe({
        next: ({ projects }) => { this.projects = projects; this.loadingProjects = false; },
        error: ()           => { this.loadingProjects = false; }
      });
  }

  get filteredProjects(): MyProject[] {
    const q = this.searchQuery.toLowerCase().trim();
    const list = q ? this.projects.filter(p => p.name.toLowerCase().includes(q)) : this.projects;
    return [...list].sort((a, b) => {
      if (a.id === this.currentProjectId) return -1;
      if (b.id === this.currentProjectId) return 1;
      return (ROLE_PRIORITY[a.role] ?? 3) - (ROLE_PRIORITY[b.role] ?? 3);
    });
  }

  get recentProjects(): MyProject[] {
    if (this.searchQuery) return [];
    return this.projects
      .filter(p => p.lastAccessedAt)
      .sort((a, b) => new Date(b.lastAccessedAt!).getTime() - new Date(a.lastAccessedAt!).getTime())
      .slice(0, 3);
  }

  get showRecentSection(): boolean {
    return !this.searchQuery && this.recentProjects.length > 0 && this.projects.length > 3;
  }

  selectProject(project: MyProject): void {
    if (project.id === this.currentProjectId) { this.close(); return; }
    this.switching = true;
    this.close();
    this._projectService.switchToProject(project.id).subscribe({
      next: () => {
        this.switching = false;
        this.projects  = [];  // force reload next time
        this._router.navigate(['/project/board']);
      },
      error: () => { this.switching = false; }
    });
  }

  submitCreateProject(): void {
    const name = this.newProjectName.trim();
    if (!name || this.creating) return;
    this.creating = true;
    this._projectService.setupNewProject(name).subscribe({
      next: () => {
        this.creating       = false;
        this.showCreateForm = false;
        this.newProjectName = '';
        this.projects       = [];
        this.close();
        this._notify.success('Dự án đã tạo', `"${name}" đã được tạo thành công.`);
        this._router.navigate(['/project/board']);
      },
      error: (err) => {
        this.creating = false;
        this._notify.error('Lỗi', err?.error?.message || 'Không thể tạo dự án.');
      }
    });
  }

  avatar(name: string): string {
    return name ? name[0].toUpperCase() : '?';
  }

  color(name: string): string {
    const palette = ['#7c3aed', '#1e40af', '#065f46', '#9d174d', '#92400e', '#0369a1', '#b45309'];
    if (!name) return palette[0];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return palette[Math.abs(h) % palette.length];
  }

  roleClass(role: string): string {
    return ({ owner: 'r-owner', admin: 'r-admin', member: 'r-member' } as any)[role] ?? 'r-member';
  }

  roleLabel(role: string): string {
    return ({ owner: 'Owner', admin: 'Admin', member: 'Member' } as any)[role] ?? role;
  }
}
