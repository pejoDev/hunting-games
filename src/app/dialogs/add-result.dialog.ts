import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { CompetitionService } from '../competition.service';
import { Competitor, Discipline, Team } from '../models';

interface CompetitorOption {
  competitor: Competitor;
  teamName: string;
  category: 'M' | 'Ž';
  displayText: string;
}

@Component({
    selector: 'add-result-dialog',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatAutocompleteModule, MatChipsModule],
    templateUrl: './add-result.dialog.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './add-result.dialog.scss'
})
export class AddResultDialog implements OnInit {
  competitorSearchControl = new FormControl('');
  filteredCompetitors: Observable<CompetitorOption[]>;

  competitorOptions: CompetitorOption[] = [];
  selectedCompetitor: CompetitorOption | null = null;
  disciplineId: number | null = null;
  points: number | null = null;
  selectedCompetitorCategory: 'M' | 'Ž' | null = null;
  selectedTeamFilter: string | null = null;

  constructor(
    private ref: MatDialogRef<AddResultDialog>,
    public competitionService: CompetitionService
  ) {
    this.filteredCompetitors = this.competitorSearchControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterCompetitors(value || ''))
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

  private _filterCompetitors(value: string | CompetitorOption): CompetitorOption[] {
    if (typeof value !== 'string') {
      return this.competitorOptions;
    }

    const filterValue = value.toLowerCase();

    // Ako je odabran team filter, prvo filtriraj po timu, zatim po search termu
    let filteredOptions = this.competitorOptions;

    if (this.selectedTeamFilter) {
      filteredOptions = this.competitorOptions.filter(option =>
        option.teamName === this.selectedTeamFilter
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

  // Maksimalni bodovi po disciplini
  private getMaxPoints(disciplineName: string): number {
    switch (disciplineName) {
      case 'TRAP': return 5;
      case 'PRAČKA': return 5;
      case 'ZRAČNA PUŠKA': return 50;
      case 'PIKADO': return 300;
      default: return 100; // Default maksimum za nepoznate discipline
    }
  }

  // Dohvaćanje maksimalnih bodova za odabranu disciplinu
  getSelectedDisciplineMaxPoints(): number {
    if (!this.disciplineId) return 100;
    const discipline = this.competitionService.getDisciplines().find(d => d.id === this.disciplineId);
    return discipline ? this.getMaxPoints(discipline.name) : 100;
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

  filterByTeam(team: string) {
    this.selectedTeamFilter = team;
    this.competitorSearchControl.setValue(team);
    // Filtriranje će se automatski obaviti kroz valueChanges observable
  }

  clearTeamFilter() {
    this.selectedTeamFilter = null;
    this.competitorSearchControl.setValue('');
    // Filtriranje će se automatski obaviti kroz valueChanges observable
  }

  getSelectedDisciplineName(): string {
    const discipline = this.competitionService.getDisciplines().find(d => d.id === this.disciplineId);
    return discipline ? discipline.name : '';
  }

  onPointsChange() {
    // Ovdje možete dodati dodatnu logiku ako je potrebna prilikom promjene bodova
  }
}
