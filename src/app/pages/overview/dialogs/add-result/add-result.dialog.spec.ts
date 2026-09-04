import { TestBed } from '@angular/core/testing';
import { skip } from 'rxjs/operators';
import { MatDialogRef } from '@angular/material/dialog';
import { AddResultDialog } from './add-result.dialog';
import { CompetitionService } from '../../../../core/competition.service';
import { RealtimeDbGateway } from '../../../../core/realtime-db.gateway';
import { FakeRealtimeDbGateway } from '../../../../testing/fake-realtime-db.gateway';
import { Team, Discipline } from '../../../../core/models';

describe('AddResultDialog', () => {
  let component: AddResultDialog;
  let dialogRef: jasmine.SpyObj<MatDialogRef<AddResultDialog>>;
  let gateway: FakeRealtimeDbGateway;

  const sokolovi: Team = {
    id: 1, name: 'Sokolovi', category: 'M',
    members: [{ id: 1, firstName: 'Ivan', lastName: 'Horvat' }, { id: 2, firstName: 'Marko', lastName: 'Kos' }]
  };
  const orlice: Team = {
    id: 2, name: 'Orlice', category: 'Ž',
    members: [{ id: 3, firstName: 'Ana', lastName: 'Ban' }]
  };
  const disciplines: Discipline[] = [
    { id: 1, name: 'TRAP', category: 'M', maxPoints: 5 },
    { id: 2, name: 'ZRAČNA PUŠKA', category: 'M', maxPoints: 50 },
    { id: 3, name: 'PIKADO', category: 'Ž', maxPoints: 300 }
  ];

  beforeEach(() => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    gateway = new FakeRealtimeDbGateway();

    TestBed.configureTestingModule({
      imports: [AddResultDialog],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        CompetitionService,
        { provide: RealtimeDbGateway, useValue: gateway }
      ]
    });

    // CompetitionService only registers its gateway callback when it's first constructed, so it
    // must be injected before emit() or the emitted snapshot is silently dropped.
    TestBed.inject(CompetitionService);
    gateway.emit({ teams: [sokolovi, orlice], disciplines, results: [] });
    component = TestBed.createComponent(AddResultDialog).componentInstance;
    component.ngOnInit();
  });

  it('should load every competitor from every team as a searchable option', () => {
    expect(component.competitorOptions.length).toBe(3);
    expect(component.competitorOptions.map(o => o.displayText)).toContain('Ivan Horvat (Sokolovi)');
  });

  describe('competitor search filtering', () => {
    it('should filter competitors by first or last name (case-insensitive)', (done) => {
      component.filteredCompetitors.subscribe(results => {
        if (results.length === 1) {
          expect(results[0].competitor.firstName).toBe('Marko');
          done();
        }
      });
      component.competitorSearchControl.setValue('marko');
    });

    it('should filter competitors by team name', (done) => {
      component.filteredCompetitors.subscribe(results => {
        if (results.length === 1 && results[0].teamName === 'Orlice') {
          expect(results[0].competitor.firstName).toBe('Ana');
          done();
        }
      });
      component.competitorSearchControl.setValue('orlice');
    });

    it('should return all competitors for an empty search term', (done) => {
      // startWith('') makes the observable emit the full list synchronously on subscribe.
      component.filteredCompetitors.subscribe(results => {
        expect(results.length).toBe(3);
        done();
      });
    });

    it('should return every option unfiltered when the control value is the selected object itself, not free text', (done) => {
      // The autocomplete writes the chosen CompetitorOption object back into the control via
      // displayWith; filtering must not choke on a non-string value.
      const option = component.competitorOptions[0];
      component.filteredCompetitors.pipe(skip(1)).subscribe(results => {
        expect(results.length).toBe(3);
        done();
      });
      component.competitorSearchControl.setValue(option as any);
    });
  });

  describe('displayCompetitor', () => {
    it('should render the option\'s display text', () => {
      const option = component.competitorOptions[0];
      expect(component.displayCompetitor(option)).toBe(option.displayText);
    });

    it('should render an empty string when there is no option (control cleared)', () => {
      expect(component.displayCompetitor(null as any)).toBe('');
    });
  });

  describe('team quick-filter chips', () => {
    it('getUniqueTeams should list each distinct team name once', () => {
      expect(component.getUniqueTeams()).toEqual(['Sokolovi', 'Orlice']);
    });

    it('filterByTeam should restrict the search to that team\'s members', (done) => {
      component.filterByTeam('Sokolovi');
      component.filteredCompetitors.subscribe(results => {
        expect(results.every(r => r.teamName === 'Sokolovi')).toBe(true);
        done();
      });
    });

    it('clearTeamFilter should remove the team restriction', () => {
      component.filterByTeam('Sokolovi');
      component.clearTeamFilter();
      expect(component.selectedTeamFilter).toBeNull();
    });
  });

  describe('onCompetitorSelected / onSearchInput', () => {
    it('should set the selected competitor and its category, and reset the discipline choice', () => {
      const option = component.competitorOptions[0];
      component.disciplineId = 5;

      component.onCompetitorSelected({ option: { value: option } });

      expect(component.selectedCompetitor).toBe(option);
      expect(component.selectedCompetitorCategory).toBe(option.category);
      expect(component.disciplineId).toBeNull();
    });

    it('should clear the selection when the user types free text after selecting someone', () => {
      component.selectedCompetitor = component.competitorOptions[0];
      component.selectedCompetitorCategory = 'M';
      component.disciplineId = 1;

      component.onSearchInput({});

      expect(component.selectedCompetitor).toBeNull();
      expect(component.selectedCompetitorCategory).toBeNull();
      expect(component.disciplineId).toBeNull();
    });
  });

  describe('getAvailableDisciplines', () => {
    it('should return no disciplines until a competitor (and thus category) is selected', () => {
      expect(component.getAvailableDisciplines()).toEqual([]);
    });

    it('should return only the disciplines for the selected competitor\'s category', () => {
      component.selectedCompetitorCategory = 'Ž';
      expect(component.getAvailableDisciplines().map(d => d.name)).toEqual(['PIKADO']);
    });
  });

  describe('max points and validation per discipline', () => {
    it('should read max points from the selected discipline record', () => {
      component.disciplineId = 1; // TRAP
      expect(component.getSelectedDisciplineMaxPoints()).toBe(5);

      component.disciplineId = 2; // ZRAČNA PUŠKA
      expect(component.getSelectedDisciplineMaxPoints()).toBe(50);

      component.disciplineId = 3; // PIKADO
      expect(component.getSelectedDisciplineMaxPoints()).toBe(300);
    });

    it('should reflect a discipline\'s configured maxPoints regardless of its name', () => {
      gateway.emit({ teams: [sokolovi, orlice], disciplines: [...disciplines, { id: 4, name: 'NOVA DISCIPLINA', category: 'M', maxPoints: 42 }], results: [] });
      component.disciplineId = 4;
      expect(component.getSelectedDisciplineMaxPoints()).toBe(42);
    });

    it('should default to 100 max points when no discipline is selected', () => {
      component.disciplineId = null;
      expect(component.getSelectedDisciplineMaxPoints()).toBe(100);
    });

    it('should flag negative points as invalid', () => {
      component.disciplineId = 1;
      component.points = -1;
      expect(component.validatePoints()).toBe('Bodovi ne mogu biti negativni');
    });

    it('should flag points above the discipline maximum as invalid', () => {
      component.disciplineId = 1; // TRAP, max 5
      component.points = 6;
      expect(component.validatePoints()).toContain('5');
    });

    it('should accept points within the valid range', () => {
      component.disciplineId = 1;
      component.points = 5;
      expect(component.validatePoints()).toBeNull();
    });

    it('should not validate (return null) when no points have been entered yet', () => {
      component.points = null;
      expect(component.validatePoints()).toBeNull();
    });
  });

  describe('getSelectedDisciplineName', () => {
    it('should return the name of the currently selected discipline', () => {
      component.disciplineId = 1;
      expect(component.getSelectedDisciplineName()).toBe('TRAP');
    });

    it('should return an empty string when no discipline is selected', () => {
      component.disciplineId = null;
      expect(component.getSelectedDisciplineName()).toBe('');
    });
  });

  describe('add', () => {
    it('should not close the dialog when no competitor is selected', () => {
      component.selectedCompetitor = null;
      component.disciplineId = 1;
      component.points = 3;
      component.add();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should not close the dialog when points are negative', () => {
      component.selectedCompetitor = component.competitorOptions[0];
      component.disciplineId = 1;
      component.points = -1;
      component.add();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('should close with the competitor, discipline and points when the form is valid', () => {
      component.selectedCompetitor = component.competitorOptions[0]; // Ivan, id 1
      component.disciplineId = 1;
      component.points = 4;

      component.add();

      expect(dialogRef.close).toHaveBeenCalledWith({ competitorId: 1, disciplineId: 1, points: 4 });
    });
  });

  describe('close', () => {
    it('should close the dialog with no result when cancelled', () => {
      component.close();
      expect(dialogRef.close).toHaveBeenCalledWith();
    });
  });
});
