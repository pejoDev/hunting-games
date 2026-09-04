import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { CompetitionService } from '../../../../core/competition.service';
import { Result, Competitor, Discipline, Team } from '../../../../core/models';

interface CompetitorResult {
  result: Result;
  competitor: Competitor;
  discipline: Discipline;
  team: Team;
}

@Component({
    selector: 'edit-result-dialog',
    imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatIconModule],
    templateUrl: './edit-result.dialog.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './edit-result.dialog.scss'
})
export class EditResultDialog implements OnInit {
  availableResults: CompetitorResult[] = [];
  selectedResult: CompetitorResult | null = null;
  points: number = 0;

  constructor(
    private ref: MatDialogRef<EditResultDialog>,
    private competitionService: CompetitionService
  ) {}

  ngOnInit() {
    this.loadAvailableResults();
  }

  loadAvailableResults() {
    const results = this.competitionService.getResults();
    const competitors = this.competitionService.getAllCompetitors();
    const disciplines = this.competitionService.getDisciplines();
    const teams = this.competitionService.getTeams();

    this.availableResults = results.map(result => {
      const competitor = competitors.find(c => c.id === result.competitorId)!;
      const discipline = disciplines.find(d => d.id === result.disciplineId)!;
      // Find the team that contains this competitor
      const team = teams.find(t => t.members.some(m => m.id === competitor.id))!;
      return { result, competitor, discipline, team };
    });

    // Sort by competitor name for better UX
    this.availableResults.sort((a, b) => {
      const nameA = `${a.competitor.firstName} ${a.competitor.lastName}`;
      const nameB = `${b.competitor.firstName} ${b.competitor.lastName}`;
      return nameA.localeCompare(nameB);
    });
  }

  onResultSelected() {
    if (this.selectedResult) {
      this.points = this.selectedResult.result.points;
    } else {
      this.points = 0;
    }
  }

  // Validacija unosa bodova
  validatePoints(): string | null {
    if (!this.selectedResult || this.points === null || this.points === undefined || isNaN(this.points)) return null;

    const maxPoints = this.selectedResult.discipline.maxPoints;
    if (this.points < 0) return 'Bodovi ne mogu biti negativni';
    if (this.points > maxPoints) return `Maksimalan broj bodova za ovu disciplinu je ${maxPoints}`;

    return null;
  }

  canSave(): boolean {
    return this.selectedResult !== null &&
           this.points >= 0 &&
           !isNaN(this.points) &&
           this.points <= this.selectedResult.discipline.maxPoints;
  }

  save() {
    if (!this.canSave() || !this.selectedResult) return;

    const updatedResult = {
      id: this.selectedResult.result.id,
      competitorId: this.selectedResult.result.competitorId,
      disciplineId: this.selectedResult.result.disciplineId,
      points: this.points
    };

    this.ref.close(updatedResult);
  }

  close() {
    this.ref.close();
  }
}
