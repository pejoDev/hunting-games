import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { OverviewComponent } from './overview.component';
import { LoginComponent } from './login.component';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

export const routes = [
  { path: '', component: OverviewComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent }
];

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, MatToolbarModule, MatIconModule, MatButtonModule],
    templateUrl: './app.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './app.component.scss'
})
export class AppComponent {
  constructor(public authService: AuthService) {}

  logout() {
    this.authService.logout();
  }
}
