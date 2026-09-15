import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AnalyticsComponent } from './analytics.component';
import { CompetitionService } from '../../core/competition.service';
import { RealtimeDbGateway } from '../../core/realtime-db.gateway';
import { FakeRealtimeDbGateway } from '../../testing/fake-realtime-db.gateway';
import { AppState, Team } from '../../core/models';

describe('AnalyticsComponent', () => {
  let component: AnalyticsComponent;
  let gateway: FakeRealtimeDbGateway;
  let httpMock: HttpTestingController;

  const PAST_SEASON_FILE = 'assets/backup/hunting-games-2025.json';

  // Current season (via CompetitionService/live Firebase state): 2 M teams (2 + 1 members),
  // 1 Ž team (3 members) => 6 competitors total (3 M, 3 Ž), 3 teams (2 M, 1 Ž).
  const currentTeams: Team[] = [
    { id: 1, name: 'Sokolovi', category: 'M', members: [
      { id: 1, firstName: 'Ivan', lastName: 'Horvat' },
      { id: 2, firstName: 'Marko', lastName: 'Kos' }
    ] },
    { id: 2, name: 'Vukovi', category: 'M', members: [{ id: 3, firstName: 'Pero', lastName: 'Peric' }] },
    { id: 3, name: 'Orlice', category: 'Ž', members: [
      { id: 4, firstName: 'Ana', lastName: 'Ban' },
      { id: 5, firstName: 'Iva', lastName: 'Kos' },
      { id: 6, firstName: 'Maja', lastName: 'Novak' }
    ] }
  ];

  // Past season (mocked HTTP response, same AppState shape): 1 M team (1 member), 1 Ž team
  // (2 members) => 3 competitors total (1 M, 2 Ž), 2 teams (1 M, 1 Ž).
  const pastState: AppState = {
    teams: [
      { id: 1, name: 'Stari Sokolovi', category: 'M', members: [{ id: 1, firstName: 'Josip', lastName: 'Babic' }] },
      { id: 2, name: 'Stare Orlice', category: 'Ž', members: [
        { id: 2, firstName: 'Ines', lastName: 'Horvat' },
        { id: 3, firstName: 'Nina', lastName: 'Kovac' }
      ] }
    ],
    disciplines: [],
    results: []
  };

  beforeEach(() => {
    gateway = new FakeRealtimeDbGateway();

    TestBed.configureTestingModule({
      imports: [AnalyticsComponent],
      providers: [
        provideRouter([]),
        CompetitionService,
        { provide: RealtimeDbGateway, useValue: gateway },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    TestBed.inject(CompetitionService);
    gateway.emit({ teams: currentTeams, disciplines: [], results: [] });

    httpMock = TestBed.inject(HttpTestingController);
    component = TestBed.createComponent(AnalyticsComponent).componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  function initWithPastData() {
    component.ngOnInit();
    httpMock.expectOne(PAST_SEASON_FILE).flush(pastState);
  }

  function initWithPastLoadFailure() {
    component.ngOnInit();
    httpMock.expectOne(PAST_SEASON_FILE).flush(null, { status: 404, statusText: 'Not Found' });
  }

  describe('ngOnInit', () => {
    it('should summarize the current season from CompetitionService state', () => {
      initWithPastData();

      expect(component.current).toEqual({
        label: String(component.currentYear),
        teams: 3, teamsM: 2, teamsZ: 1,
        competitors: 6, competitorsM: 3, competitorsZ: 3
      });
    });

    it('should summarize the past season from the fetched backup JSON', () => {
      initWithPastData();

      expect(component.past).toEqual({
        label: String(component.pastYear),
        teams: 2, teamsM: 1, teamsZ: 1,
        competitors: 3, competitorsM: 1, competitorsZ: 2
      });
    });

    it('should re-run the current season summary whenever the underlying competition state changes', () => {
      initWithPastData();
      expect(component.current!.competitors).toBe(6);

      const vukovi: Team = { id: 4, name: 'Novi Tim', category: 'M', members: [{ id: 7, firstName: 'Ante', lastName: 'Peric' }] };
      gateway.emit({ teams: [...currentTeams, vukovi], disciplines: [], results: [] });

      expect(component.current!.competitors).toBe(7);
    });

    it('should default past teams to an empty array when the backup file has no teams field', () => {
      component.ngOnInit();
      httpMock.expectOne(PAST_SEASON_FILE).flush({ disciplines: [], results: [] } as any);

      expect(component.past).toEqual({ label: String(component.pastYear), teams: 0, teamsM: 0, teamsZ: 0, competitors: 0, competitorsM: 0, competitorsZ: 0 });
    });

    it('should set loadError when the backup file fails to load', () => {
      initWithPastLoadFailure();

      expect(component.loadError).toBe(true);
      expect(component.past).toBeNull();
    });
  });

  describe('loading', () => {
    it('should be true before the current season state has arrived', () => {
      expect(component.loading).toBe(true);
    });

    it('should be true once current has arrived but past has not (and no error yet)', () => {
      component.ngOnInit();
      expect(component.loading).toBe(true);
      httpMock.expectOne(PAST_SEASON_FILE).flush(pastState);
    });

    it('should be false once both current and past have loaded', () => {
      initWithPastData();
      expect(component.loading).toBe(false);
    });

    it('should be false once the past season failed to load (error short-circuits the wait)', () => {
      initWithPastLoadFailure();
      expect(component.loading).toBe(false);
    });
  });

  describe('competitorRows', () => {
    it('should be empty while data is still loading', () => {
      expect(component.competitorRows).toEqual([]);
    });

    it('should build the three comparison rows once both seasons are loaded', () => {
      initWithPastData();

      expect(component.competitorRows).toEqual([
        { label: 'Ukupno', current: 6, past: 3 },
        { label: 'Muškarci', current: 3, past: 1 },
        { label: 'Žene', current: 3, past: 2 }
      ]);
    });
  });

  describe('maxCompetitorValue / barWidth', () => {
    it('should default to 1 (avoiding division by zero) when there is no data yet', () => {
      expect(component.maxCompetitorValue).toBe(1);
      expect(component.barWidth(0)).toBe('0%');
    });

    it('should be the largest current/past value across all rows', () => {
      initWithPastData();
      expect(component.maxCompetitorValue).toBe(6);
    });

    it('should compute bar width as a percentage of the max value', () => {
      initWithPastData();
      expect(component.barWidth(6)).toBe('100%');
      expect(component.barWidth(3)).toBe('50%');
    });
  });

  describe('totalDelta / totalDeltaPercent', () => {
    it('should be 0/null before both seasons have loaded', () => {
      expect(component.totalDelta).toBe(0);
      expect(component.totalDeltaPercent).toBeNull();
    });

    it('should compute the absolute and percentage change once loaded', () => {
      initWithPastData();
      expect(component.totalDelta).toBe(3);
      expect(component.totalDeltaPercent).toBe(100);
    });

    it('should return null for the percentage when the past season had zero competitors', () => {
      component.ngOnInit();
      httpMock.expectOne(PAST_SEASON_FILE).flush({ teams: [], disciplines: [], results: [] });

      expect(component.totalDeltaPercent).toBeNull();
    });
  });

  describe('tableRows', () => {
    it('should be empty while data is still loading', () => {
      expect(component.tableRows).toEqual([]);
    });

    it('should build the full six-row breakdown once both seasons are loaded', () => {
      initWithPastData();

      expect(component.tableRows).toEqual([
        { metric: 'Sudionici - ukupno', past: 3, current: 6, delta: 3 },
        { metric: 'Sudionici - muškarci', past: 1, current: 3, delta: 2 },
        { metric: 'Sudionici - žene', past: 2, current: 3, delta: 1 },
        { metric: 'Ekipe - ukupno', past: 2, current: 3, delta: 1 },
        { metric: 'Ekipe - muškarci', past: 1, current: 2, delta: 1 },
        { metric: 'Ekipe - žene', past: 1, current: 1, delta: 0 }
      ]);
    });
  });
});
