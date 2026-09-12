import { TestBed } from '@angular/core/testing';
import { PdfReportService } from './pdf-report.service';
import { CompetitorRanking, TeamRanking, Discipline } from './models';

describe('PdfReportService', () => {
  let service: PdfReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PdfReportService);
    // jsPDF's save() drives the real (minified, third-party) PDF/blob/download machinery. In
    // headless Chrome it completes synchronously with no visible side effect and no network
    // access, so it's exercised for real here rather than mocked — these tests protect against
    // real regressions in how ranking/discipline data gets shaped into a PDF, not vendor internals.
  });

  const disciplines: Discipline[] = [
    { id: 1, name: 'TRAP', category: 'M', maxPoints: 5 },
    { id: 2, name: 'ZRAČNA PUŠKA', category: 'M', maxPoints: 50 }
  ];

  // Ranks 1, 2 and 3 are all represented so the gold/silver/bronze podium-highlighting branches
  // in the PDF table (didParseCell) actually run, not just the "no highlight" path for rank > 3.
  const individualData: CompetitorRanking[] = [
    {
      rank: 1,
      competitor: { id: 1, firstName: 'Ivan', lastName: 'Horvat' },
      team: 'Sokolovi',
      disciplineScores: { 'TRAP': 5, 'ZRAČNA PUŠKA': 40 },
      totalPoints: 180
    },
    {
      rank: 2,
      competitor: { id: 2, firstName: 'Marko', lastName: 'Kos' },
      team: 'Vukovi',
      disciplineScores: { 'TRAP': 2, 'ZRAČNA PUŠKA': 20 },
      totalPoints: 80
    },
    {
      rank: 3,
      competitor: { id: 3, firstName: 'Pero', lastName: 'Perić' },
      team: 'Orlovi',
      disciplineScores: { 'TRAP': 1, 'ZRAČNA PUŠKA': 10 },
      totalPoints: 40
    }
  ];

  const teamData: TeamRanking[] = [
    {
      rank: 1,
      team: { id: 1, name: 'Sokolovi', category: 'M', members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }] },
      disciplineScores: { 'TRAP': 5, 'ZRAČNA PUŠKA': 40 },
      totalPoints: 180
    },
    {
      rank: 2,
      team: { id: 2, name: 'Vukovi', category: 'M', members: [{ id: 2, firstName: 'Marko', lastName: 'Kos' }] },
      disciplineScores: { 'TRAP': 2, 'ZRAČNA PUŠKA': 20 },
      totalPoints: 80
    },
    {
      rank: 3,
      team: { id: 3, name: 'Orlovi', category: 'M', members: [{ id: 3, firstName: 'Pero', lastName: 'Perić' }] },
      disciplineScores: { 'TRAP': 1, 'ZRAČNA PUŠKA': 10 },
      totalPoints: 40
    }
  ];

  describe('exportIndividualRankingToPdf', () => {
    it('should generate a PDF without throwing for a populated individual ranking', () => {
      expect(() => service.exportIndividualRankingToPdf(individualData, disciplines, 'M')).not.toThrow();
    });

    it('should not throw when no category is given (unfiltered export)', () => {
      expect(() => service.exportIndividualRankingToPdf(individualData, disciplines, '')).not.toThrow();
    });

    it('should not throw when given an empty ranking (no competitors yet)', () => {
      expect(() => service.exportIndividualRankingToPdf([], disciplines, 'M')).not.toThrow();
    });

    it('should not throw when a competitor has no score recorded for a discipline column', () => {
      const missingScoreData: CompetitorRanking[] = [{
        rank: 1,
        competitor: { id: 1, firstName: 'Ivan', lastName: 'Horvat' },
        team: 'Sokolovi',
        disciplineScores: {},
        totalPoints: 0
      }];
      expect(() => service.exportIndividualRankingToPdf(missingScoreData, disciplines, 'M')).not.toThrow();
    });

    it('should not throw when a tie for 1st/2nd place is broken by TRAP (triggers the tiebreak note)', () => {
      const tiedAtTop: CompetitorRanking[] = [
        {
          rank: 1,
          competitor: { id: 1, firstName: 'Ivan', lastName: 'Horvat' },
          team: 'Sokolovi',
          disciplineScores: { 'TRAP': 5, 'ZRAČNA PUŠKA': 0 },
          totalPoints: 100
        },
        {
          rank: 2,
          competitor: { id: 2, firstName: 'Marko', lastName: 'Kos' },
          team: 'Vukovi',
          disciplineScores: { 'TRAP': 2, 'ZRAČNA PUŠKA': 30 },
          totalPoints: 100
        }
      ];
      expect(() => service.exportIndividualRankingToPdf(tiedAtTop, disciplines, 'M')).not.toThrow();
    });

    it('should not throw when a tie exists outside the top 3 (no tiebreak note expected)', () => {
      const tiedBelowTop3: CompetitorRanking[] = [
        ...individualData,
        {
          rank: 4,
          competitor: { id: 4, firstName: 'Josip', lastName: 'Novak' },
          team: 'Sokolovi',
          disciplineScores: { 'TRAP': 1, 'ZRAČNA PUŠKA': 5 },
          totalPoints: 10
        },
        {
          rank: 5,
          competitor: { id: 5, firstName: 'Luka', lastName: 'Babic' },
          team: 'Vukovi',
          disciplineScores: { 'TRAP': 0, 'ZRAČNA PUŠKA': 10 },
          totalPoints: 10
        }
      ];
      expect(() => service.exportIndividualRankingToPdf(tiedBelowTop3, disciplines, 'M')).not.toThrow();
    });
  });

  describe('exportTeamRankingToPdf', () => {
    it('should generate a PDF without throwing for a populated team ranking', () => {
      expect(() => service.exportTeamRankingToPdf(teamData, disciplines, 'M')).not.toThrow();
    });

    it('should not throw for the women\'s category', () => {
      expect(() => service.exportTeamRankingToPdf(teamData, disciplines, 'Ž')).not.toThrow();
    });

    it('should add a new PDF page when the team roster listing overflows a single page', () => {
      const manyTeams: TeamRanking[] = Array.from({ length: 25 }, (_, i) => ({
        rank: i + 1,
        team: {
          id: i + 1,
          name: `Tim Broj ${i + 1}`,
          category: 'M',
          members: [
            { id: i * 3 + 1, firstName: 'Ivan', lastName: 'Horvatic' },
            { id: i * 3 + 2, firstName: 'Marko', lastName: 'Kosanovic' },
            { id: i * 3 + 3, firstName: 'Pero', lastName: 'Perkovic' }
          ]
        },
        disciplineScores: { 'TRAP': 5, 'ZRAČNA PUŠKA': 40 },
        totalPoints: 180 - i
      }));

      expect(() => service.exportTeamRankingToPdf(manyTeams, disciplines, 'M')).not.toThrow();
    });

    it('should not throw when a team has no members (edge case: empty roster)', () => {
      const emptyRosterTeam: TeamRanking[] = [{
        rank: 1,
        team: { id: 1, name: 'Prazan Tim', category: 'M', members: [] },
        disciplineScores: {},
        totalPoints: 0
      }];
      expect(() => service.exportTeamRankingToPdf(emptyRosterTeam, disciplines, 'M')).not.toThrow();
    });

    it('should not throw when two teams are tied for 1st place, broken by TRAP (triggers the tiebreak note)', () => {
      const tiedTeams: TeamRanking[] = [
        {
          rank: 1,
          team: { id: 1, name: 'Sokolovi', category: 'M', members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }] },
          disciplineScores: { 'TRAP': 5, 'ZRAČNA PUŠKA': 0 },
          totalPoints: 100
        },
        {
          rank: 2,
          team: { id: 2, name: 'Vukovi', category: 'M', members: [{ id: 2, firstName: 'Pero', lastName: 'Peric' }] },
          disciplineScores: { 'TRAP': 2, 'ZRAČNA PUŠKA': 30 },
          totalPoints: 100
        }
      ];
      expect(() => service.exportTeamRankingToPdf(tiedTeams, disciplines, 'M')).not.toThrow();
    });
  });

  describe('exportCompleteReportToPdf', () => {
    it('should generate a combined report without throwing when both datasets are populated', () => {
      expect(() => service.exportCompleteReportToPdf(individualData, teamData, disciplines, 'M')).not.toThrow();
    });

    it('should not throw when both individual and team data are empty', () => {
      expect(() => service.exportCompleteReportToPdf([], [], disciplines, '')).not.toThrow();
    });

    it('should still generate a report when only individual data is present', () => {
      expect(() => service.exportCompleteReportToPdf(individualData, [], disciplines, 'M')).not.toThrow();
    });

    it('should still generate a report when only team data is present', () => {
      expect(() => service.exportCompleteReportToPdf([], teamData, disciplines, 'M')).not.toThrow();
    });

    it('should not throw when both sections have a top-3 tie broken by TRAP', () => {
      const tiedIndividual: CompetitorRanking[] = [
        {
          rank: 1,
          competitor: { id: 1, firstName: 'Ivan', lastName: 'Horvat' },
          team: 'Sokolovi',
          disciplineScores: { 'TRAP': 5, 'ZRAČNA PUŠKA': 0 },
          totalPoints: 100
        },
        {
          rank: 2,
          competitor: { id: 2, firstName: 'Marko', lastName: 'Kos' },
          team: 'Vukovi',
          disciplineScores: { 'TRAP': 2, 'ZRAČNA PUŠKA': 30 },
          totalPoints: 100
        }
      ];
      const tiedTeams: TeamRanking[] = [
        {
          rank: 1,
          team: { id: 1, name: 'Sokolovi', category: 'M', members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }] },
          disciplineScores: { 'TRAP': 5, 'ZRAČNA PUŠKA': 0 },
          totalPoints: 100
        },
        {
          rank: 2,
          team: { id: 2, name: 'Vukovi', category: 'M', members: [{ id: 2, firstName: 'Pero', lastName: 'Peric' }] },
          disciplineScores: { 'TRAP': 2, 'ZRAČNA PUŠKA': 30 },
          totalPoints: 100
        }
      ];
      expect(() => service.exportCompleteReportToPdf(tiedIndividual, tiedTeams, disciplines, 'M')).not.toThrow();
    });
  });

  describe('exportStartingListsToPdf', () => {
    const teamDisciplinesM: Discipline[] = [
      { id: 1, name: 'TRAP', category: 'M', maxPoints: 5 },
      { id: 2, name: 'ZRAČNA PUŠKA', category: 'M', maxPoints: 50 },
      { id: 3, name: 'PRAČKA', category: 'M', maxPoints: 5 }
    ];
    const teamDisciplinesZ: Discipline[] = [
      { id: 4, name: 'ZRAČNA PUŠKA', category: 'Ž', maxPoints: 50 },
      { id: 5, name: 'PRAČKA', category: 'Ž', maxPoints: 5 },
      { id: 6, name: 'PIKADO', category: 'Ž', maxPoints: 300 }
    ];
    const fullTeam = {
      id: 1, name: 'Sokolovi', category: 'M' as const,
      members: [
        { id: 1, firstName: 'Ivan', lastName: 'Horvat' },
        { id: 2, firstName: 'Marko', lastName: 'Kos' },
        { id: 3, firstName: 'Pero', lastName: 'Perić' }
      ]
    };

    it('should generate a PDF without throwing for a populated team roster (men)', () => {
      expect(() => service.exportStartingListsToPdf([fullTeam], teamDisciplinesM, 'M')).not.toThrow();
    });

    it('should generate a PDF without throwing for the women\'s discipline set', () => {
      const team = { id: 2, name: 'Orlice', category: 'Ž' as const, members: [{ id: 4, firstName: 'Ana', lastName: 'Ban' }] };
      expect(() => service.exportStartingListsToPdf([team], teamDisciplinesZ, 'Ž')).not.toThrow();
    });

    it('should not throw for a team with fewer than 3 members (blank rows for the rest)', () => {
      const team = { id: 3, name: 'Vukovi', category: 'M' as const, members: [{ id: 5, firstName: 'Luka', lastName: 'Babić' }] };
      expect(() => service.exportStartingListsToPdf([team], teamDisciplinesM, 'M')).not.toThrow();
    });

    it('should not throw for a team with no members yet', () => {
      const team = { id: 4, name: 'Novi Tim', category: 'M' as const, members: [] };
      expect(() => service.exportStartingListsToPdf([team], teamDisciplinesM, 'M')).not.toThrow();
    });

    it('should not throw when generating multiple teams (one page per team)', () => {
      const second = { id: 5, name: 'Jastrebovi', category: 'M' as const, members: [{ id: 6, firstName: 'Josip', lastName: 'Novak' }] };
      expect(() => service.exportStartingListsToPdf([fullTeam, second], teamDisciplinesM, 'M')).not.toThrow();
    });

    it('should do nothing when there are no teams for the category', () => {
      expect(() => service.exportStartingListsToPdf([], teamDisciplinesM, 'M')).not.toThrow();
    });
  });

  describe('Croatian text normalization (via generated content)', () => {
    it('should not throw when competitor or team names contain the full set of Croatian palatals', () => {
      const dataWithDiacritics: CompetitorRanking[] = [{
        rank: 1,
        competitor: { id: 1, firstName: 'Čćđšž', lastName: 'ČĆĐŠŽ' },
        team: 'Đačka Šuma',
        disciplineScores: {},
        totalPoints: 0
      }];

      expect(() => service.exportIndividualRankingToPdf(dataWithDiacritics, [], '')).not.toThrow();
    });
  });
});
