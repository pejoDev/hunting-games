import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';

import { OverviewComponent } from './overview.component';

export const routes = [
  { path: '', component: OverviewComponent }
];

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, MatToolbarModule, MatIconModule, OverviewComponent],
    template: `
    <div class="header">
      <div class="container">
        <h1>
          <mat-icon style="vertical-align: middle; margin-right: 12px;">emoji_events</mat-icon>
          Sustav za Praćenje Rezultata Međudruštvenog Natjecanja
        </h1>
      </div>
    </div>
    <div class="container">
      <router-outlet></router-outlet>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class AppComponent {}
