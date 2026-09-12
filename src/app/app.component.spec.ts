import { TestBed } from '@angular/core/testing';
import { AppComponent, routes } from './app.component';
import { CompetitionService } from './core/competition.service';
import { RealtimeDbGateway } from './core/realtime-db.gateway';
import { FakeRealtimeDbGateway } from './testing/fake-realtime-db.gateway';
import { AuthGateway } from './core/auth.gateway';
import { FakeAuthGateway } from './testing/fake-auth.gateway';
import { provideRouter } from '@angular/router';
import { OverviewComponent } from './pages/overview/overview.component';
import { LoginComponent } from './pages/login/login.component';

describe('AppComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter(routes),
        CompetitionService,
        { provide: RealtimeDbGateway, useValue: new FakeRealtimeDbGateway() },
        { provide: AuthGateway, useValue: new FakeAuthGateway() }
      ]
    });
  });

  it('should create the root shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should route the empty path to the overview screen, guarded by login', () => {
    expect(routes[0].path).toBe('');
    expect(routes[0].component).toBe(OverviewComponent);
    expect(routes[0].canActivate).toBeTruthy();
  });

  it('should route /login to the login screen', () => {
    expect(routes[1]).toEqual({ path: 'login', component: LoginComponent });
  });
});
