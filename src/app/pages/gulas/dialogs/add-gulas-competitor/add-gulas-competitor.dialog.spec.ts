import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { AddGulasCompetitorDialog } from './add-gulas-competitor.dialog';

describe('AddGulasCompetitorDialog', () => {
  let component: AddGulasCompetitorDialog;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddGulasCompetitorDialog>>;

  beforeEach(() => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [AddGulasCompetitorDialog],
      providers: [{ provide: MatDialogRef, useValue: dialogRef }]
    });

    component = TestBed.createComponent(AddGulasCompetitorDialog).componentInstance;
  });

  describe('isFormValid', () => {
    it('should be false when the code name is empty', () => {
      component.codeName = '';
      expect(component.isFormValid()).toBe(false);
    });

    it('should be false when the code name is only whitespace', () => {
      component.codeName = '   ';
      expect(component.isFormValid()).toBe(false);
    });

    it('should be true when the code name has content', () => {
      component.codeName = 'JELEN';
      expect(component.isFormValid()).toBe(true);
    });
  });

  describe('add', () => {
    it('should not close the dialog when the form is invalid', () => {
      component.codeName = '   ';
      component.add();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should close with the trimmed code name when valid', () => {
      component.codeName = '  JELEN  ';
      component.add();
      expect(dialogRef.close).toHaveBeenCalledWith({ codeName: 'JELEN' });
    });
  });

  describe('close', () => {
    it('should close the dialog with no result', () => {
      component.close();
      expect(dialogRef.close).toHaveBeenCalledWith();
    });
  });
});
