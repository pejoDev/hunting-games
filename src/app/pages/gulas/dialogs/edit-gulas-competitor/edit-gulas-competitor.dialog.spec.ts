import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { EditGulasCompetitorDialog } from './edit-gulas-competitor.dialog';
import { GulasService } from '../../../../core/gulas.service';
import { RealtimeDbGateway } from '../../../../core/realtime-db.gateway';
import { FakeRealtimeDbGateway } from '../../../../testing/fake-realtime-db.gateway';
import { GulasCompetitor } from '../../../../core/models';

describe('EditGulasCompetitorDialog', () => {
  let component: EditGulasCompetitorDialog;
  let dialogRef: jasmine.SpyObj<MatDialogRef<EditGulasCompetitorDialog>>;
  let gateway: FakeRealtimeDbGateway;

  const jelen: GulasCompetitor = { id: 1, codeName: 'JELEN' };

  beforeEach(() => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    gateway = new FakeRealtimeDbGateway();

    TestBed.configureTestingModule({
      imports: [EditGulasCompetitorDialog],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        GulasService,
        { provide: RealtimeDbGateway, useValue: gateway }
      ]
    });

    // GulasService only registers its gateway callback when first constructed, so it must be
    // injected before emit() or the emitted snapshot is silently dropped.
    TestBed.inject(GulasService);
    gateway.emit({ gulasCompetitors: [jelen], gulasScores: [] });
    component = TestBed.createComponent(EditGulasCompetitorDialog).componentInstance;
    component.ngOnInit();
  });

  it('should load all existing competitors as selectable options on init', () => {
    expect(component.availableCompetitors).toEqual([jelen]);
  });

  describe('onCompetitorSelected', () => {
    it('should populate the code name field from the selected competitor', () => {
      component.selectedCompetitor = jelen;
      component.onCompetitorSelected();
      expect(component.codeName).toBe('JELEN');
    });

    it('should reset the code name when the selection is cleared', () => {
      component.selectedCompetitor = jelen;
      component.onCompetitorSelected();

      component.selectedCompetitor = null;
      component.onCompetitorSelected();

      expect(component.codeName).toBe('');
    });
  });

  describe('canSave', () => {
    it('should be false when no competitor is selected', () => {
      component.selectedCompetitor = null;
      expect(component.canSave()).toBe(false);
    });

    it('should be false when the code name is blank', () => {
      component.selectedCompetitor = jelen;
      component.onCompetitorSelected();
      component.codeName = '   ';
      expect(component.canSave()).toBe(false);
    });

    it('should be true when a competitor is selected and the code name has content', () => {
      component.selectedCompetitor = jelen;
      component.onCompetitorSelected();
      expect(component.canSave()).toBe(true);
    });
  });

  describe('save', () => {
    it('should not close the dialog when the form cannot be saved', () => {
      component.selectedCompetitor = null;
      component.save();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should close with the trimmed id and code name', () => {
      component.selectedCompetitor = jelen;
      component.onCompetitorSelected();
      component.codeName = '  JELEN NOVI  ';

      component.save();

      expect(dialogRef.close).toHaveBeenCalledWith({ id: 1, codeName: 'JELEN NOVI' });
    });
  });

  describe('deleteCompetitor', () => {
    it('should do nothing when no competitor is selected', () => {
      component.selectedCompetitor = null;
      component.deleteCompetitor();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should close with a delete instruction when the user confirms the browser dialog', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.selectedCompetitor = jelen;

      component.deleteCompetitor();

      expect(dialogRef.close).toHaveBeenCalledWith({ delete: true, competitor: jelen });
    });

    it('should not close the dialog when the user cancels the browser confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      component.selectedCompetitor = jelen;

      component.deleteCompetitor();

      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close the dialog with no result', () => {
      component.close();
      expect(dialogRef.close).toHaveBeenCalledWith();
    });
  });
});
