import {
  Component, Input, Output, EventEmitter,
  ElementRef, ViewChild,
  AfterViewInit, OnChanges, OnDestroy, SimpleChanges,
  NgZone, ChangeDetectionStrategy,
} from '@angular/core';
import { TimelineTask } from '../timeline.service';

export interface GanttTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies: string;
  custom_class: string;
}

const PRIORITY_CLASS: Record<string, string> = {
  low:      'gantt-low',
  medium:   'gantt-medium',
  high:     'gantt-high',
  critical: 'gantt-critical',
};

function toYMD(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

function addDay(ymd: string): string {
  const d = new Date(ymd);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function toGanttTasks(tasks: TimelineTask[]): GanttTask[] {
  return tasks
    .filter(t => t.dueDate)
    .map(t => {
      const start = toYMD(t.startDate) || addDay(toYMD(t.dueDate)!);
      const end   = toYMD(t.dueDate)!;
      const safeEnd = end < start ? addDay(start) : end;
      return {
        id:           t.id,
        name:         t.title,
        start,
        end:          safeEnd,
        progress:     t.progress,
        dependencies: (t.dependencies || []).join(', '),
        custom_class: PRIORITY_CLASS[t.priority] || 'gantt-medium',
      };
    });
}

@Component({
  selector:        'app-gantt-chart',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template:        `<div #ganttEl class="gantt-host"></div>`,
  styles:          [`
    :host { display: block; width: 100%; overflow-x: auto; }
    .gantt-host { min-height: 120px; }
  `],
})
export class GanttChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('ganttEl') ganttEl!: ElementRef<HTMLDivElement>;

  @Input() tasks: GanttTask[] = [];
  @Input() viewMode = 'Week';

  @Output() taskClick       = new EventEmitter<string>();
  @Output() taskDateChange  = new EventEmitter<{ taskId: string; startDate: string; endDate: string }>();

  private _gantt: any = null;
  private _ready = false;

  constructor(private _zone: NgZone) {}

  ngAfterViewInit(): void {
    this._init();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this._ready || !this._gantt) return;
    if (changes['tasks']) {
      if (this.tasks.length) {
        this._gantt.refresh(this.tasks);
      } else {
        this._destroy();
        this._ready = false;
      }
    }
    if (changes['viewMode'] && !changes['viewMode'].firstChange) {
      this._gantt.change_view_mode(this.viewMode);
    }
  }

  ngOnDestroy(): void {
    this._destroy();
  }

  private _destroy(): void {
    if (this.ganttEl?.nativeElement) {
      this.ganttEl.nativeElement.innerHTML = '';
    }
    this._gantt = null;
  }

  private _init(): void {
    if (!this.tasks.length) return;
    this._destroy();

    import('frappe-gantt').then(mod => {
      const GanttClass = (mod as any).default ?? mod;
      this._zone.runOutsideAngular(() => {
        this._gantt = new GanttClass(this.ganttEl.nativeElement, this.tasks, {
          view_mode:   this.viewMode,
          date_format: 'YYYY-MM-DD',
          language:    'en',
          on_click:    (task: GanttTask) => this._zone.run(() => this.taskClick.emit(task.id)),
          on_date_change: (task: GanttTask, start: Date, end: Date) => {
            this._zone.run(() => this.taskDateChange.emit({
              taskId:    task.id,
              startDate: start.toISOString().split('T')[0],
              endDate:   end.toISOString().split('T')[0],
            }));
          },
          custom_popup_html: (task: GanttTask) => `
            <div class="gantt-popup">
              <strong>${task.name}</strong>
              <div class="popup-dates">${task.start} → ${task.end}</div>
              <div class="popup-progress">${task.progress}% hoàn thành</div>
            </div>
          `,
        });
        this._ready = true;
      });
    });
  }

  refreshView(): void {
    if (this._gantt) this._gantt.change_view_mode(this.viewMode);
  }
}
