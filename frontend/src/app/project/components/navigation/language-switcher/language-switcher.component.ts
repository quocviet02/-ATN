import { Component, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface LangOption {
  code: string;
  flag: string;
  label: string;
}

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="lang-wrap" (click)="$event.stopPropagation()">
      <button class="lang-btn" (click)="toggle()" title="{{ 'lang.' + current | translate }}">
        🌐
      </button>
      <div class="lang-dropdown" *ngIf="isOpen">
        <div class="lang-item"
             *ngFor="let opt of options"
             (click)="select(opt.code)"
             [class.active]="opt.code === current">
          <span class="lang-flag">{{ opt.flag }}</span>
          <span class="lang-name">{{ opt.label }}</span>
          <span class="lang-check" *ngIf="opt.code === current">✓</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .lang-wrap { position: relative; }
    .lang-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 4px;
      color: #fff;
      opacity: 0.8;
      transition: opacity 0.15s;
    }
    .lang-btn:hover { opacity: 1; background: rgba(255,255,255,0.1); }
    .lang-dropdown {
      position: fixed;
      z-index: 1000;
      background: #fff;
      border-radius: 4px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
      min-width: 160px;
      overflow: hidden;
      left: 56px;
    }
    .lang-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      cursor: pointer;
      font-size: 14px;
      color: #172b4d;
      transition: background 0.12s;
    }
    .lang-item:hover { background: #f4f5f7; }
    .lang-item.active { background: #ebecf0; font-weight: 500; }
    .lang-flag { font-size: 18px; }
    .lang-name { flex: 1; }
    .lang-check { color: #0052cc; font-weight: bold; }
  `]
})
export class LanguageSwitcherComponent {
  isOpen = false;
  current = localStorage.getItem('language') || 'vi';

  readonly options: LangOption[] = [
    { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
  ];

  constructor(
    private _translate: TranslateService,
    private _elRef: ElementRef
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this._elRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
  }

  select(code: string): void {
    this.current = code;
    this._translate.use(code);
    localStorage.setItem('language', code);
    this.isOpen = false;
  }
}
