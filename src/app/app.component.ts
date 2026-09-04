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
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './app.component.scss'
})
export class AppComponent {}
