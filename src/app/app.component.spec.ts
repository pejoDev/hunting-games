import { TestBed } from '@angular/core/testing';
import { AppComponent, routes } from './app.component';
import { CompetitionService } from './competition.service';
import { RealtimeDbGateway } from './realtime-db.gateway';
import { FakeRealtimeDbGateway } from './testing/fake-realtime-db.gateway';
import { provideRouter } from '@angular/router';
import { OverviewComponent } from './overview.component';

describe('AppComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter(routes),
        CompetitionService,
        { provide: RealtimeDbGateway, useValue: new FakeRealtimeDbGateway() }
      ]
    });
  });

  it('should create the root shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should route the empty path to the overview screen (the app\'s single page)', () => {
    expect(routes).toEqual([{ path: '', component: OverviewComponent }]);
  });
});
