import { TestBed } from '@angular/core/testing';
import { CompetitionService } from './competition.service';
import { RealtimeDbGateway } from './realtime-db.gateway';
import { FakeRealtimeDbGateway } from '../testing/fake-realtime-db.gateway';
import { Team, Discipline, Result } from './models';

describe('CompetitionService', () => {
  let service: CompetitionService;
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

  beforeEach(() => {
    gateway = new FakeRealtimeDbGateway();
    TestBed.configureTestingModule({
      providers: [
        CompetitionService,
        { provide: RealtimeDbGateway, useValue: gateway }
      ]
    });
    service = TestBed.inject(CompetitionService);
  });

  describe('loading data from Firebase', () => {
    it('should start with empty teams, disciplines and results before any data arrives', () => {
      expect(service.value).toEqual({ teams: [], disciplines: [], results: [] });
    });

    it('should populate state with the data pushed by the realtime listener', () => {
      const teams = [team()];
      const disciplines = [discipline()];
      const results: Result[] = [{ id: 1, competitorId: 1, disciplineId: 1, points: 3 }];

      gateway.emit({ teams, disciplines, results });

      expect(service.value).toEqual({ teams, disciplines, results });
    });

    it('should default missing collections to empty arrays when Firebase sends a partial snapshot', () => {
      gateway.emit({ teams: [team()] } as any);

      expect(service.value).toEqual({ teams: [team()], disciplines: [], results: [] });
    });

    it('should leave state unchanged when Firebase sends a null snapshot (e.g. empty database)', () => {
      gateway.emit({ teams: [team()], disciplines: [], results: [] });
      gateway.emit(null);

      expect(service.value.teams).toEqual([team()]);
    });

    it('should emit the updated state through state$ to subscribers', () => {
      const emissions: number[] = [];
      service.state$.subscribe(s => emissions.push(s.teams.length));

      gateway.emit({ teams: [team()], disciplines: [], results: [] });

      expect(emissions).toEqual([0, 1]);
    });
  });

  describe('addTeam', () => {
    it('should assign id 1 to the first team ever created', async () => {
      await service.addTeam('Sokolovi', 'M', []);

      const written = gateway.writes['teams'] as Team[];
      expect(written[0].id).toBe(1);
    });

    it('should assign the next sequential id based on the highest existing team id', async () => {
      gateway.emit({ teams: [team({ id: 5 }), team({ id: 2, members: [] })], disciplines: [], results: [] });

      await service.addTeam('Orlovi', 'Ž', []);

      const written = gateway.writes['teams'] as Team[];
      expect(written[2].id).toBe(6);
    });

    it('should trim whitespace from the team name', async () => {
      await service.addTeam('  Sokolovi  ', 'M', []);

      const written = gateway.writes['teams'] as Team[];
      expect(written[0].name).toBe('Sokolovi');
    });

    it('should assign sequential member ids continuing from the highest id already used across all teams', async () => {
      gateway.emit({
        teams: [team({ id: 1, members: [{ id: 1, firstName: 'A', lastName: 'A' }, { id: 4, firstName: 'B', lastName: 'B' }] })],
        disciplines: [],
        results: []
      });

      await service.addTeam('Novi Tim', 'M', [
        { id: 0, firstName: 'Marko', lastName: 'Kos' },
        { id: 0, firstName: 'Ana', lastName: 'Ban' }
      ]);

      const written = gateway.writes['teams'] as Team[];
      const newTeam = written[1];
      expect(newTeam.members.map(m => m.id)).toEqual([5, 6]);
    });

    it('should write the write to the "teams" collection only, not touch results or disciplines', async () => {
      await service.addTeam('Sokolovi', 'M', []);

      expect(gateway.writeCalls.map(c => c.path)).toEqual(['teams']);
    });

    it('BUSINESS RULE (known limitation): two rapid addTeam calls made before Firebase echoes back compute the same id', async () => {
      // The service computes the next id from its own in-memory snapshot, which only updates
      // once Firebase pushes data back through observeRoot. Firing two writes back-to-back
      // without an intervening emit() reproduces a real race the production code does not guard against.
      const p1 = service.addTeam('Tim A', 'M', []);
      const p2 = service.addTeam('Tim B', 'M', []);
      await Promise.all([p1, p2]);

      const firstWriteTeams = gateway.writeCalls[0].value as Team[];
      const secondWriteTeams = gateway.writeCalls[1].value as Team[];
      expect(firstWriteTeams[0].id).toBe(1);
      expect(secondWriteTeams[0].id).toBe(1);
    });
  });

  describe('updateTeam', () => {
    beforeEach(() => {
      gateway.emit({ teams: [team({ id: 1 }), team({ id: 2, name: 'Orlovi' })], disciplines: [], results: [] });
    });

    it('should return false and make no write when the team does not exist', async () => {
      const result = await service.updateTeam(999, 'Ne Postoji', 'M');

      expect(result).toBe(false);
      expect(gateway.writeCalls.length).toBe(0);
    });

    it('should return true and persist the renamed team when it exists', async () => {
      const result = await service.updateTeam(1, 'Sokolovi Novi', 'M');

      expect(result).toBe(true);
      const written = gateway.writes['teams'] as Team[];
      expect(written.find(t => t.id === 1)!.name).toBe('Sokolovi Novi');
    });

    it('should keep the existing members when no members array is provided', async () => {
      await service.updateTeam(1, 'Sokolovi', 'M');

      const written = gateway.writes['teams'] as Team[];
      expect(written.find(t => t.id === 1)!.members).toEqual(team().members);
    });

    it('should replace members when a new members array is provided', async () => {
      const newMembers = [{ id: 99, firstName: 'Novi', lastName: 'Clan' }];
      await service.updateTeam(1, 'Sokolovi', 'M', newMembers);

      const written = gateway.writes['teams'] as Team[];
      expect(written.find(t => t.id === 1)!.members).toEqual(newMembers);
    });

    it('should write teams and results atomically in one setCollections call when a member is removed, never as two separate setCollection calls', async () => {
      spyOn(gateway, 'setCollections').and.callThrough();
      spyOn(gateway, 'setCollection').and.callThrough();

      await service.updateTeam(1, 'Sokolovi', 'M', []);

      expect(gateway.setCollections).toHaveBeenCalledTimes(1);
      expect(gateway.setCollection).not.toHaveBeenCalled();
    });

    it('should write only teams (not results) when no member was removed', async () => {
      await service.updateTeam(1, 'Sokolovi', 'M');

      expect(gateway.writeCalls.map(c => c.path)).toEqual(['teams']);
    });
  });

  describe('addCompetitorToTeam', () => {
    it('should return false when the team does not exist', async () => {
      const result = await service.addCompetitorToTeam(999, 'Ivo', 'Ivic');
      expect(result).toBe(false);
    });

    it('should return false and refuse to add a 4th member (max team size is 3)', async () => {
      gateway.emit({
        teams: [team({
          members: [
            { id: 1, firstName: 'A', lastName: 'A' },
            { id: 2, firstName: 'B', lastName: 'B' },
            { id: 3, firstName: 'C', lastName: 'C' }
          ]
        })],
        disciplines: [],
        results: []
      });

      const result = await service.addCompetitorToTeam(1, 'Cetvrti', 'Clan');

      expect(result).toBe(false);
      expect(gateway.writeCalls.length).toBe(0);
    });

    it('should add a member with a new sequential id and trimmed name when under the limit', async () => {
      gateway.emit({ teams: [team({ members: [{ id: 1, firstName: 'A', lastName: 'A' }] })], disciplines: [], results: [] });

      const result = await service.addCompetitorToTeam(1, '  Marko  ', '  Kos  ');

      expect(result).toBe(true);
      const written = gateway.writes['teams'] as Team[];
      const addedMember = written[0].members[1];
      expect(addedMember).toEqual({ id: 2, firstName: 'Marko', lastName: 'Kos' });
    });

    it('should leave every other team untouched when adding a member to one team', async () => {
      const otherTeam = team({ id: 2, name: 'Orlovi', members: [{ id: 2, firstName: 'B', lastName: 'B' }] });
      gateway.emit({ teams: [team({ id: 1, members: [{ id: 1, firstName: 'A', lastName: 'A' }] }), otherTeam], disciplines: [], results: [] });

      await service.addCompetitorToTeam(1, 'Marko', 'Kos');

      const written = gateway.writes['teams'] as Team[];
      expect(written.find(t => t.id === 2)).toEqual(otherTeam);
    });
  });

  describe('addResult', () => {
    it('should create a new result with the next sequential id when none exists for that competitor/discipline', async () => {
      gateway.emit({ teams: [], disciplines: [], results: [{ id: 3, competitorId: 9, disciplineId: 9, points: 1 }] });

      await service.addResult(1, 1, 4);

      const written = gateway.writes['results'] as Result[];
      expect(written).toContain({ id: 4, competitorId: 1, disciplineId: 1, points: 4 } as Result);
    });

    it('should upsert (overwrite points, keep same id) when a result already exists for the same competitor+discipline', async () => {
      gateway.emit({ teams: [], disciplines: [], results: [{ id: 1, competitorId: 1, disciplineId: 1, points: 2 }] });

      await service.addResult(1, 1, 5);

      const written = gateway.writes['results'] as Result[];
      expect(written.length).toBe(1);
      expect(written[0]).toEqual({ id: 1, competitorId: 1, disciplineId: 1, points: 5 });
    });

    it('should not create duplicate result entries for the same competitor in the same discipline', async () => {
      gateway.emit({ teams: [], disciplines: [], results: [{ id: 1, competitorId: 1, disciplineId: 1, points: 2 }] });

      await service.addResult(1, 1, 5);

      const written = gateway.writes['results'] as Result[];
      const forThisCompetitorAndDiscipline = written.filter(r => r.competitorId === 1 && r.disciplineId === 1);
      expect(forThisCompetitorAndDiscipline.length).toBe(1);
    });
  });

  describe('updateResult', () => {
    it('should make no write when the result id does not exist', async () => {
      gateway.emit({ teams: [], disciplines: [], results: [] });

      await service.updateResult(999, 1, 1, 5);

      expect(gateway.writeCalls.length).toBe(0);
    });

    it('should overwrite the result fields when the id exists', async () => {
      gateway.emit({ teams: [], disciplines: [], results: [{ id: 1, competitorId: 1, disciplineId: 1, points: 2 }] });

      await service.updateResult(1, 2, 3, 9);

      const written = gateway.writes['results'] as Result[];
      expect(written[0]).toEqual({ id: 1, competitorId: 2, disciplineId: 3, points: 9 });
    });
  });

  describe('deleteTeam', () => {
    it('should remove the team and cascade-delete all results belonging to its members', async () => {
      gateway.emit({
        teams: [
          team({ id: 1, members: [{ id: 1, firstName: 'A', lastName: 'A' }, { id: 2, firstName: 'B', lastName: 'B' }] }),
          team({ id: 2, members: [{ id: 3, firstName: 'C', lastName: 'C' }] })
        ],
        disciplines: [],
        results: [
          { id: 1, competitorId: 1, disciplineId: 1, points: 5 },
          { id: 2, competitorId: 3, disciplineId: 1, points: 5 }
        ]
      });

      await service.deleteTeam(1);

      const remainingTeams = gateway.writes['teams'] as Team[];
      const remainingResults = gateway.writes['results'] as Result[];
      expect(remainingTeams.map(t => t.id)).toEqual([2]);
      expect(remainingResults.map(r => r.id)).toEqual([2]);
    });

    it('should be a no-op on results when deleting a team that has no results recorded', async () => {
      gateway.emit({ teams: [team({ id: 1 })], disciplines: [], results: [] });

      await service.deleteTeam(1);

      expect(gateway.writes['results']).toEqual([]);
    });

    it('should write teams and results atomically in one setCollections call, never as two separate setCollection calls', async () => {
      gateway.emit({ teams: [team({ id: 1 })], disciplines: [], results: [] });
      spyOn(gateway, 'setCollections').and.callThrough();
      spyOn(gateway, 'setCollection').and.callThrough();

      await service.deleteTeam(1);

      expect(gateway.setCollections).toHaveBeenCalledTimes(1);
      expect(gateway.setCollection).not.toHaveBeenCalled();
    });
  });

  describe('removeCompetitorFromTeam', () => {
    it('should remove only the targeted competitor from their team and delete their results', async () => {
      const otherTeam = team({ id: 2, name: 'Orlovi', members: [{ id: 3, firstName: 'C', lastName: 'C' }] });
      gateway.emit({
        teams: [
          team({ id: 1, members: [{ id: 1, firstName: 'A', lastName: 'A' }, { id: 2, firstName: 'B', lastName: 'B' }] }),
          otherTeam
        ],
        disciplines: [],
        results: [
          { id: 1, competitorId: 1, disciplineId: 1, points: 5 },
          { id: 2, competitorId: 2, disciplineId: 1, points: 3 }
        ]
      });

      await service.removeCompetitorFromTeam(1, 1);

      const teams = gateway.writes['teams'] as Team[];
      const results = gateway.writes['results'] as Result[];
      expect(teams.find(t => t.id === 1)!.members.map(m => m.id)).toEqual([2]);
      expect(teams.find(t => t.id === 2)).toEqual(otherTeam);
      expect(results.map(r => r.id)).toEqual([2]);
    });

    it('should write teams and results atomically in one setCollections call, never as two separate setCollection calls', async () => {
      gateway.emit({ teams: [team({ id: 1 })], disciplines: [], results: [] });
      spyOn(gateway, 'setCollections').and.callThrough();
      spyOn(gateway, 'setCollection').and.callThrough();

      await service.removeCompetitorFromTeam(1, 1);

      expect(gateway.setCollections).toHaveBeenCalledTimes(1);
      expect(gateway.setCollection).not.toHaveBeenCalled();
    });
  });

  describe('deleteResult', () => {
    it('should remove only the specified result, leaving others untouched', async () => {
      gateway.emit({
        teams: [], disciplines: [], results: [
          { id: 1, competitorId: 1, disciplineId: 1, points: 5 },
          { id: 2, competitorId: 2, disciplineId: 1, points: 3 }
        ]
      });

      await service.deleteResult(1);

      const results = gateway.writes['results'] as Result[];
      expect(results.map(r => r.id)).toEqual([2]);
    });
  });

  describe('resetCompetition', () => {
    it('should clear teams and results but leave disciplines untouched', async () => {
      gateway.emit({
        teams: [team({ id: 1 })],
        disciplines: [discipline({ id: 1 })],
        results: [{ id: 1, competitorId: 1, disciplineId: 1, points: 5 }]
      });

      await service.resetCompetition();

      expect(gateway.writes['teams']).toEqual([]);
      expect(gateway.writes['results']).toEqual([]);
      expect(gateway.writes['disciplines']).toBeUndefined();
    });

    it('should write teams and results atomically in one setCollections call, never as two separate setCollection calls', async () => {
      gateway.emit({ teams: [team({ id: 1 })], disciplines: [discipline()], results: [] });
      spyOn(gateway, 'setCollections').and.callThrough();
      spyOn(gateway, 'setCollection').and.callThrough();

      await service.resetCompetition();

      expect(gateway.setCollections).toHaveBeenCalledTimes(1);
      expect(gateway.setCollection).not.toHaveBeenCalled();
    });
  });

  describe('discipline management', () => {
    it('addDiscipline should assign the next sequential id, trim the name, and persist maxPoints', async () => {
      gateway.emit({ teams: [], disciplines: [discipline({ id: 3 })], results: [] });

      await service.addDiscipline('  PIKADO  ', 'Ž', 300);

      const written = gateway.writes['disciplines'] as Discipline[];
      expect(written[1]).toEqual({ id: 4, name: 'PIKADO', category: 'Ž', maxPoints: 300 });
    });

    it('updateDiscipline should return false when the discipline does not exist', async () => {
      const result = await service.updateDiscipline(999, 'X', 'M', 100);
      expect(result).toBe(false);
    });

    it('updateDiscipline should update name/category/maxPoints in place, preserving the id', async () => {
      gateway.emit({ teams: [], disciplines: [discipline({ id: 1, name: 'TRAP' })], results: [] });

      const result = await service.updateDiscipline(1, 'TRAP NOVI', 'M', 8);

      expect(result).toBe(true);
      const written = gateway.writes['disciplines'] as Discipline[];
      expect(written[0]).toEqual({ id: 1, name: 'TRAP NOVI', category: 'M', maxPoints: 8 });
    });

    it('deleteDiscipline should remove the discipline and cascade-delete results recorded in it', async () => {
      gateway.emit({
        teams: [],
        disciplines: [discipline({ id: 1 }), discipline({ id: 2, name: 'PRAČKA' })],
        results: [
          { id: 1, competitorId: 1, disciplineId: 1, points: 5 },
          { id: 2, competitorId: 1, disciplineId: 2, points: 3 }
        ]
      });

      await service.deleteDiscipline(1);

      const disciplines = gateway.writes['disciplines'] as Discipline[];
      const results = gateway.writes['results'] as Result[];
      expect(disciplines.map(d => d.id)).toEqual([2]);
      expect(results.map(r => r.id)).toEqual([2]);
    });

    it('deleteDiscipline should write disciplines and results atomically in one setCollections call, never as two separate setCollection calls', async () => {
      gateway.emit({ teams: [], disciplines: [discipline({ id: 1 })], results: [] });
      spyOn(gateway, 'setCollections').and.callThrough();
      spyOn(gateway, 'setCollection').and.callThrough();

      await service.deleteDiscipline(1);

      expect(gateway.setCollections).toHaveBeenCalledTimes(1);
      expect(gateway.setCollection).not.toHaveBeenCalled();
    });
  });

  describe('calculateTotalPoints', () => {
    const mensDisciplines: Discipline[] = [
      discipline({ id: 1, name: 'TRAP', category: 'M', maxPoints: 5 }),
      discipline({ id: 2, name: 'ZRAČNA PUŠKA', category: 'M', maxPoints: 50 }),
      discipline({ id: 3, name: 'PRAČKA', category: 'M', maxPoints: 5 })
    ];
    const womensDisciplines: Discipline[] = [
      discipline({ id: 4, name: 'ZRAČNA PUŠKA', category: 'Ž', maxPoints: 50 }),
      discipline({ id: 5, name: 'PRAČKA', category: 'Ž', maxPoints: 5 }),
      discipline({ id: 6, name: 'PIKADO', category: 'Ž', maxPoints: 300 })
    ];

    it('should apply the men\'s formula: TRAP×20 + ZRAČNA PUŠKA×2 + PRAČKA×20', () => {
      gateway.emit({ teams: [], disciplines: mensDisciplines, results: [] });

      const total = service.calculateTotalPoints(
        { 'TRAP': 5, 'ZRAČNA PUŠKA': 50, 'PRAČKA': 5 },
        'M'
      );
      expect(total).toBe(300); // 100 + 100 + 100
    });

    it('should apply the women\'s formula, scoring every discipline at its exact max (100/maxPoints), not a rounded coefficient', () => {
      gateway.emit({ teams: [], disciplines: womensDisciplines, results: [] });

      const total = service.calculateTotalPoints(
        { 'ZRAČNA PUŠKA': 50, 'PRAČKA': 5, 'PIKADO': 300 },
        'Ž'
      );
      // Previously PIKADO used a rounded ×0.33 coefficient, capping its max contribution at 99
      // instead of 100. Deriving the coefficient from maxPoints (100/300) fixes that rounding gap.
      expect(total).toBe(300); // 100 + 100 + 100
    });

    it('should treat missing discipline scores as zero rather than throwing', () => {
      gateway.emit({ teams: [], disciplines: mensDisciplines, results: [] });

      const total = service.calculateTotalPoints({}, 'M');
      expect(total).toBe(0);
    });

    it('should round the total to 2 decimal places', () => {
      gateway.emit({ teams: [], disciplines: womensDisciplines, results: [] });

      const total = service.calculateTotalPoints({ 'PIKADO': 1 }, 'Ž');
      expect(total).toBe(0.33);
    });

    it('should ignore discipline scores that are not configured for the category', () => {
      gateway.emit({ teams: [], disciplines: mensDisciplines, results: [] });

      const total = service.calculateTotalPoints({ 'IRRELEVANT': 1000 }, 'M');
      expect(total).toBe(0);
    });

    it('should return 0 when no disciplines are configured for the category', () => {
      const total = service.calculateTotalPoints({ 'TRAP': 5 }, 'M');
      expect(total).toBe(0);
    });

    it('should score any discipline configured for the category by its own maxPoints, not just the four legacy names', () => {
      gateway.emit({
        teams: [],
        disciplines: [discipline({ id: 7, name: 'NOVA DISCIPLINA', category: 'M', maxPoints: 25 })],
        results: []
      });

      const total = service.calculateTotalPoints({ 'NOVA DISCIPLINA': 25 }, 'M');
      expect(total).toBe(100);
    });
  });

  describe('getCompetitorRankings', () => {
    beforeEach(() => {
      gateway.emit({
        teams: [
          team({
            id: 1, category: 'M', name: 'Sokolovi',
            members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }, { id: 2, firstName: 'Marko', lastName: 'Kos' }]
          }),
          team({
            id: 2, category: 'Ž', name: 'Orlice',
            members: [{ id: 3, firstName: 'Ana', lastName: 'Ban' }]
          })
        ],
        disciplines: [
          discipline({ id: 1, name: 'TRAP', category: 'M' }),
          discipline({ id: 2, name: 'ZRAČNA PUŠKA', category: 'M', maxPoints: 50 }),
          discipline({ id: 3, name: 'PIKADO', category: 'Ž', maxPoints: 300 })
        ],
        results: [
          { id: 1, competitorId: 1, disciplineId: 1, points: 5 },  // Ivan: TRAP 5 -> 100
          { id: 2, competitorId: 2, disciplineId: 1, points: 2 },  // Marko: TRAP 2 -> 40
          { id: 3, competitorId: 3, disciplineId: 3, points: 300 } // Ana: PIKADO 300 -> 99
        ]
      });
    });

    it('should rank competitors in descending order of total points', () => {
      const rankings = service.getCompetitorRankings();
      expect(rankings.map(r => r.competitor.firstName)).toEqual(['Ivan', 'Ana', 'Marko']);
    });

    it('should assign rank 1 to the top scorer and increment sequentially', () => {
      const rankings = service.getCompetitorRankings();
      expect(rankings.map(r => r.rank)).toEqual([1, 2, 3]);
    });

    it('should default a competitor\'s missing discipline result to 0 rather than omitting the column', () => {
      const rankings = service.getCompetitorRankings('M');
      const ivan = rankings.find(r => r.competitor.firstName === 'Ivan')!;
      expect(ivan.disciplineScores['ZRAČNA PUŠKA']).toBe(0);
    });

    it('should only include competitors from teams in the requested category when filtered', () => {
      const rankings = service.getCompetitorRankings('Ž');
      expect(rankings.map(r => r.competitor.firstName)).toEqual(['Ana']);
    });

    it('should return an empty ranking list when there are no teams', () => {
      gateway.emit({ teams: [], disciplines: [], results: [] });
      expect(service.getCompetitorRankings()).toEqual([]);
    });

    it('should attach the correct team display name to each competitor', () => {
      const rankings = service.getCompetitorRankings('M');
      expect(rankings.every(r => r.team === 'Sokolovi')).toBe(true);
    });
  });

  describe('tie-breaking on equal totalPoints', () => {
    it('should rank the man with the better TRAP score first when totalPoints are equal', () => {
      gateway.emit({
        teams: [
          team({
            id: 1, category: 'M', name: 'Sokolovi',
            members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }, { id: 2, firstName: 'Marko', lastName: 'Kos' }]
          })
        ],
        disciplines: [
          discipline({ id: 1, name: 'TRAP', category: 'M', maxPoints: 5 }),
          discipline({ id: 2, name: 'ZRAČNA PUŠKA', category: 'M', maxPoints: 50 })
        ],
        results: [
          // Ivan: TRAP 0 (0) + ZRAČNA 20 (40) = 40
          { id: 1, competitorId: 1, disciplineId: 1, points: 0 },
          { id: 2, competitorId: 1, disciplineId: 2, points: 20 },
          // Marko: TRAP 2 (40) + ZRAČNA 0 (0) = 40 -- same total, better TRAP
          { id: 3, competitorId: 2, disciplineId: 1, points: 2 },
          { id: 4, competitorId: 2, disciplineId: 2, points: 0 }
        ]
      });

      const rankings = service.getCompetitorRankings('M');
      expect(rankings.map(r => r.competitor.firstName)).toEqual(['Marko', 'Ivan']);
      expect(rankings.map(r => r.rank)).toEqual([1, 2]);
      const marko = rankings.find(r => r.competitor.firstName === 'Marko')!;
      const ivan = rankings.find(r => r.competitor.firstName === 'Ivan')!;
      expect(marko.tieNote).toContain('Ivan Horvat (TRAP 2:0)');
      expect(marko.tieNote).toContain('Poredak riješen prema navedenim disciplinama');
      expect(ivan.tieNote).toContain('Marko Kos (TRAP 0:2)');
    });

    it('should cascade to PRAČKA when TRAP is also tied (2nd tiebreak level)', () => {
      gateway.emit({
        teams: [
          team({
            id: 1, category: 'M', name: 'Sokolovi',
            members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }, { id: 2, firstName: 'Marko', lastName: 'Kos' }]
          })
        ],
        disciplines: [
          discipline({ id: 1, name: 'TRAP', category: 'M', maxPoints: 5 }),
          discipline({ id: 2, name: 'PRAČKA', category: 'M', maxPoints: 5 }),
          discipline({ id: 3, name: 'ZRAČNA PUŠKA', category: 'M', maxPoints: 50 })
        ],
        results: [
          // Ivan: TRAP 1 (20) + PRAČKA 0 (0) + ZRAČNA 40 (80) = 100
          { id: 1, competitorId: 1, disciplineId: 1, points: 1 },
          { id: 2, competitorId: 1, disciplineId: 2, points: 0 },
          { id: 3, competitorId: 1, disciplineId: 3, points: 40 },
          // Marko: TRAP 1 (20) + PRAČKA 4 (80) + ZRAČNA 0 (0) = 100 -- same total, same TRAP, better PRAČKA
          { id: 4, competitorId: 2, disciplineId: 1, points: 1 },
          { id: 5, competitorId: 2, disciplineId: 2, points: 4 },
          { id: 6, competitorId: 2, disciplineId: 3, points: 0 }
        ]
      });

      const rankings = service.getCompetitorRankings('M');
      expect(rankings.map(r => r.competitor.firstName)).toEqual(['Marko', 'Ivan']);
      const marko = rankings.find(r => r.competitor.firstName === 'Marko')!;
      const ivan = rankings.find(r => r.competitor.firstName === 'Ivan')!;
      expect(marko.tieNote).toContain('Ivan Horvat (PRAČKA 4:0)');
      expect(marko.tieNote).toContain('Poredak riješen prema navedenim disciplinama');
      expect(ivan.tieNote).toContain('Marko Kos (PRAČKA 0:4)');
    });

    it('should mark both competitors as unresolved (proizvoljan poredak) when even the TRAP score is identical', () => {
      gateway.emit({
        teams: [
          team({
            id: 1, category: 'M', name: 'Sokolovi',
            members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }, { id: 2, firstName: 'Marko', lastName: 'Kos' }]
          })
        ],
        disciplines: [discipline({ id: 1, name: 'TRAP', category: 'M', maxPoints: 5 })],
        results: [
          { id: 1, competitorId: 1, disciplineId: 1, points: 2 },
          { id: 2, competitorId: 2, disciplineId: 1, points: 2 }
        ]
      });

      const rankings = service.getCompetitorRankings('M');
      expect(rankings.every(r => r.tieNote?.includes('proizvoljan'))).toBe(true);
      expect(rankings.every(r => r.tieNote?.includes('identičan rezultat u disciplinama TRAP, PRAČKA, ZRAČNA PUŠKA'))).toBe(true);
    });

    it('should not set a tieNote for competitors with a unique totalPoints', () => {
      gateway.emit({
        teams: [
          team({
            id: 1, category: 'M', name: 'Sokolovi',
            members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }, { id: 2, firstName: 'Marko', lastName: 'Kos' }]
          })
        ],
        disciplines: [discipline({ id: 1, name: 'TRAP', category: 'M', maxPoints: 5 })],
        results: [
          { id: 1, competitorId: 1, disciplineId: 1, points: 5 },
          { id: 2, competitorId: 2, disciplineId: 1, points: 1 }
        ]
      });

      const rankings = service.getCompetitorRankings('M');
      expect(rankings.every(r => r.tieNote === undefined)).toBe(true);
    });

    it('should flag only the genuinely-identical pair within a 3-way tie, not the whole group', () => {
      // Ivan (TRAP 2) is fully separated; Vinko and Filip both have TRAP 0 and remain
      // genuinely tied with each other even after applying the TRAP tiebreak.
      gateway.emit({
        teams: [
          team({
            id: 1, category: 'M', name: 'Sokolovi',
            members: [
              { id: 1, firstName: 'Ivan', lastName: 'Miser' },
              { id: 2, firstName: 'Vinko', lastName: 'Pongrac' },
              { id: 3, firstName: 'Filip', lastName: 'Sulj' }
            ]
          })
        ],
        disciplines: [
          discipline({ id: 1, name: 'TRAP', category: 'M', maxPoints: 5 }),
          discipline({ id: 2, name: 'ZRAČNA PUŠKA', category: 'M', maxPoints: 50 })
        ],
        results: [
          { id: 1, competitorId: 1, disciplineId: 1, points: 2 },
          { id: 2, competitorId: 1, disciplineId: 2, points: 0 },
          { id: 3, competitorId: 2, disciplineId: 1, points: 0 },
          { id: 4, competitorId: 2, disciplineId: 2, points: 20 },
          { id: 5, competitorId: 3, disciplineId: 1, points: 0 },
          { id: 6, competitorId: 3, disciplineId: 2, points: 20 }
        ]
      });

      const rankings = service.getCompetitorRankings('M');
      const ivan = rankings.find(r => r.competitor.firstName === 'Ivan')!;
      const vinko = rankings.find(r => r.competitor.firstName === 'Vinko')!;
      const filip = rankings.find(r => r.competitor.firstName === 'Filip')!;

      expect(ivan.tieNote).toContain('Poredak riješen prema navedenim disciplinama');
      expect(ivan.tieNote).not.toContain('proizvoljan');

      expect(vinko.tieNote).toContain('osim u odnosu na Filip Sulj');
      expect(vinko.tieNote).toContain('poredak je proizvoljan');
      expect(filip.tieNote).toContain('osim u odnosu na Vinko Pongrac');
    });

    it('should rank the woman with the better PRAČKA score first when totalPoints are equal', () => {
      gateway.emit({
        teams: [
          team({
            id: 2, category: 'Ž', name: 'Orlice',
            members: [{ id: 1, firstName: 'Ana', lastName: 'Ban' }, { id: 2, firstName: 'Iva', lastName: 'Novak' }]
          })
        ],
        disciplines: [
          discipline({ id: 1, name: 'PRAČKA', category: 'Ž', maxPoints: 5 }),
          discipline({ id: 2, name: 'PIKADO', category: 'Ž', maxPoints: 300 })
        ],
        results: [
          // Ana: PRAČKA 0 (0) + PIKADO 150 (50) = 50
          { id: 1, competitorId: 1, disciplineId: 1, points: 0 },
          { id: 2, competitorId: 1, disciplineId: 2, points: 150 },
          // Iva: PRAČKA 2 (40) + PIKADO 30 (10) = 50 -- same total, better PRAČKA
          { id: 3, competitorId: 2, disciplineId: 1, points: 2 },
          { id: 4, competitorId: 2, disciplineId: 2, points: 30 }
        ]
      });

      const rankings = service.getCompetitorRankings('Ž');
      expect(rankings.map(r => r.competitor.firstName)).toEqual(['Iva', 'Ana']);
      const ana = rankings.find(r => r.competitor.firstName === 'Ana')!;
      const iva = rankings.find(r => r.competitor.firstName === 'Iva')!;
      expect(iva.tieNote).toContain('Ana Ban (PRAČKA 2:0)');
      expect(iva.tieNote).toContain('Poredak riješen prema navedenim disciplinama');
      expect(ana.tieNote).toContain('Iva Novak (PRAČKA 0:2)');
    });

    it('should cascade to ZRAČNA PUŠKA when PRAČKA is also tied (2nd tiebreak level)', () => {
      gateway.emit({
        teams: [
          team({
            id: 2, category: 'Ž', name: 'Orlice',
            members: [{ id: 1, firstName: 'Ana', lastName: 'Ban' }, { id: 2, firstName: 'Iva', lastName: 'Novak' }]
          })
        ],
        disciplines: [
          discipline({ id: 1, name: 'PRAČKA', category: 'Ž', maxPoints: 5 }),
          discipline({ id: 2, name: 'ZRAČNA PUŠKA', category: 'Ž', maxPoints: 50 }),
          discipline({ id: 3, name: 'PIKADO', category: 'Ž', maxPoints: 300 })
        ],
        results: [
          // Ana: PRAČKA 1 (20) + ZRAČNA 10 (20) + PIKADO 180 (60) = 100
          { id: 1, competitorId: 1, disciplineId: 1, points: 1 },
          { id: 2, competitorId: 1, disciplineId: 2, points: 10 },
          { id: 3, competitorId: 1, disciplineId: 3, points: 180 },
          // Iva: PRAČKA 1 (20) + ZRAČNA 30 (60) + PIKADO 60 (20) = 100 -- same total, same PRAČKA, better ZRAČNA
          { id: 4, competitorId: 2, disciplineId: 1, points: 1 },
          { id: 5, competitorId: 2, disciplineId: 2, points: 30 },
          { id: 6, competitorId: 2, disciplineId: 3, points: 60 }
        ]
      });

      const rankings = service.getCompetitorRankings('Ž');
      expect(rankings.map(r => r.competitor.firstName)).toEqual(['Iva', 'Ana']);
      const ana = rankings.find(r => r.competitor.firstName === 'Ana')!;
      const iva = rankings.find(r => r.competitor.firstName === 'Iva')!;
      expect(iva.tieNote).toContain('Ana Ban (ZRAČNA PUŠKA 30:10)');
      expect(iva.tieNote).toContain('Poredak riješen prema navedenim disciplinama');
      expect(ana.tieNote).toContain('Iva Novak (ZRAČNA PUŠKA 10:30)');
    });

    it('should mark both women as unresolved when even PRAČKA is identical', () => {
      gateway.emit({
        teams: [
          team({
            id: 2, category: 'Ž', name: 'Orlice',
            members: [{ id: 1, firstName: 'Ana', lastName: 'Ban' }, { id: 2, firstName: 'Iva', lastName: 'Novak' }]
          })
        ],
        disciplines: [
          discipline({ id: 1, name: 'PRAČKA', category: 'Ž', maxPoints: 5 }),
          discipline({ id: 2, name: 'PIKADO', category: 'Ž', maxPoints: 300 })
        ],
        results: [
          { id: 1, competitorId: 1, disciplineId: 1, points: 1 },
          { id: 2, competitorId: 2, disciplineId: 1, points: 1 }
        ]
      });

      const rankings = service.getCompetitorRankings('Ž');
      expect(rankings.every(r => r.tieNote?.includes('proizvoljan'))).toBe(true);
      expect(rankings.every(r => r.tieNote?.includes('identičan rezultat u disciplinama PRAČKA, ZRAČNA PUŠKA, PIKADO'))).toBe(true);
    });

    it('should fall back to an arbitrary order when the discipline set has neither TRAP nor PRAČKA', () => {
      gateway.emit({
        teams: [
          team({
            id: 2, category: 'Ž', name: 'Orlice',
            members: [{ id: 1, firstName: 'Ana', lastName: 'Ban' }, { id: 2, firstName: 'Iva', lastName: 'Novak' }]
          })
        ],
        disciplines: [
          discipline({ id: 1, name: 'PIKADO', category: 'Ž', maxPoints: 300 })
        ],
        results: [
          { id: 1, competitorId: 1, disciplineId: 1, points: 150 },
          { id: 2, competitorId: 2, disciplineId: 1, points: 150 }
        ]
      });

      const rankings = service.getCompetitorRankings('Ž');
      expect(rankings.map(r => r.totalPoints)).toEqual([50, 50]);
      expect(rankings.map(r => r.competitor.firstName)).toEqual(['Ana', 'Iva']);
      expect(rankings.every(r => r.tieNote?.includes('proizvoljan'))).toBe(true);
      expect(rankings.every(r => r.tieNote && !r.tieNote.includes('disciplini'))).toBe(true);
    });
  });

  describe('getTeamRankings', () => {
    beforeEach(() => {
      gateway.emit({
        teams: [
          team({
            id: 1, category: 'M', name: 'Sokolovi',
            members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }, { id: 2, firstName: 'Marko', lastName: 'Kos' }]
          }),
          team({
            id: 2, category: 'M', name: 'Vukovi',
            members: [{ id: 3, firstName: 'Pero', lastName: 'Peric' }]
          })
        ],
        disciplines: [discipline({ id: 1, name: 'TRAP', category: 'M' })],
        results: [
          { id: 1, competitorId: 1, disciplineId: 1, points: 3 }, // Sokolovi: 3
          { id: 2, competitorId: 2, disciplineId: 1, points: 2 }, // Sokolovi: +2 = 5
          { id: 3, competitorId: 3, disciplineId: 1, points: 1 }  // Vukovi: 1
        ]
      });
    });

    it('should sum every team member\'s score per discipline', () => {
      const rankings = service.getTeamRankings();
      const sokolovi = rankings.find(r => r.team.name === 'Sokolovi')!;
      expect(sokolovi.disciplineScores['TRAP']).toBe(5);
    });

    it('should rank teams in descending order of combined total points', () => {
      const rankings = service.getTeamRankings();
      expect(rankings.map(r => r.team.name)).toEqual(['Sokolovi', 'Vukovi']);
      expect(rankings.map(r => r.rank)).toEqual([1, 2]);
    });

    it('should count a discipline as 0 for a team where no member has recorded a result', () => {
      gateway.emit({
        teams: [team({ id: 1, category: 'M', members: [{ id: 1, firstName: 'A', lastName: 'A' }] })],
        disciplines: [discipline({ id: 1, name: 'TRAP', category: 'M' })],
        results: []
      });

      const rankings = service.getTeamRankings();
      expect(rankings[0].disciplineScores['TRAP']).toBe(0);
      expect(rankings[0].totalPoints).toBe(0);
    });

    it('should rank the team with the better combined TRAP score first when totalPoints are equal', () => {
      gateway.emit({
        teams: [
          team({
            id: 1, category: 'M', name: 'Sokolovi',
            members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }]
          }),
          team({
            id: 2, category: 'M', name: 'Vukovi',
            members: [{ id: 2, firstName: 'Pero', lastName: 'Peric' }]
          })
        ],
        disciplines: [
          discipline({ id: 1, name: 'TRAP', category: 'M', maxPoints: 5 }),
          discipline({ id: 2, name: 'ZRAČNA PUŠKA', category: 'M', maxPoints: 50 })
        ],
        results: [
          // Sokolovi: TRAP 0 (0) + ZRAČNA 20 (40) = 40
          { id: 1, competitorId: 1, disciplineId: 1, points: 0 },
          { id: 2, competitorId: 1, disciplineId: 2, points: 20 },
          // Vukovi: TRAP 2 (40) + ZRAČNA 0 (0) = 40 -- same total, better TRAP
          { id: 3, competitorId: 2, disciplineId: 1, points: 2 },
          { id: 4, competitorId: 2, disciplineId: 2, points: 0 }
        ]
      });

      const rankings = service.getTeamRankings('M');
      expect(rankings.map(r => r.team.name)).toEqual(['Vukovi', 'Sokolovi']);
      expect(rankings.map(r => r.rank)).toEqual([1, 2]);
      const vukovi = rankings.find(r => r.team.name === 'Vukovi')!;
      const sokolovi = rankings.find(r => r.team.name === 'Sokolovi')!;
      expect(vukovi.tieNote).toContain('Sokolovi (TRAP 2:0)');
      expect(sokolovi.tieNote).toContain('Vukovi (TRAP 0:2)');
    });

    it('should rank the women\'s team with the better combined PRAČKA score first when totalPoints are equal', () => {
      gateway.emit({
        teams: [
          team({
            id: 1, category: 'Ž', name: 'Orlice',
            members: [{ id: 1, firstName: 'Ana', lastName: 'Ban' }]
          }),
          team({
            id: 2, category: 'Ž', name: 'Vučice',
            members: [{ id: 2, firstName: 'Iva', lastName: 'Novak' }]
          })
        ],
        disciplines: [
          discipline({ id: 1, name: 'PRAČKA', category: 'Ž', maxPoints: 5 }),
          discipline({ id: 2, name: 'PIKADO', category: 'Ž', maxPoints: 300 })
        ],
        results: [
          // Orlice: PRAČKA 0 (0) + PIKADO 150 (50) = 50
          { id: 1, competitorId: 1, disciplineId: 1, points: 0 },
          { id: 2, competitorId: 1, disciplineId: 2, points: 150 },
          // Vučice: PRAČKA 2 (40) + PIKADO 30 (10) = 50 -- same total, better PRAČKA
          { id: 3, competitorId: 2, disciplineId: 1, points: 2 },
          { id: 4, competitorId: 2, disciplineId: 2, points: 30 }
        ]
      });

      const rankings = service.getTeamRankings('Ž');
      expect(rankings.map(r => r.team.name)).toEqual(['Vučice', 'Orlice']);
      const orlice = rankings.find(r => r.team.name === 'Orlice')!;
      const vucice = rankings.find(r => r.team.name === 'Vučice')!;
      expect(vucice.tieNote).toContain('Orlice (PRAČKA 2:0)');
      expect(orlice.tieNote).toContain('Vučice (PRAČKA 0:2)');
    });
  });

  describe('simple getters', () => {
    beforeEach(() => {
      gateway.emit({
        teams: [team({ id: 1, category: 'M' }), team({ id: 2, category: 'Ž', members: [] })],
        disciplines: [discipline({ id: 1, category: 'M' }), discipline({ id: 2, category: 'Ž' })],
        results: [{ id: 1, competitorId: 1, disciplineId: 1, points: 1 }]
      });
    });

    it('getDisciplinesForCategory should filter disciplines by category', () => {
      expect(service.getDisciplinesForCategory('Ž').map(d => d.id)).toEqual([2]);
    });

    it('getTeams/getDisciplines/getResults should expose the current state collections', () => {
      expect(service.getTeams().length).toBe(2);
      expect(service.getDisciplines().length).toBe(2);
      expect(service.getResults().length).toBe(1);
    });

    it('getAllCompetitors should flatten members across every team', () => {
      expect(service.getAllCompetitors().map(c => c.id)).toEqual([1]);
    });
  });
});
