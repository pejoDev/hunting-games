import { TestBed } from '@angular/core/testing';
import { CompetitionService } from './competition.service';
import { RealtimeDbGateway } from './realtime-db.gateway';
import { FakeRealtimeDbGateway } from '../testing/fake-realtime-db.gateway';
import { ResultsVerificationService } from './results-verification.service';
import { Team, Discipline, Result } from './models';

describe('ResultsVerificationService', () => {
  let service: ResultsVerificationService;
  let competitionService: CompetitionService;
  let gateway: FakeRealtimeDbGateway;

  const team = (overrides: Partial<Team> = {}): Team => ({
    id: 1,
    name: 'Sokolovi',
    category: 'M',
    members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }],
    ...overrides
  });

  const discipline = (overrides: Partial<Discipline> = {}): Discipline => ({
    id: 1,
    name: 'TRAP',
    category: 'M',
    maxPoints: 5,
    ...overrides
  });

  const result = (overrides: Partial<Result> = {}): Result => ({
    id: 1,
    competitorId: 1,
    disciplineId: 1,
    points: 3,
    ...overrides
  });

  beforeEach(() => {
    gateway = new FakeRealtimeDbGateway();
    TestBed.configureTestingModule({
      providers: [
        CompetitionService,
        ResultsVerificationService,
        { provide: RealtimeDbGateway, useValue: gateway }
      ]
    });
    competitionService = TestBed.inject(CompetitionService);
    service = TestBed.inject(ResultsVerificationService);
  });

  it('should report ok with no issues for clean, consistent data', () => {
    gateway.emit({
      teams: [team()],
      disciplines: [discipline()],
      results: [result()]
    });

    const verification = service.verify();

    expect(verification.ok).toBeTrue();
    expect(verification.issues).toEqual([]);
  });

  it('should flag two competitors on different teams that share the same id', () => {
    gateway.emit({
      teams: [
        team({ id: 1, members: [{ id: 5, firstName: 'Ivan', lastName: 'Horvat' }] }),
        team({ id: 2, name: 'Orlovi', members: [{ id: 5, firstName: 'Marko', lastName: 'Kos' }] })
      ],
      disciplines: [],
      results: []
    });

    const verification = service.verify();

    expect(verification.ok).toBeFalse();
    expect(verification.issues.some(i =>
      i.severity === 'error' && i.message.includes('Ivan Horvat') && i.message.includes('Marko Kos')
    )).toBeTrue();
  });

  it('should flag two teams that share the same id', () => {
    gateway.emit({
      teams: [
        team({ id: 1, name: 'Sokolovi' }),
        team({ id: 1, name: 'Orlovi', members: [{ id: 2, firstName: 'Marko', lastName: 'Kos' }] })
      ],
      disciplines: [],
      results: []
    });

    const verification = service.verify();

    expect(verification.issues.some(i =>
      i.severity === 'error' && i.message.includes('Sokolovi') && i.message.includes('Orlovi')
    )).toBeTrue();
  });

  it('should flag two disciplines that share the same id', () => {
    gateway.emit({
      teams: [],
      disciplines: [discipline({ id: 1, name: 'TRAP' }), discipline({ id: 1, name: 'PRAČKA' })],
      results: []
    });

    const verification = service.verify();

    expect(verification.issues.some(i =>
      i.severity === 'error' && i.message.includes('TRAP') && i.message.includes('PRAČKA')
    )).toBeTrue();
  });

  it('should flag two result records that share the same id', () => {
    gateway.emit({
      teams: [team()],
      disciplines: [discipline()],
      results: [result({ id: 1, competitorId: 1 }), result({ id: 1, competitorId: 1 })]
    });

    const verification = service.verify();

    expect(verification.issues.some(i =>
      i.severity === 'error' && i.message.includes('zapisa rezultata') && i.message.includes('ID (1)')
    )).toBeTrue();
  });

  it('should flag a duplicate result for the same competitor+discipline pair even with distinct result ids', () => {
    gateway.emit({
      teams: [team()],
      disciplines: [discipline()],
      results: [
        result({ id: 1, competitorId: 1, disciplineId: 1, points: 3 }),
        result({ id: 2, competitorId: 1, disciplineId: 1, points: 4 })
      ]
    });

    const verification = service.verify();

    expect(verification.issues.some(i =>
      i.severity === 'error' && i.message.includes('natjecatelja (ID 1)') && i.message.includes('disciplini (ID 1)')
    )).toBeTrue();
  });

  it('should flag a result referencing a competitor that does not exist as a warning', () => {
    gateway.emit({
      teams: [team()],
      disciplines: [discipline()],
      results: [result({ competitorId: 999 })]
    });

    const verification = service.verify();

    expect(verification.issues.some(i =>
      i.severity === 'warning' && i.message.includes('nepostojećeg natjecatelja (ID 999)')
    )).toBeTrue();
  });

  it('should flag a result referencing a discipline that does not exist as a warning', () => {
    gateway.emit({
      teams: [team()],
      disciplines: [discipline()],
      results: [result({ disciplineId: 999 })]
    });

    const verification = service.verify();

    expect(verification.issues.some(i =>
      i.severity === 'warning' && i.message.includes('nepostojeću disciplinu (ID 999)')
    )).toBeTrue();
  });

  it('should not flag rank sequencing when the individual ranking is a normal contiguous sequence', () => {
    gateway.emit({
      teams: [
        team({ id: 1, members: [{ id: 1, firstName: 'A', lastName: 'B' }] }),
        team({ id: 2, name: 'Orlovi', members: [{ id: 2, firstName: 'C', lastName: 'D' }] })
      ],
      disciplines: [discipline()],
      results: [
        result({ id: 1, competitorId: 1, disciplineId: 1, points: 5 }),
        result({ id: 2, competitorId: 2, disciplineId: 1, points: 3 })
      ]
    });

    const verification = service.verify();

    expect(verification.issues.some(i => i.message.includes('Rangovi'))).toBeFalse();
  });

  it('should flag a broken (non-contiguous) individual ranking rank sequence', () => {
    gateway.emit({ teams: [team()], disciplines: [discipline()], results: [] });
    spyOn(competitionService, 'getCompetitorRankings').and.returnValue([
      { rank: 1, competitor: { id: 1, firstName: 'A', lastName: 'B' }, team: 'T', disciplineScores: {}, totalPoints: 10 },
      { rank: 1, competitor: { id: 2, firstName: 'C', lastName: 'D' }, team: 'T', disciplineScores: {}, totalPoints: 10 }
    ]);

    const verification = service.verify();

    expect(verification.issues.some(i =>
      i.severity === 'error' && i.message.includes('Pojedinačni poredak')
    )).toBeTrue();
  });

  it('should flag a broken (non-contiguous) team ranking rank sequence', () => {
    gateway.emit({ teams: [team()], disciplines: [discipline()], results: [] });
    spyOn(competitionService, 'getTeamRankings').and.returnValue([
      { rank: 1, team: team({ id: 1 }), disciplineScores: {}, totalPoints: 10 },
      { rank: 3, team: team({ id: 2 }), disciplineScores: {}, totalPoints: 5 }
    ]);

    const verification = service.verify();

    expect(verification.issues.some(i =>
      i.severity === 'error' && i.message.includes('Ekipni poredak')
    )).toBeTrue();
  });
});
