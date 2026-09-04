import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { AddTeamDialog } from './add-team.dialog';

describe('AddTeamDialog', () => {
  let component: AddTeamDialog;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddTeamDialog>>;

  beforeEach(() => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [AddTeamDialog],
      providers: [{ provide: MatDialogRef, useValue: dialogRef }]
    });
    component = TestBed.createComponent(AddTeamDialog).componentInstance;
  });

  it('should start with one empty member row pre-added (a team needs at least one competitor)', () => {
    expect(component.teamMembers.length).toBe(1);
  });

  describe('addMember', () => {
    it('should allow adding members up to the 3-member team cap', () => {
      component.addMember();
      component.addMember();
      expect(component.teamMembers.length).toBe(3);
    });

    it('should refuse to add a member beyond the cap of 3', () => {
      component.addMember();
      component.addMember();
      component.addMember();
      expect(component.teamMembers.length).toBe(3);
    });
  });

  describe('removeMember', () => {
    it('should refuse to remove the first (mandatory) member', () => {
      component.removeMember(0);
      expect(component.teamMembers.length).toBe(1);
    });

    it('should remove a non-first member', () => {
      component.addMember();
      component.removeMember(1);
      expect(component.teamMembers.length).toBe(1);
    });
  });

  describe('isFormValid', () => {
    it('should be invalid when the team name is empty', () => {
      component.name = '   ';
      component.category = 'M';
      component.teamMembers[0].firstName = 'Ivan';
      component.teamMembers[0].lastName = 'Horvat';
      expect(component.isFormValid()).toBe(false);
    });

    it('should be invalid when no category is selected', () => {
      component.name = 'Sokolovi';
      component.category = '';
      component.teamMembers[0].firstName = 'Ivan';
      component.teamMembers[0].lastName = 'Horvat';
      expect(component.isFormValid()).toBe(false);
    });

    it('should be invalid when the mandatory first member is incomplete', () => {
      component.name = 'Sokolovi';
      component.category = 'M';
      component.teamMembers[0].firstName = 'Ivan';
      component.teamMembers[0].lastName = '';
      expect(component.isFormValid()).toBe(false);
    });

    it('should be valid with just a name, category, and completed first member', () => {
      component.name = 'Sokolovi';
      component.category = 'M';
      component.teamMembers[0].firstName = 'Ivan';
      component.teamMembers[0].lastName = 'Horvat';
      expect(component.isFormValid()).toBe(true);
    });

    it('should be invalid when a second member row is half-filled (only first or last name given)', () => {
      component.name = 'Sokolovi';
      component.category = 'M';
      component.teamMembers[0].firstName = 'Ivan';
      component.teamMembers[0].lastName = 'Horvat';
      component.addMember();
      component.teamMembers[1].firstName = 'Marko';
      component.teamMembers[1].lastName = '';

      expect(component.isFormValid()).toBe(false);
    });

    it('should be valid when a second member row is left entirely blank (optional)', () => {
      component.name = 'Sokolovi';
      component.category = 'M';
      component.teamMembers[0].firstName = 'Ivan';
      component.teamMembers[0].lastName = 'Horvat';
      component.addMember();

      expect(component.isFormValid()).toBe(true);
    });
  });

  describe('add', () => {
    it('should not close the dialog when the form is invalid', () => {
      component.name = '';
      component.add();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should close with the trimmed name and only the fully-completed members', () => {
      component.name = '  Sokolovi  ';
      component.category = 'M';
      component.teamMembers[0].firstName = 'Ivan';
      component.teamMembers[0].lastName = 'Horvat';
      component.addMember();
      // second member left blank on purpose

      component.add();

      expect(dialogRef.close).toHaveBeenCalledWith({
        name: 'Sokolovi',
        category: 'M',
        members: [{ id: 0, firstName: 'Ivan', lastName: 'Horvat' }]
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
