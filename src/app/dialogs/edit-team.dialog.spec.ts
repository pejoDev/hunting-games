import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { EditTeamDialog } from './edit-team.dialog';
import { CompetitionService } from '../competition.service';
import { RealtimeDbGateway } from '../realtime-db.gateway';
import { FakeRealtimeDbGateway } from '../testing/fake-realtime-db.gateway';
import { Team } from '../models';

describe('EditTeamDialog', () => {
  let component: EditTeamDialog;
  let dialogRef: jasmine.SpyObj<MatDialogRef<EditTeamDialog>>;
  let gateway: FakeRealtimeDbGateway;

  const sokolovi: Team = {
    id: 1,
    name: 'Sokolovi',
    category: 'M',
    members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }]
  };

  beforeEach(() => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    gateway = new FakeRealtimeDbGateway();

    TestBed.configureTestingModule({
      imports: [EditTeamDialog],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        CompetitionService,
        { provide: RealtimeDbGateway, useValue: gateway }
      ]
    });

    // CompetitionService only registers its gateway callback when it's first constructed, so it
    // must be injected before emit() or the emitted snapshot is silently dropped.
    TestBed.inject(CompetitionService);
    gateway.emit({ teams: [sokolovi], disciplines: [], results: [] });
    component = TestBed.createComponent(EditTeamDialog).componentInstance;
    component.ngOnInit();
  });

  it('should load all existing teams as selectable options on init', () => {
    expect(component.availableTeams).toEqual([sokolovi]);
  });

  describe('onTeamSelected', () => {
    it('should populate the form fields from the selected team', () => {
      component.selectedTeam = sokolovi;
      component.onTeamSelected();

      expect(component.teamName).toBe('Sokolovi');
      expect(component.teamCategory).toBe('M');
      expect(component.teamMembers).toEqual(sokolovi.members);
    });

    it('should copy members rather than referencing the original team\'s array', () => {
      component.selectedTeam = sokolovi;
      component.onTeamSelected();
      component.teamMembers[0].firstName = 'Changed';

      expect(sokolovi.members[0].firstName).toBe('Ivan');
    });

    it('should reset the form fields when the selection is cleared', () => {
      component.selectedTeam = sokolovi;
      component.onTeamSelected();

      component.selectedTeam = null;
      component.onTeamSelected();

      expect(component.teamName).toBe('');
      expect(component.teamMembers).toEqual([]);
    });
  });

  describe('addMember', () => {
    it('should do nothing when no team is selected', () => {
      component.selectedTeam = null;
      component.addMember();
      expect(component.teamMembers.length).toBe(0);
    });

    it('should add a member with an id one higher than the highest existing competitor id', () => {
      component.selectedTeam = sokolovi;
      component.onTeamSelected();

      component.addMember();

      expect(component.teamMembers[1].id).toBe(2);
    });
  });

  describe('removeMember', () => {
    it('should remove the member at the given index', () => {
      component.selectedTeam = sokolovi;
      component.onTeamSelected();

      component.removeMember(0);

      expect(component.teamMembers.length).toBe(0);
    });
  });

  describe('canSave', () => {
    it('should be false when no team is selected', () => {
      component.selectedTeam = null;
      expect(component.canSave()).toBe(false);
    });

    it('should be false when the team name is blank', () => {
      component.selectedTeam = sokolovi;
      component.onTeamSelected();
      component.teamName = '   ';
      expect(component.canSave()).toBe(false);
    });

    it('should be false when any member is missing a first or last name', () => {
      component.selectedTeam = sokolovi;
      component.onTeamSelected();
      component.addMember();
      component.teamMembers[1].firstName = 'OnlyFirst';

      expect(component.canSave()).toBe(false);
    });

    it('should be true when the team is selected, named, and all members are complete', () => {
      component.selectedTeam = sokolovi;
      component.onTeamSelected();
      expect(component.canSave()).toBe(true);
    });
  });

  describe('save', () => {
    it('should not close the dialog when the form cannot be saved', () => {
      component.selectedTeam = null;
      component.save();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should close with the updated team, filtering out incomplete members', () => {
      component.selectedTeam = sokolovi;
      component.onTeamSelected();
      component.teamName = '  Sokolovi Novi  ';

      component.save();

      expect(dialogRef.close).toHaveBeenCalledWith({
        id: 1,
        name: 'Sokolovi Novi',
        category: 'M',
        members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }]
      });
    });
  });

  describe('deleteTeam', () => {
    it('should do nothing when no team is selected', () => {
      component.selectedTeam = null;
      component.deleteTeam();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should close with a delete instruction when the user confirms the browser dialog', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.selectedTeam = sokolovi;

      component.deleteTeam();

      expect(dialogRef.close).toHaveBeenCalledWith({ delete: true, team: sokolovi });
    });

    it('should not close the dialog when the user cancels the browser confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      component.selectedTeam = sokolovi;

      component.deleteTeam();

      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close the dialog with no result when cancelled', () => {
      component.close();
      expect(dialogRef.close).toHaveBeenCalledWith();
    });
  });
});
