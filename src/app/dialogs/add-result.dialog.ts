import { Component, OnInit } from '@angular/core';
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
  standalone: true,
  selector: 'add-result-dialog',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatAutocompleteModule, MatChipsModule],
  template: `
    <div class="dialog-content">
      <div class="dialog-header">
        <h2>
          <mat-icon color="warn">edit</mat-icon>
          Unos rezultata
        </h2>
      </div>

      <div class="form-group">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Pretraži natjecatelja</mat-label>
          <input matInput
                 [formControl]="competitorSearchControl"
                 [matAutocomplete]="auto"
                 placeholder="Unesite ime, prezime ili tim..."
                 (input)="onSearchInput($event)">
          <mat-icon matSuffix>search</mat-icon>
          <mat-autocomplete #auto="matAutocomplete"
                           [displayWith]="displayCompetitor"
                           (optionSelected)="onCompetitorSelected($event)">
            <mat-option *ngFor="let option of filteredCompetitors | async" [value]="option">
              <div class="competitor-option">
                <div class="competitor-info">
                  <mat-icon class="category-icon" [class.male]="option.category === 'M'" [class.female]="option.category === 'Ž'">
                    {{ option.category === 'M' ? 'man' : 'woman' }}
                  </mat-icon>
                  <span class="competitor-name">{{ option.competitor.firstName }} {{ option.competitor.lastName }}</span>
                </div>
                <div class="team-info">
                  <mat-icon>group</mat-icon>
                  <span>{{ option.teamName }}</span>
                </div>
              </div>
            </mat-option>
            <mat-option *ngIf="(filteredCompetitors | async)?.length === 0 && competitorSearchControl.value"
                       value="add-new" class="add-new-option">
              <div class="add-new-competitor">
                <mat-icon>person_add</mat-icon>
                <span>Dodaj novog natjecatelja "{{ competitorSearchControl.value }}"</span>
              </div>
            </mat-option>
            <mat-option *ngIf="(filteredCompetitors | async)?.length === 0 && !competitorSearchControl.value" disabled>
              <div class="no-results">
                <mat-icon>search_off</mat-icon>
                <span>Počnite tipkati za pretragu...</span>
              </div>
            </mat-option>
          </mat-autocomplete>
        </mat-form-field>

        <!-- Quick team filter buttons -->
        <div class="team-filter-chips" *ngIf="competitorOptions.length > 0">
          <span class="filter-label">Brza pretraga po timu:</span>
          <mat-chip-set>
            <mat-chip *ngFor="let team of getUniqueTeams()"
                     (click)="filterByTeam(team)"
                     [class.selected]="selectedTeamFilter === team">
              {{ team }}
            </mat-chip>
            <mat-chip *ngIf="selectedTeamFilter"
                     (click)="clearTeamFilter()"
                     class="clear-filter">
              <mat-icon>clear</mat-icon>
              Očisti
            </mat-chip>
          </mat-chip-set>
        </div>
      </div>

      <div class="form-group">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Disciplina</mat-label>
          <mat-select [(ngModel)]="disciplineId" [disabled]="!selectedCompetitorCategory">
            <mat-option *ngFor="let discipline of getAvailableDisciplines()" [value]="discipline.id">
              <mat-icon>sports</mat-icon>
              {{discipline.name}}
            </mat-option>
          </mat-select>
          <mat-icon matSuffix>sports_score</mat-icon>
          <mat-hint *ngIf="selectedCompetitorCategory">
            Dostupne discipline za {{ selectedCompetitorCategory === 'M' ? 'muškarce' : 'žene' }}
          </mat-hint>
        </mat-form-field>
      </div>

      <div class="form-group">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Bodovi</mat-label>
          <input matInput type="number" [(ngModel)]="points"
                 min="0"
                 [max]="getSelectedDisciplineMaxPoints()"
                 placeholder="Unesite broj bodova"
                 (input)="onPointsChange()" />
          <mat-icon matSuffix>calculate</mat-icon>
          <mat-hint *ngIf="disciplineId && !validatePoints()">
            Maksimalno bodova: {{ getSelectedDisciplineMaxPoints() }}
            <span class="discipline-info">({{ getSelectedDisciplineName() }})</span>
          </mat-hint>
          <mat-error *ngIf="validatePoints()">
            {{ validatePoints() }}
          </mat-error>
        </mat-form-field>
      </div>

      <!-- Validation info panel -->
      <div class="validation-info" *ngIf="disciplineId">
        <mat-icon [color]="validatePoints() ? 'warn' : 'primary'">info</mat-icon>
        <div class="validation-content">
          <strong>{{ getSelectedDisciplineName() }}:</strong>
          <span>Maksimalno {{ getSelectedDisciplineMaxPoints() }} bodova</span>
          <span *ngIf="getSelectedDisciplineName() === 'TRAP'" class="discipline-details">
            (5 glinenih golubova)
          </span>
          <span *ngIf="getSelectedDisciplineName() === 'PRAČKA'" class="discipline-details">
            (5 meta)
          </span>
          <span *ngIf="getSelectedDisciplineName() === 'ZRAČNA PUŠKA'" class="discipline-details">
            (5 metaka, do 10 bodova po metku)
          </span>
          <span *ngIf="getSelectedDisciplineName() === 'PIKADO'" class="discipline-details">
            (standardni PIKADO format)
          </span>
        </div>
      </div>

      <!-- Selected competitor info -->
      <div *ngIf="selectedCompetitor" class="selected-competitor-info">
        <mat-icon>info</mat-icon>
        <div class="info-content">
          <strong>{{ selectedCompetitor.competitor.firstName }} {{ selectedCompetitor.competitor.lastName }}</strong>
          <span>{{ selectedCompetitor.teamName }} ({{ selectedCompetitor.category === 'M' ? 'Muškarci' : 'Žene' }})</span>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="close()">
          <mat-icon>close</mat-icon>
          Odustani
        </button>
        <button mat-raised-button color="warn" (click)="add()"
                [disabled]="!selectedCompetitor || !disciplineId || points === null || points < 0 || validatePoints() !== null">
          <mat-icon>save</mat-icon>
          Spremi rezultat
        </button>
      </div>
    </div>
  `,
  styles: [`
    .competitor-option {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: 8px 0;
    }

    .competitor-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .competitor-name {
      font-weight: 500;
    }

    .team-info {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #666;
      font-size: 0.9em;
    }

    .category-icon.male {
      color: #1976d2;
    }

    .category-icon.female {
      color: #e91e63;
    }

    .no-results {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #999;
      padding: 16px 0;
      justify-content: center;
    }

    .selected-competitor-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background-color: #e3f2fd;
      border-radius: 8px;
      margin-bottom: 16px;
      border-left: 4px solid #1976d2;
    }

    .info-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-content span {
      color: #666;
      font-size: 0.9em;
    }

    .team-filter-chips {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .filter-label {
      font-weight: 500;
      color: #333;
    }

    mat-chip-option {
      cursor: pointer;
    }

    .selected {
      background-color: #1976d2 !important;
      color: white !important;
    }

    .clear-filter {
      display: flex;
      align-items: center;
      gap: 4px;
      background-color: #f44336;
      color: white;
    }

    .discipline-info {
      font-weight: 500;
      color: #333;
      margin-left: 4px;
    }

    .validation-info {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #e8f5e9;
      padding: 12px;
      border-radius: 8px;
      margin-top: 16px;
    }

    .validation-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .discipline-details {
      font-size: 0.9em;
      color: #666;
    }
  `]
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
