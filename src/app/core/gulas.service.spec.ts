import { TestBed } from '@angular/core/testing';
import { GulasService } from './gulas.service';
import { RealtimeDbGateway } from './realtime-db.gateway';
import { FakeRealtimeDbGateway } from '../testing/fake-realtime-db.gateway';
import { GulasCompetitor, GulasCriteriaScores, GulasScore } from './models';

describe('GulasService', () => {
  let service: GulasService;
  let gateway: FakeRealtimeDbGateway;

  const competitor = (overrides: Partial<GulasCompetitor> = {}): GulasCompetitor => ({
    id: 1,
    codeName: 'JELEN',
    ...overrides
  });

  const criteria = (overrides: Partial<GulasCriteriaScores> = {}): GulasCriteriaScores => ({
    boja: 5,
    izgled: 4,
    gustoca: 5,
    okus: 9,
    dojam: 4,
    ...overrides
  });

  const score = (overrides: Partial<GulasScore> = {}): GulasScore => ({
    id: 1,
    competitorId: 1,
    judge: 1,
    criteria: criteria(),
    ...overrides
  });

  beforeEach(() => {
    gateway = new FakeRealtimeDbGateway();
    TestBed.configureTestingModule({
      providers: [
        GulasService,
        { provide: RealtimeDbGateway, useValue: gateway }
      ]
    });
    service = TestBed.inject(GulasService);
  });

  describe('loading data from Firebase', () => {
    it('should start with empty competitors and scores before any data arrives', () => {
      expect(service.value).toEqual({ competitors: [], scores: [] });
    });

    it('should populate state with the data pushed by the realtime listener', () => {
      const competitors = [competitor()];
      const scores = [score()];

      gateway.emit({ gulasCompetitors: competitors, gulasScores: scores });

      expect(service.value).toEqual({ competitors, scores });
    });

    it('should default missing collections to empty arrays when Firebase sends a partial snapshot', () => {
      gateway.emit({ gulasCompetitors: [competitor()] } as any);
      expect(service.value).toEqual({ competitors: [competitor()], scores: [] });
    });

    it('should leave state unchanged when Firebase sends a null snapshot', () => {
      gateway.emit({ gulasCompetitors: [competitor()], gulasScores: [] });
      gateway.emit(null);
      expect(service.value.competitors).toEqual([competitor()]);
    });

    it('should emit the updated state through state$ to subscribers', () => {
      const emissions: number[] = [];
      service.state$.subscribe(s => emissions.push(s.competitors.length));

      gateway.emit({ gulasCompetitors: [competitor()], gulasScores: [] });

      expect(emissions).toEqual([0, 1]);
    });
  });

  describe('addCompetitor', () => {
    it('should assign id 1 to the first competitor ever created', async () => {
      await service.addCompetitor('JELEN');

      const written = gateway.writes['gulasCompetitors'] as GulasCompetitor[];
      expect(written).toEqual([{ id: 1, codeName: 'JELEN' }]);
    });

    it('should assign the next id after existing competitors', async () => {
      gateway.emit({ gulasCompetitors: [competitor({ id: 5 })], gulasScores: [] });

      await service.addCompetitor('SRNA');

      const written = gateway.writes['gulasCompetitors'] as GulasCompetitor[];
      expect(written[written.length - 1]).toEqual({ id: 6, codeName: 'SRNA' });
    });

    it('should trim whitespace from the code name', async () => {
      await service.addCompetitor('  VUK  ');

      const written = gateway.writes['gulasCompetitors'] as GulasCompetitor[];
      expect(written[0].codeName).toBe('VUK');
    });
  });

  describe('updateCompetitor', () => {
    beforeEach(() => {
      gateway.emit({ gulasCompetitors: [competitor()], gulasScores: [] });
    });

    it('should update the code name of an existing competitor', async () => {
      const result = await service.updateCompetitor(1, 'LISICA');

      expect(result).toBe(true);
      const written = gateway.writes['gulasCompetitors'] as GulasCompetitor[];
      expect(written).toEqual([{ id: 1, codeName: 'LISICA' }]);
    });

    it('should trim whitespace from the new code name', async () => {
      await service.updateCompetitor(1, '  LISICA  ');
      const written = gateway.writes['gulasCompetitors'] as GulasCompetitor[];
      expect(written[0].codeName).toBe('LISICA');
    });

    it('should return false and write nothing for a non-existent id', async () => {
      const result = await service.updateCompetitor(999, 'NEPOSTOJI');

      expect(result).toBe(false);
      expect(gateway.writes['gulasCompetitors']).toBeUndefined();
    });
  });

  describe('deleteCompetitor', () => {
    it('should remove the competitor and cascade-delete all their scores atomically', async () => {
      gateway.emit({
        gulasCompetitors: [competitor({ id: 1 }), competitor({ id: 2, codeName: 'SRNA' })],
        gulasScores: [
          score({ id: 1, competitorId: 1, judge: 1 }),
          score({ id: 2, competitorId: 1, judge: 2 }),
          score({ id: 3, competitorId: 2, judge: 1 })
        ]
      });

      spyOn(gateway, 'setCollections').and.callThrough();
      spyOn(gateway, 'setCollection').and.callThrough();

      await service.deleteCompetitor(1);

      expect(gateway.writes['gulasCompetitors']).toEqual([competitor({ id: 2, codeName: 'SRNA' })]);
      expect(gateway.writes['gulasScores']).toEqual([score({ id: 3, competitorId: 2, judge: 1 })]);
      // Cascade must be a single atomic multi-path update, not two separate writes.
      expect(gateway.setCollections).toHaveBeenCalledTimes(1);
      expect(gateway.setCollection).not.toHaveBeenCalled();
    });

    it('should leave scores of other competitors untouched when the deleted competitor has none', async () => {
      gateway.emit({
        gulasCompetitors: [competitor({ id: 1 }), competitor({ id: 2 })],
        gulasScores: [score({ competitorId: 2 })]
      });

      await service.deleteCompetitor(1);

      expect(gateway.writes['gulasScores']).toEqual([score({ competitorId: 2 })]);
    });
  });

  describe('setScore', () => {
    it('should create a new score with id 1 for the first ever recorded score', async () => {
      await service.setScore(1, 1, criteria());

      const written = gateway.writes['gulasScores'] as GulasScore[];
      expect(written).toEqual([{ id: 1, competitorId: 1, judge: 1, criteria: criteria() }]);
    });

    it('should assign the next id after existing scores', async () => {
      gateway.emit({ gulasCompetitors: [], gulasScores: [score({ id: 7 })] });

      await service.setScore(2, 1, criteria());

      const written = gateway.writes['gulasScores'] as GulasScore[];
      expect(written[written.length - 1].id).toBe(8);
    });

    it('should upsert (overwrite) the existing score when the same competitor+judge pair is scored again', async () => {
      gateway.emit({ gulasCompetitors: [], gulasScores: [score({ id: 1, competitorId: 1, judge: 1 })] });

      const updated = criteria({ okus: 2 });
      await service.setScore(1, 1, updated);

      const written = gateway.writes['gulasScores'] as GulasScore[];
      expect(written.length).toBe(1);
      expect(written[0]).toEqual({ id: 1, competitorId: 1, judge: 1, criteria: updated });
    });

    it('should keep separate scores per judge for the same competitor', async () => {
      gateway.emit({ gulasCompetitors: [], gulasScores: [score({ id: 1, competitorId: 1, judge: 1 })] });

      await service.setScore(1, 2, criteria({ boja: 1 }));

      const written = gateway.writes['gulasScores'] as GulasScore[];
      expect(written.length).toBe(2);
      expect(written[1]).toEqual({ id: 2, competitorId: 1, judge: 2, criteria: criteria({ boja: 1 }) });
    });
  });

  describe('getCompetitors', () => {
    it('should return the current list of competitors', () => {
      gateway.emit({ gulasCompetitors: [competitor()], gulasScores: [] });
      expect(service.getCompetitors()).toEqual([competitor()]);
    });
  });

  describe('getScoreFor', () => {
    beforeEach(() => {
      gateway.emit({ gulasCompetitors: [], gulasScores: [score({ competitorId: 1, judge: 2 })] });
    });

    it('should return the matching score for a scored competitor+judge pair', () => {
      expect(service.getScoreFor(1, 2)).toEqual(score({ competitorId: 1, judge: 2 }));
    });

    it('should return undefined when that judge has not scored this competitor', () => {
      expect(service.getScoreFor(1, 1)).toBeUndefined();
      expect(service.getScoreFor(2, 2)).toBeUndefined();
    });
  });

  describe('getIncompleteCompetitors', () => {
    it('should list competitors missing at least one judge, with the judges who have scored', () => {
      gateway.emit({
        gulasCompetitors: [competitor({ id: 1 }), competitor({ id: 2, codeName: 'SRNA' })],
        gulasScores: [
          score({ id: 1, competitorId: 1, judge: 1 }),
          score({ id: 2, competitorId: 1, judge: 2 }),
          score({ id: 3, competitorId: 1, judge: 3 }),
          score({ id: 4, competitorId: 2, judge: 2 })
        ]
      });

      const incomplete = service.getIncompleteCompetitors();

      expect(incomplete.length).toBe(1);
      expect(incomplete[0].competitor.id).toBe(2);
      expect(incomplete[0].judgesScored).toEqual([2]);
    });

    it('should list a competitor with zero scores as fully incomplete', () => {
      gateway.emit({ gulasCompetitors: [competitor()], gulasScores: [] });

      const incomplete = service.getIncompleteCompetitors();

      expect(incomplete).toEqual([{ competitor: competitor(), judgesScored: [] }]);
    });

    it('should exclude competitors scored by all three judges', () => {
      gateway.emit({
        gulasCompetitors: [competitor()],
        gulasScores: [1, 2, 3].map(judge => score({ id: judge, judge: judge as 1 | 2 | 3 }))
      });

      expect(service.getIncompleteCompetitors()).toEqual([]);
    });
  });

  describe('getRankings', () => {
    it('should exclude competitors that do not yet have all three judges', () => {
      gateway.emit({
        gulasCompetitors: [competitor()],
        gulasScores: [score({ judge: 1 }), score({ id: 2, judge: 2 })]
      });

      expect(service.getRankings()).toEqual([]);
    });

    it('should sum each criterion across all three judges and compute the overall total', () => {
      gateway.emit({
        gulasCompetitors: [competitor()],
        gulasScores: [
          score({ id: 1, judge: 1, criteria: { boja: 5, izgled: 4, gustoca: 5, okus: 9, dojam: 4 } }),
          score({ id: 2, judge: 2, criteria: { boja: 4, izgled: 4, gustoca: 4, okus: 10, dojam: 4 } }),
          score({ id: 3, judge: 3, criteria: { boja: 3, izgled: 3, gustoca: 3, okus: 6, dojam: 3 } })
        ]
      });

      const rankings = service.getRankings();

      expect(rankings.length).toBe(1);
      expect(rankings[0].criteriaSums).toEqual({ boja: 12, izgled: 11, gustoca: 12, okus: 25, dojam: 11 });
      expect(rankings[0].totalPoints).toBe(71);
      expect(rankings[0].rank).toBe(1);
    });

    it('should sort completed competitors descending by total points and assign sequential ranks', () => {
      const complete = (id: number, base: number) => [1, 2, 3].map(judge => score({
        id: id * 10 + judge,
        competitorId: id,
        judge: judge as 1 | 2 | 3,
        criteria: { boja: base, izgled: base, gustoca: base, okus: base, dojam: base }
      }));

      gateway.emit({
        gulasCompetitors: [
          competitor({ id: 1, codeName: 'NIZAK' }),
          competitor({ id: 2, codeName: 'VISOK' }),
          competitor({ id: 3, codeName: 'SREDNJI' })
        ],
        gulasScores: [...complete(1, 1), ...complete(2, 5), ...complete(3, 3)]
      });

      const rankings = service.getRankings();

      expect(rankings.map(r => r.competitor.codeName)).toEqual(['VISOK', 'SREDNJI', 'NIZAK']);
      expect(rankings.map(r => r.rank)).toEqual([1, 2, 3]);
    });
  });

  describe('resetGulas', () => {
    it('should atomically clear both competitors and scores', async () => {
      gateway.emit({ gulasCompetitors: [competitor()], gulasScores: [score()] });
      spyOn(gateway, 'setCollections').and.callThrough();
      spyOn(gateway, 'setCollection').and.callThrough();

      await service.resetGulas();

      expect(gateway.writes['gulasCompetitors']).toEqual([]);
      expect(gateway.writes['gulasScores']).toEqual([]);
      expect(gateway.setCollections).toHaveBeenCalledTimes(1);
      expect(gateway.setCollection).not.toHaveBeenCalled();
    });
  });
});
