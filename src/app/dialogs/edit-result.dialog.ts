import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { CompetitionService } from '../competition.service';
import { Result, Competitor, Discipline, Team } from '../models';

interface CompetitorResult {
  result: Result;
  competitor: Competitor;
  discipline: Discipline;
  team: Team;
}

@Component({
  standalone: true,
  selector: 'edit-result-dialog',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatIconModule],
  template: `
    <div class="dialog-content">
      <div class="dialog-header">
        <h2>
          <mat-icon color="primary">edit</mat-icon>
          Editiraj rezultat
        </h2>
      </div>

      <!-- Result Selection -->
      <div class="form-group">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Odaberi rezultat za uređivanje</mat-label>
          <mat-select [(ngModel)]="selectedResult" (selectionChange)="onResultSelected()">
            <mat-option value="">-- Odaberi rezultat --</mat-option>
            <mat-option *ngFor="let item of availableResults" [value]="item">
              {{item.competitor.firstName}} {{item.competitor.lastName}} - {{item.discipline.name}} ({{item.result.points}} bodova) - Tim: {{item.team.name}}
            </mat-option>
          </mat-select>
          <mat-icon matSuffix>assignment</mat-icon>
        </mat-form-field>
      </div>

      <!-- Result Details (shown only when result is selected) -->
      <div *ngIf="selectedResult" class="result-details">
        <div class="competitor-info">
          <mat-icon>person</mat-icon>
          <strong>{{selectedResult!.competitor.firstName}} {{selectedResult!.competitor.lastName}}</strong>
          <span class="discipline-badge">{{selectedResult!.discipline.name}}</span>
        </div>

        <div class="form-group">
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Broj bodova</mat-label>
            <input matInput 
                   type="number" 
                   [(ngModel)]="points" 
                   placeholder="Unesite broj bodova"
                   min="0"
                   step="0.1" />
            <mat-icon matSuffix>score</mat-icon>
          </mat-form-field>
        </div>

        <div class="info-box">
          <mat-icon>info</mat-icon>
          <div class="info-content">
            <strong>Disciplina:</strong> {{selectedResult!.discipline.name}}<br>
            <strong>Kategorija:</strong> {{selectedResult!.discipline.category === 'M' ? 'Muškarci' : 'Žene'}}<br>
            <strong>Tim:</strong> {{selectedResult!.team.name}}<br>
            <strong>Trenutni rezultat:</strong> {{selectedResult!.result.points}} bodova
          </div>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="close()">
          <mat-icon>close</mat-icon>
          Odustani
        </button>
        <button mat-raised-button 
                color="primary" 
                (click)="save()" 
                [disabled]="!canSave()">
          <mat-icon>check</mat-icon>
          Spremi promjene
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-content {
      padding: 24px;
      min-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    }
    
    .dialog-header h2 {
      margin: 0 0 20px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    .result-details {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }
    
    .competitor-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding: 12px;
      background-color: #f5f5f5;
      border-radius: 8px;
    }
    
    .discipline-badge {
      background-color: #2196f3;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      margin-left: auto;
    }
    
    .info-box {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px;
      background-color: #e3f2fd;
      border-radius: 8px;
      margin-top: 16px;
    }
    
    .info-box mat-icon {
      color: #1976d2;
      margin-top: 2px;
    }
    
    .info-content {
      font-size: 14px;
      line-height: 1.4;
    }
    
    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }
  `]
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

  canSave(): boolean {
    return this.selectedResult !== null &&
           this.points >= 0 &&
           !isNaN(this.points);
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
