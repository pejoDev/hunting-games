import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { EditResultDialog } from './edit-result.dialog';
import { CompetitionService } from '../competition.service';
import { RealtimeDbGateway } from '../realtime-db.gateway';
import { FakeRealtimeDbGateway } from '../testing/fake-realtime-db.gateway';
import { Team, Discipline, Result } from '../models';

describe('EditResultDialog', () => {
  let component: EditResultDialog;
  let dialogRef: jasmine.SpyObj<MatDialogRef<EditResultDialog>>;
  let gateway: FakeRealtimeDbGateway;

  const sokolovi: Team = {
    id: 1, name: 'Sokolovi', category: 'M',
    members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }, { id: 2, firstName: 'Ana', lastName: 'Ban' }]
  };
  const disciplines: Discipline[] = [{ id: 1, name: 'TRAP', category: 'M' }];
  const results: Result[] = [
    { id: 1, competitorId: 1, disciplineId: 1, points: 3 },
    { id: 2, competitorId: 2, disciplineId: 1, points: 5 }
  ];

  beforeEach(() => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    gateway = new FakeRealtimeDbGateway();

    TestBed.configureTestingModule({
      imports: [EditResultDialog],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        CompetitionService,
        { provide: RealtimeDbGateway, useValue: gateway }
      ]
    });

    // CompetitionService only registers its gateway callback when it's first constructed, so it
    // must be injected before emit() or the emitted snapshot is silently dropped.
    TestBed.inject(CompetitionService);
    gateway.emit({ teams: [sokolovi], disciplines, results });
    component = TestBed.createComponent(EditResultDialog).componentInstance;
    component.ngOnInit();
  });

  it('should join every result with its competitor, discipline and team', () => {
    expect(component.availableResults.length).toBe(2);
    expect(component.availableResults[0].team).toEqual(sokolovi);
    expect(component.availableResults[0].discipline.name).toBe('TRAP');
  });

  it('should sort results alphabetically by competitor name for easier browsing', () => {
    expect(component.availableResults.map(r => r.competitor.firstName)).toEqual(['Ana', 'Ivan']);
  });

  describe('onResultSelected', () => {
    it('should populate points from the selected result', () => {
      component.selectedResult = component.availableResults.find(r => r.competitor.firstName === 'Ivan')!;
      component.onResultSelected();
      expect(component.points).toBe(3);
    });

    it('should reset points to 0 when the selection is cleared', () => {
      component.selectedResult = null;
      component.onResultSelected();
      expect(component.points).toBe(0);
    });
  });

  describe('canSave', () => {
    it('should be false when no result is selected', () => {
      component.selectedResult = null;
      component.points = 5;
      expect(component.canSave()).toBe(false);
    });

    it('should be false for negative points', () => {
      component.selectedResult = component.availableResults[0];
      component.points = -1;
      expect(component.canSave()).toBe(false);
    });

    it('should be false for NaN points', () => {
      component.selectedResult = component.availableResults[0];
      component.points = NaN;
      expect(component.canSave()).toBe(false);
    });

    it('should be true for a selected result with valid non-negative points', () => {
      component.selectedResult = component.availableResults[0];
      component.points = 0;
      expect(component.canSave()).toBe(true);
    });
  });

  describe('save', () => {
    it('should not close the dialog when the form cannot be saved', () => {
      component.selectedResult = null;
      component.save();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should close with the updated points, preserving id/competitor/discipline', () => {
      const ivanResult = component.availableResults.find(r => r.competitor.firstName === 'Ivan')!;
      component.selectedResult = ivanResult;
      component.points = 4.5;

      component.save();

      expect(dialogRef.close).toHaveBeenCalledWith({
        id: ivanResult.result.id,
        competitorId: ivanResult.result.competitorId,
        disciplineId: ivanResult.result.disciplineId,
        points: 4.5
      });
    });
  });

  describe('close', () => {
    it('should close the dialog with no result when cancelled', () => {
      component.close();
      expect(dialogRef.close).toHaveBeenCalledWith();
    });
  });
});
