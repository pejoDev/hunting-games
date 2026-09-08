import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { CompetitionService } from '../../../../core/competition.service';
import { Competitor, Discipline, Team } from '../../../../core/models';

interface CompetitorOption {
  competitor: Competitor;
  teamName: string;
  category: 'M' | 'Ž';
  displayText: string;
}

@Component({
    selector: 'add-result-dialog',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatAutocompleteModule],
    templateUrl: './add-result.dialog.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './add-result.dialog.scss'
})
export class AddResultDialog implements OnInit {
  competitorSearchControl = new FormControl('');
  filteredCompetitors: Observable<CompetitorOption[]>;

  teamFilterControl = new FormControl('');
  filteredTeamOptions: Observable<string[]>;
  private teamFilterSubject = new BehaviorSubject<string | null>(null);

  competitorOptions: CompetitorOption[] = [];
  selectedCompetitor: CompetitorOption | null = null;
  disciplineId: number | null = null;
  points: number | null = null;
  selectedCompetitorCategory: 'M' | 'Ž' | null = null;

  get selectedTeamFilter(): string | null {
    return this.teamFilterSubject.value;
  }

  constructor(
    private ref: MatDialogRef<AddResultDialog>,
    public competitionService: CompetitionService
  ) {
    this.filteredCompetitors = combineLatest([
      this.competitorSearchControl.valueChanges.pipe(startWith('')),
      this.teamFilterSubject
    ]).pipe(
      map(([value, teamFilter]) => this._filterCompetitors(value || '', teamFilter))
    );

    this.filteredTeamOptions = this.teamFilterControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterTeams(value || ''))
    );
  }

  ngOnInit() {
    this.loadCompetitorOptions();
  }

  loadCompetitorOptions() {
    const teams = this.competitionService.getTeams();
    this.competitorOptions = [];

    for (const team of teams) {
      for (const competitor of team.members) {
        this.competitorOptions.push({
          competitor,
          teamName: team.name,
          category: team.category,
          displayText: `${competitor.firstName} ${competitor.lastName} (${team.name})`
        });
      }
    }
  }

  private _filterCompetitors(value: string | CompetitorOption, teamFilter: string | null): CompetitorOption[] {
    if (typeof value !== 'string') {
      return this.competitorOptions;
    }

    const filterValue = value.toLowerCase();

    // Ako je odabran team filter, prvo filtriraj po timu, zatim po search termu
    let filteredOptions = this.competitorOptions;

    if (teamFilter) {
      filteredOptions = this.competitorOptions.filter(option =>
        option.teamName === teamFilter
      );
    }

    if (!filterValue) {
      return filteredOptions;
    }

    return filteredOptions.filter(option => {
      const fullName = `${option.competitor.firstName} ${option.competitor.lastName}`.toLowerCase();
      const teamName = option.teamName.toLowerCase();

      return fullName.includes(filterValue) ||
             teamName.includes(filterValue) ||
             option.competitor.firstName.toLowerCase().includes(filterValue) ||
             option.competitor.lastName.toLowerCase().includes(filterValue);
    });
  }

  displayCompetitor(option: CompetitorOption): string {
    return option ? option.displayText : '';
  }

  onSearchInput(event: any) {
    // Resetuj selection ako user ručno mijenja tekst
    if (typeof this.competitorSearchControl.value === 'string') {
      this.selectedCompetitor = null;
      this.selectedCompetitorCategory = null;
      this.disciplineId = null;
    }
  }

  onCompetitorSelected(event: any) {
    this.selectedCompetitor = event.option.value;
    this.selectedCompetitorCategory = this.selectedCompetitor!.category;
    this.disciplineId = null; // Reset discipline selection
  }

  getAvailableDisciplines(): Discipline[] {
    if (!this.selectedCompetitorCategory) return [];
    return this.competitionService.getDisciplinesForCategory(this.selectedCompetitorCategory);
  }

  // Dohvaćanje maksimalnih bodova za odabranu disciplinu
  getSelectedDisciplineMaxPoints(): number {
    if (!this.disciplineId) return 100;
    const discipline = this.competitionService.getDisciplines().find(d => d.id === this.disciplineId);
    return discipline ? discipline.maxPoints : 100;
  }

  // Validacija unosa bodova
  validatePoints(): string | null {
    if (this.points === null || this.points === undefined) return null;

    const maxPoints = this.getSelectedDisciplineMaxPoints();
    if (this.points < 0) return 'Bodovi ne mogu biti negativni';
    if (this.points > maxPoints) return `Maksimalan broj bodova za ovu disciplinu je ${maxPoints}`;

    return null;
  }

  add() {
    if (!this.selectedCompetitor || !this.disciplineId || this.points === null || this.points < 0) return;
    this.ref.close({
      competitorId: this.selectedCompetitor.competitor.id,
      disciplineId: this.disciplineId,
      points: this.points
    });
  }

  close() {
    this.ref.close();
  }

  getUniqueTeams(): string[] {
    const teams = this.competitionService.getTeams();
    const teamNames = teams.map(team => team.name);
    return Array.from(new Set(teamNames));
  }

  private _filterTeams(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.getUniqueTeams().filter(team => team.toLowerCase().includes(filterValue));
  }

  onTeamSelected(event: MatAutocompleteSelectedEvent) {
    this.filterByTeam(event.option.value);
  }

  filterByTeam(team: string) {
    this.teamFilterSubject.next(team);
    this.teamFilterControl.setValue(team);
  }

  clearTeamFilter() {
    this.teamFilterSubject.next(null);
    this.teamFilterControl.setValue('');
  }

  getSelectedDisciplineName(): string {
    const discipline = this.competitionService.getDisciplines().find(d => d.id === this.disciplineId);
    return discipline ? discipline.name : '';
  }

  onPointsChange() {
    // Ovdje možete dodati dodatnu logiku ako je potrebna prilikom promjene bodova
  }
}
