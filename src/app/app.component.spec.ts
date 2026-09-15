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
import { AnalyticsComponent } from './pages/analytics/analytics.component';
import { GulasComponent } from './pages/gulas/gulas.component';

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

  it('should route /analitika to the analytics screen, guarded by login', () => {
    const route = routes.find(r => r.path === 'analitika')!;
    expect(route.component).toBe(AnalyticsComponent);
    expect(route.canActivate).toBeTruthy();
  });

  it('should route /gulas to the gulaš scoring screen, guarded by login', () => {
    const route = routes.find(r => r.path === 'gulas')!;
    expect(route.component).toBe(GulasComponent);
    expect(route.canActivate).toBeTruthy();
  });

  it('should route /pracenje to the read-only overview screen without a login guard', () => {
    const route = routes.find(r => r.path === 'pracenje')!;
    expect(route.component).toBe(OverviewComponent);
    expect(route.canActivate).toBeUndefined();
    expect((route as any).data).toEqual({ readOnly: true });
  });
});
