import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GulasComponent } from './gulas.component';
import { GulasService } from '../../core/gulas.service';
import { RealtimeDbGateway } from '../../core/realtime-db.gateway';
import { FakeRealtimeDbGateway } from '../../testing/fake-realtime-db.gateway';
import { PdfReportService } from '../../core/pdf-report.service';
import { AddGulasCompetitorDialog } from './dialogs/add-gulas-competitor/add-gulas-competitor.dialog';
import { EditGulasCompetitorDialog } from './dialogs/edit-gulas-competitor/edit-gulas-competitor.dialog';
import { EnterGulasScoreDialog } from './dialogs/enter-gulas-score/enter-gulas-score.dialog';
import { GulasCompetitor, GulasScore } from '../../core/models';

describe('GulasComponent', () => {
  let component: GulasComponent;
  let gulasService: GulasService;
  let gateway: FakeRealtimeDbGateway;
  let dialog: jasmine.SpyObj<MatDialog>;
  let pdfReportService: jasmine.SpyObj<PdfReportService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  const jelen: GulasCompetitor = { id: 1, codeName: 'JELEN' };
  const criteria = { boja: 5, izgled: 4, gustoca: 5, okus: 9, dojam: 4 };
  const completeScores: GulasScore[] = [1, 2, 3].map(j => ({ id: j, competitorId: 1, judge: j as 1 | 2 | 3, criteria }));

  function openDialogReturning(result: any) {
    const ref = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
    ref.afterClosed.and.returnValue(of(result));
    dialog.open.and.returnValue(ref);
    return ref;
  }

  beforeEach(() => {
    gateway = new FakeRealtimeDbGateway();
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    pdfReportService = jasmine.createSpyObj('PdfReportService', ['exportGulasRankingToPdf']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      imports: [GulasComponent],
      providers: [
        provideRouter([]),
        GulasService,
        { provide: RealtimeDbGateway, useValue: gateway },
        { provide: PdfReportService, useValue: pdfReportService },
        { provide: MatSnackBar, useValue: snackBar }
      ]
    });
    // GulasComponent imports MatDialogModule directly, which re-provides MatDialog in the same
    // injector scope and shadows a plain `providers` override - overrideProvider patches the
    // provider definition itself, which does take precedence (same pattern as OverviewComponent).
    TestBed.overrideProvider(MatDialog, { useValue: dialog });

    gulasService = TestBed.inject(GulasService);
    gateway.emit({ gulasCompetitors: [jelen], gulasScores: completeScores });

    component = TestBed.createComponent(GulasComponent).componentInstance;
  });

  describe('ngOnInit', () => {
    it('should populate rankings and incomplete on init', () => {
      component.ngOnInit();
      expect(component.rankings.length).toBe(1);
      expect(component.incomplete).toEqual([]);
    });

    it('should re-run the view update whenever the underlying gulas state changes', () => {
      component.ngOnInit();
      expect(component.rankings.length).toBe(1);

      gateway.emit({ gulasCompetitors: [jelen], gulasScores: [completeScores[0]] });

      expect(component.rankings.length).toBe(0);
      expect(component.incomplete.length).toBe(1);
    });
  });

  describe('openAddCompetitor', () => {
    it('should add the competitor when the dialog closes with a result', () => {
      openDialogReturning({ codeName: 'SRNA' });
      spyOn(gulasService, 'addCompetitor');

      component.openAddCompetitor();

      expect(dialog.open).toHaveBeenCalledWith(AddGulasCompetitorDialog, { width: '480px', maxWidth: '95vw' });
      expect(gulasService.addCompetitor).toHaveBeenCalledWith('SRNA');
    });

    it('should not call the service when the dialog is cancelled', () => {
      openDialogReturning(undefined);
      spyOn(gulasService, 'addCompetitor');

      component.openAddCompetitor();

      expect(gulasService.addCompetitor).not.toHaveBeenCalled();
    });
  });

  describe('openEditCompetitor', () => {
    it('should delete the competitor when the dialog result requests deletion', () => {
      openDialogReturning({ delete: true, competitor: jelen });
      spyOn(gulasService, 'deleteCompetitor');
      spyOn(gulasService, 'updateCompetitor');

      component.openEditCompetitor();

      expect(gulasService.deleteCompetitor).toHaveBeenCalledWith(1);
      expect(gulasService.updateCompetitor).not.toHaveBeenCalled();
    });

    it('should update the competitor when the dialog result is a plain rename', () => {
      openDialogReturning({ id: 1, codeName: 'JELEN NOVI' });
      spyOn(gulasService, 'updateCompetitor');

      component.openEditCompetitor();

      expect(gulasService.updateCompetitor).toHaveBeenCalledWith(1, 'JELEN NOVI');
    });

    it('should do nothing when the dialog is cancelled', () => {
      openDialogReturning(undefined);
      spyOn(gulasService, 'deleteCompetitor');
      spyOn(gulasService, 'updateCompetitor');

      component.openEditCompetitor();

      expect(gulasService.deleteCompetitor).not.toHaveBeenCalled();
      expect(gulasService.updateCompetitor).not.toHaveBeenCalled();
    });
  });

  describe('openEnterScore', () => {
    it('should open the score entry dialog', () => {
      openDialogReturning(undefined);

      component.openEnterScore();

      expect(dialog.open).toHaveBeenCalledWith(EnterGulasScoreDialog, { width: '520px', maxWidth: '95vw' });
    });
  });

  describe('exportToPdf', () => {
    it('should do nothing when there is nothing in the ranking yet', () => {
      gateway.emit({ gulasCompetitors: [jelen], gulasScores: [] });
      component.ngOnInit();

      component.exportToPdf();

      expect(pdfReportService.exportGulasRankingToPdf).not.toHaveBeenCalled();
      expect(snackBar.open).not.toHaveBeenCalled();
    });

    it('should export the ranking and show a confirmation snackbar when data is available', () => {
      component.ngOnInit();

      component.exportToPdf();

      expect(pdfReportService.exportGulasRankingToPdf).toHaveBeenCalledWith(component.rankings);
      expect(snackBar.open).toHaveBeenCalledWith('PDF izvještaj preuzet.', undefined, { duration: 3000 });
    });
  });

  describe('hasCompetitors', () => {
    it('should be true when at least one competitor exists', () => {
      expect(component.hasCompetitors()).toBe(true);
    });

    it('should be false when there are no competitors', () => {
      gateway.emit({ gulasCompetitors: [], gulasScores: [] });
      expect(component.hasCompetitors()).toBe(false);
    });
  });

  describe('judgeStatus', () => {
    it('should be true when the judge is in the scored list', () => {
      expect(component.judgeStatus([1, 3], 3)).toBe(true);
    });

    it('should be false when the judge is not in the scored list', () => {
      expect(component.judgeStatus([1, 3], 2)).toBe(false);
    });
  });

  describe('display helpers', () => {
    it('getRankClass should style the top 3 ranks distinctly and leave the rest generic', () => {
      expect(component.getRankClass(1)).toBe('rank-cell rank-1');
      expect(component.getRankClass(2)).toBe('rank-cell rank-2');
      expect(component.getRankClass(3)).toBe('rank-cell rank-3');
      expect(component.getRankClass(4)).toBe('rank-cell');
    });

    it('getRowClass should highlight the winner and podium rows', () => {
      expect(component.getRowClass(1)).toBe('row-winner');
      expect(component.getRowClass(2)).toBe('row-podium');
      expect(component.getRowClass(3)).toBe('row-podium');
      expect(component.getRowClass(4)).toBe('');
    });
  });

  describe('finishGulas', () => {
    it('should reset the gulas data and show a confirmation snackbar when the user confirms', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(gulasService, 'resetGulas');

      component.finishGulas();

      expect(gulasService.resetGulas).toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalled();
    });

    it('should not reset the gulas data when the user cancels', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      spyOn(gulasService, 'resetGulas');

      component.finishGulas();

      expect(gulasService.resetGulas).not.toHaveBeenCalled();
      expect(snackBar.open).not.toHaveBeenCalled();
    });
  });
});
