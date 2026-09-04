import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { OverviewComponent } from './overview.component';
import { CompetitionService } from './competition.service';
import { RealtimeDbGateway } from './realtime-db.gateway';
import { FakeRealtimeDbGateway } from './testing/fake-realtime-db.gateway';
import { PdfReportService } from './pdf-report.service';
import { AddTeamDialog } from './dialogs/add-team.dialog';
import { EditTeamDialog } from './dialogs/edit-team.dialog';
import { AddResultDialog } from './dialogs/add-result.dialog';
import { EditResultDialog } from './dialogs/edit-result.dialog';
import { Team, Discipline } from './models';

describe('OverviewComponent', () => {
  let component: OverviewComponent;
  let competitionService: CompetitionService;
  let gateway: FakeRealtimeDbGateway;
  let dialog: jasmine.SpyObj<MatDialog>;
  let pdfReportService: jasmine.SpyObj<PdfReportService>;

  const sokolovi: Team = {
    id: 1, name: 'Sokolovi', category: 'M',
    members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }]
  };
  const orlice: Team = {
    id: 2, name: 'Orlice', category: 'Ž',
    members: [{ id: 2, firstName: 'Ana', lastName: 'Ban' }]
  };
  const disciplines: Discipline[] = [
    { id: 1, name: 'TRAP', category: 'M', maxPoints: 5 },
    { id: 2, name: 'PIKADO', category: 'Ž', maxPoints: 300 }
  ];

  function openDialogReturning(result: any) {
    const ref = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
    ref.afterClosed.and.returnValue(of(result));
    dialog.open.and.returnValue(ref);
    return ref;
  }

  beforeEach(() => {
    gateway = new FakeRealtimeDbGateway();
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    pdfReportService = jasmine.createSpyObj('PdfReportService', [
      'exportIndividualRankingToPdf', 'exportTeamRankingToPdf', 'exportCompleteReportToPdf'
    ]);

    TestBed.configureTestingModule({
      imports: [OverviewComponent],
      providers: [
        CompetitionService,
        { provide: RealtimeDbGateway, useValue: gateway },
        { provide: PdfReportService, useValue: pdfReportService }
      ]
    });
    // OverviewComponent imports MatDialogModule directly, which re-provides MatDialog in the
    // same injector scope and shadows a plain `providers` override — overrideProvider patches
    // the provider definition itself, which does take precedence.
    TestBed.overrideProvider(MatDialog, { useValue: dialog });

    competitionService = TestBed.inject(CompetitionService);
    gateway.emit({
      teams: [sokolovi, orlice],
      disciplines,
      results: [{ id: 1, competitorId: 1, disciplineId: 1, points: 5 }]
    });

    component = TestBed.createComponent(OverviewComponent).componentInstance;
  });

  describe('ngOnInit / updateView', () => {
    it('should populate the individual ranking on init by default', () => {
      component.ngOnInit();
      expect(component.viewMode).toBe('individual');
      expect(component.competitorRows.length).toBe(2);
    });

    it('should re-run the view update whenever the underlying competition state changes', () => {
      component.ngOnInit();
      expect(component.competitorRows.length).toBe(2);

      const vukovi: Team = { id: 3, name: 'Vukovi', category: 'M', members: [{ id: 3, firstName: 'Pero', lastName: 'Peric' }] };
      gateway.emit({ teams: [sokolovi, orlice, vukovi], disciplines, results: [] });

      expect(component.competitorRows.length).toBe(3);
    });

    it('should populate the team ranking when in team view mode', () => {
      component.viewMode = 'team';
      component.updateView();
      expect(component.teamRows.length).toBe(2);
    });

    it('should filter rankings by the selected category', () => {
      component.selectedCategory = 'Ž';
      component.updateView();
      expect(component.competitorRows.map(r => r.competitor.firstName)).toEqual(['Ana']);
    });
  });

  describe('column configuration', () => {
    it('getDisciplineColumns should list every discipline when no category filter is active', () => {
      expect(component.getDisciplineColumns()).toEqual(['TRAP', 'PIKADO']);
    });

    it('getDisciplineColumns should list only that category\'s disciplines when filtered', () => {
      component.selectedCategory = 'M';
      expect(component.getDisciplineColumns()).toEqual(['TRAP']);
    });

    it('updateIndividualColumns should build the column list around the discipline columns', () => {
      component.selectedCategory = 'M';
      component.updateIndividualColumns();
      expect(component.individualDisplayedColumns).toEqual(['rank', 'name', 'team', 'TRAP', 'total']);
    });

    it('updateTeamColumns should build the column list around the discipline columns', () => {
      component.selectedCategory = 'Ž';
      component.updateTeamColumns();
      expect(component.teamDisplayedColumns).toEqual(['rank', 'teamName', 'PIKADO', 'total']);
    });
  });

  describe('dialog-driven CRUD flows', () => {
    it('openAddTeam should add the team when the dialog closes with a result', () => {
      openDialogReturning({ name: 'Vukovi', category: 'M', members: [] });
      spyOn(competitionService, 'addTeam');

      component.openAddTeam();

      expect(dialog.open).toHaveBeenCalledWith(AddTeamDialog, { width: '600px', maxWidth: '95vw' });
      expect(competitionService.addTeam).toHaveBeenCalledWith('Vukovi', 'M', []);
    });

    it('openAddTeam should not call the service when the dialog is cancelled', () => {
      openDialogReturning(undefined);
      spyOn(competitionService, 'addTeam');

      component.openAddTeam();

      expect(competitionService.addTeam).not.toHaveBeenCalled();
    });

    it('openEditTeamSelector should delete the team when the dialog result requests deletion', () => {
      openDialogReturning({ delete: true, team: sokolovi });
      spyOn(competitionService, 'deleteTeam');
      spyOn(competitionService, 'updateTeam');

      component.openEditTeamSelector();

      expect(competitionService.deleteTeam).toHaveBeenCalledWith(1);
      expect(competitionService.updateTeam).not.toHaveBeenCalled();
    });

    it('openEditTeamSelector should update the team when the dialog result is a plain update', () => {
      openDialogReturning({ id: 1, name: 'Sokolovi Novi', category: 'M', members: [] });
      spyOn(competitionService, 'updateTeam');

      component.openEditTeamSelector();

      expect(competitionService.updateTeam).toHaveBeenCalledWith(1, 'Sokolovi Novi', 'M', []);
    });

    it('openAddResult should record the result when the dialog closes with a result', () => {
      openDialogReturning({ competitorId: 1, disciplineId: 1, points: 4 });
      spyOn(competitionService, 'addResult');

      component.openAddResult();

      expect(competitionService.addResult).toHaveBeenCalledWith(1, 1, 4);
    });

    it('openEditResult should update the result when the dialog closes with a result', () => {
      openDialogReturning({ id: 5, competitorId: 1, disciplineId: 1, points: 4 });
      spyOn(competitionService, 'updateResult');

      component.openEditResult();

      expect(competitionService.updateResult).toHaveBeenCalledWith(5, 1, 1, 4);
    });
  });

  describe('PDF export delegation', () => {
    it('exportCurrentViewToPdf should export the individual ranking when in individual view', () => {
      component.viewMode = 'individual';
      component.updateView();

      component.exportCurrentViewToPdf();

      expect(pdfReportService.exportIndividualRankingToPdf).toHaveBeenCalled();
      expect(pdfReportService.exportTeamRankingToPdf).not.toHaveBeenCalled();
    });

    it('exportCurrentViewToPdf should export the team ranking when in team view', () => {
      component.viewMode = 'team';
      component.updateView();

      component.exportCurrentViewToPdf();

      expect(pdfReportService.exportTeamRankingToPdf).toHaveBeenCalled();
      expect(pdfReportService.exportIndividualRankingToPdf).not.toHaveBeenCalled();
    });

    it('exportCompleteReport should pass both individual and team data plus disciplines to the service', () => {
      component.selectedCategory = 'M';

      component.exportCompleteReport();

      expect(pdfReportService.exportCompleteReportToPdf).toHaveBeenCalledWith(
        jasmine.any(Array), jasmine.any(Array), [disciplines[0]], 'M'
      );
    });
  });

  describe('hasData', () => {
    it('should be true when the individual view has rows', () => {
      component.viewMode = 'individual';
      component.updateView();
      expect(component.hasData()).toBe(true);
    });

    it('should be false when the team view has no rows for the filtered category', () => {
      component.viewMode = 'team';
      component.selectedCategory = 'M';
      gateway.emit({ teams: [orlice], disciplines, results: [] });
      component.updateView();
      expect(component.hasData()).toBe(false);
    });
  });

  describe('display helpers', () => {
    it('getRankClass should style the top 3 ranks distinctly and leave the rest generic', () => {
      expect(component.getRankClass(1)).toBe('rank-cell rank-1');
      expect(component.getRankClass(2)).toBe('rank-cell rank-2');
      expect(component.getRankClass(3)).toBe('rank-cell rank-3');
      expect(component.getRankClass(4)).toBe('rank-cell');
    });

    it('getScoreClass should bucket scores into high/medium/low/none', () => {
      expect(component.getScoreClass(0)).toBe('');
      expect(component.getScoreClass(24)).toBe('score-low');
      expect(component.getScoreClass(25)).toBe('score-medium');
      expect(component.getScoreClass(49)).toBe('score-medium');
      expect(component.getScoreClass(50)).toBe('score-high');
    });

    it('getRowClass should highlight the winner and podium rows', () => {
      expect(component.getRowClass(1)).toBe('row-winner');
      expect(component.getRowClass(2)).toBe('row-podium');
      expect(component.getRowClass(3)).toBe('row-podium');
      expect(component.getRowClass(4)).toBe('');
    });

    it('formatPoints should render points with a Croatian decimal comma', () => {
      expect(component.formatPoints(12.5)).toBe('12,5');
      expect(component.formatPoints(100)).toBe('100');
    });
  });
});
