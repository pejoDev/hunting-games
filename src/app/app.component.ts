import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { OverviewComponent } from './pages/overview/overview.component';
import { LoginComponent } from './pages/login/login.component';
import { AnalyticsComponent } from './pages/analytics/analytics.component';
import { authGuard } from './core/auth.guard';
import { AuthService } from './core/auth.service';

export const routes = [
  { path: '', component: OverviewComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'analitika', component: AnalyticsComponent, canActivate: [authGuard] },
  // Javna, nezaštićena stranica za praćenje rezultata uživo (bez prijave)
  { path: 'pracenje', component: OverviewComponent, data: { readOnly: true } }
];

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink, MatToolbarModule, MatIconModule, MatButtonModule],
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './app.component.scss'
})
export class AppComponent {
  constructor(public authService: AuthService, private router: Router) {}

  logout() {
    this.authService.logout().then(() => this.router.navigateByUrl('/login'));
  }
}
