import { Component, Input } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';

@Component({
    selector: 'j-avatar',
    templateUrl: './avatar.component.html',
    styleUrls: ['./avatar.component.scss'],
    imports: [NgClass, NgStyle]
})
export class AvatarComponent {
  @Input() avatarUrl: string;
  @Input() size = 12;
  @Input() name = '';
  @Input() rounded = true;
  @Input() className = '';

  get initials(): string {
    if (!this.name) return '?';
    return this.name
      .trim()
      .split(/\s+/)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  get fontSize(): string {
    return `${Math.max(10, Math.round(this.size * 0.38))}px`;
  }

  get containerStyle() {
    const radius = this.rounded ? '100%' : '3px';
    const base = { width: `${this.size}px`, height: `${this.size}px`, 'border-radius': radius };
    if (this.avatarUrl) {
      return {
        ...base,
        'background-image': `url('${this.avatarUrl}')`,
        'background-position': '50% 50%',
        'background-repeat': 'no-repeat',
        'background-size': 'cover'
      };
    }
    return base;
  }

  get initialsStyle() {
    return { 'font-size': this.fontSize, 'line-height': `${this.size}px` };
  }
}
