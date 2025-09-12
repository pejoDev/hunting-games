import { Component, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { CompetitionService } from './competition.service';
import { PdfReportService } from './pdf-report.service';
import { AddTeamDialog } from './dialogs/add-team.dialog';
import { EditTeamDialog } from './dialogs/edit-team.dialog';
import { AddResultDialog } from './dialogs/add-result.dialog';
import { CompetitorRanking, TeamRanking } from './models';

@Component({
  standalone: true,
  selector: 'overview',
  imports: [CommonModule, MatTableModule, MatButtonModule, MatDialogModule, MatSelectModule, MatFormFieldModule, MatIconModule, MatCardModule, MatTooltipModule],
  template: `
    <!-- Control Panel -->
    <div class="control-panel">
      <button mat-raised-button color="primary" (click)="openAddTeam()">
        <mat-icon>group_add</mat-icon>
        Dodaj tim
      </button>
      <button mat-raised-button color="accent" (click)="openEditTeamSelector()">
        <mat-icon>edit</mat-icon>
        Editiraj tim
      </button>
      <button mat-raised-button color="warn" (click)="openAddResult()">
        <mat-icon>edit</mat-icon>
        Unos rezultata
      </button>
      
      <!-- PDF Export buttons -->
      <div class="pdf-controls">
        <button mat-raised-button 
                color="primary" 
                [disabled]="!hasData()" 
                (click)="exportCurrentViewToPdf()"
                class="pdf-button">
          <mat-icon>picture_as_pdf</mat-icon>
          Izvoz u PDF
        </button>
        <button mat-raised-button 
                color="accent" 
                [disabled]="!hasData()" 
                (click)="exportCompleteReport()"
                class="pdf-button">
          <mat-icon>description</mat-icon>
          Kompletan izvještaj
        </button>
      </div>
      
      <div class="filter-controls">
        <mat-form-field appearance="outline">
          <mat-label>Prikaz</mat-label>
          <mat-select [(value)]="viewMode" (selectionChange)="updateView()">
            <mat-option value="individual">
              <mat-icon>person</mat-icon>
              Pojedinačni poredak
            </mat-option>
            <mat-option value="team">
              <mat-icon>groups</mat-icon>
              Ekipni poredak
            </mat-option>
          </mat-select>
        </mat-form-field>
        
        <mat-form-field appearance="outline">
          <mat-label>Kategorija</mat-label>
          <mat-select [(value)]="selectedCategory" (selectionChange)="updateView()">
            <mat-option value="">Sve kategorije</mat-option>
            <mat-option value="M">
              <mat-icon>man</mat-icon>
              Muškarci
            </mat-option>
            <mat-option value="Ž">
              <mat-icon>woman</mat-icon>
              Žene
            </mat-option>
          </mat-select>
        </mat-form-field>
      </div>
    </div>

    <!-- Pojedinačni poredak -->
    <div *ngIf="viewMode === 'individual'" class="card">
      <div class="section-header">
        <mat-icon color="primary">person</mat-icon>
        <h3>Pojedinačni Poredak</h3>
        <span *ngIf="selectedCategory" 
              [class]="'category-badge ' + (selectedCategory === 'M' ? 'male' : 'female')">
          {{ selectedCategory === 'M' ? 'Muškarci' : 'Žene' }}
        </span>
        
        <!-- Individual PDF export button -->
        <button mat-icon-button 
                color="primary" 
                [disabled]="competitorRows.length === 0"
                (click)="exportIndividualToPdf()"
                matTooltip="Izvoz pojedinačnog poretka u PDF"
                class="export-button">
          <mat-icon>download</mat-icon>
        </button>
      </div>
      
      <!-- Formula explanation -->
      <div class="formula-info" *ngIf="selectedCategory">
        <mat-icon>calculate</mat-icon>
        <div class="formula-content">
          <strong>Balansirana formula bodovanja:</strong>
          <span *ngIf="selectedCategory === 'M'">
            TRAP × 20 + ZRAČNA PUŠKA × 2 + PRAČKA × 20
          </span>
          <span *ngIf="selectedCategory === 'Ž'">
            ZRAČNA PUŠKA × 2 + PRAČKA × 20 + PIKADO × 0,33
          </span>
          <small class="formula-explanation">
            <em *ngIf="selectedCategory === 'M'">
              Maksimalni utjecaj: TRAP (5×20=100), ZRAČNA (50×2=100), PRAČKA (5×20=100). Sve discipline jednako važne!
            </em>
            <em *ngIf="selectedCategory === 'Ž'">
              Maksimalni utjecaj: ZRAČNA (50×2=100), PRAČKA (5×20=100), PIKADO (300×0,33≈100). Fer natjecanje!
            </em>
          </small>
        </div>
      </div>
      
      <div *ngIf="competitorRows.length === 0" class="empty-state">
        <mat-icon>sentiment_dissatisfied</mat-icon>
        <p>Nema dostupnih rezultata za prikaz</p>
      </div>
      
      <table *ngIf="competitorRows.length > 0" mat-table [dataSource]="competitorRows" class="modern-table">
        <ng-container matColumnDef="rank">
          <th mat-header-cell *matHeaderCellDef>
            <mat-icon style="vertical-align: middle; margin-right: 8px;">military_tech</mat-icon>
            Rang
          </th>
          <td mat-cell *matCellDef="let r">
            <span [class]="getRankClass(r.rank)">{{r.rank}}</span>
          </td>
        </ng-container>
        
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>
            <mat-icon style="vertical-align: middle; margin-right: 8px;">badge</mat-icon>
            Ime i Prezime
          </th>
          <td mat-cell *matCellDef="let r">{{r.competitor.firstName}} {{r.competitor.lastName}}</td>
        </ng-container>
        
        <ng-container matColumnDef="team">
          <th mat-header-cell *matHeaderCellDef>
            <mat-icon style="vertical-align: middle; margin-right: 8px;">group</mat-icon>
            Tim
          </th>
          <td mat-cell *matCellDef="let r">{{r.team}}</td>
        </ng-container>
        
        <ng-container *ngFor="let discipline of getDisciplineColumns()" [matColumnDef]="discipline">
          <th mat-header-cell *matHeaderCellDef>{{discipline}}</th>
          <td mat-cell *matCellDef="let r">
            <span [class]="getScoreClass(r.disciplineScores[discipline])">
              {{r.disciplineScores[discipline] || 0}}
            </span>
          </td>
        </ng-container>
        
        <ng-container matColumnDef="total">
          <th mat-header-cell *matHeaderCellDef>
            <mat-icon style="vertical-align: middle; margin-right: 8px;">calculate</mat-icon>
            Ukupno (formula)
          </th>
          <td mat-cell *matCellDef="let r">
            <span class="total-points">{{formatPoints(r.totalPoints)}}</span>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="individualDisplayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: individualDisplayedColumns" 
            [class]="getRowClass(row.rank)"></tr>
      </table>
    </div>

    <!-- Ekipni poredak -->
    <div *ngIf="viewMode === 'team'" class="card">
      <div class="section-header">
        <mat-icon color="primary">groups</mat-icon>
        <h3>Ekipni Poredak</h3>
        <span *ngIf="selectedCategory" 
              [class]="'category-badge ' + (selectedCategory === 'M' ? 'male' : 'female')">
          {{ selectedCategory === 'M' ? 'Muškarci' : 'Žene' }}
        </span>
        
        <!-- Team PDF export button -->
        <button mat-icon-button 
                color="primary" 
                [disabled]="teamRows.length === 0"
                (click)="exportTeamToPdf()"
                matTooltip="Izvoz ekipnog poretka u PDF"
                class="export-button">
          <mat-icon>download</mat-icon>
        </button>
      </div>
      
      <!-- Formula explanation -->
      <div class="formula-info" *ngIf="selectedCategory">
        <mat-icon>calculate</mat-icon>
        <div class="formula-content">
          <strong>Formula bodovanja (zbroj svih članova):</strong>
          <span *ngIf="selectedCategory === 'M'">
            TRAP × 20 + ZRAČNA PUŠKA × 2 + PRAČKA × 20
          </span>
          <span *ngIf="selectedCategory === 'Ž'">
            ZRAČNA PUŠKA × 2 + PRAČKA × 20 + PIKADO × 0,33
          </span>
        </div>
      </div>
      
      <div *ngIf="teamRows.length === 0" class="empty-state">
        <mat-icon>sentiment_dissatisfied</mat-icon>
        <p>Nema dostupnih timova za prikaz</p>
      </div>
      
      <table *ngIf="teamRows.length > 0" mat-table [dataSource]="teamRows" class="modern-table">
        <ng-container matColumnDef="rank">
          <th mat-header-cell *matHeaderCellDef>
            <mat-icon style="vertical-align: middle; margin-right: 8px;">military_tech</mat-icon>
            Rang
          </th>
          <td mat-cell *matCellDef="let r">
            <span [class]="getRankClass(r.rank)">{{r.rank}}</span>
          </td>
        </ng-container>
        
        <ng-container matColumnDef="teamName">
          <th mat-header-cell *matHeaderCellDef>
            <mat-icon style="vertical-align: middle; margin-right: 8px;">group</mat-icon>
            Naziv Ekipe
          </th>
          <td mat-cell *matCellDef="let r">{{r.team.name}}</td>
        </ng-container>
        
        <ng-container *ngFor="let discipline of getDisciplineColumns()" [matColumnDef]="discipline">
          <th mat-header-cell *matHeaderCellDef>{{discipline}}</th>
          <td mat-cell *matCellDef="let r">
            <span [class]="getScoreClass(r.disciplineScores[discipline])">
              {{r.disciplineScores[discipline] || 0}}
            </span>
          </td>
        </ng-container>
        
        <ng-container matColumnDef="total">
          <th mat-header-cell *matHeaderCellDef>
            <mat-icon style="vertical-align: middle; margin-right: 8px;">calculate</mat-icon>
            Ukupno (formula)
          </th>
          <td mat-cell *matCellDef="let r">
            <span class="total-points">{{formatPoints(r.totalPoints)}}</span>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="teamDisplayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: teamDisplayedColumns" 
            [class]="getRowClass(row.rank)"></tr>
      </table>
    </div>
  `,
  styles: [`
    .score-high {
      color: #4caf50;
      font-weight: 600;
    }
    
    .score-medium {
      color: #ff9800;
      font-weight: 500;
    }
    
    .score-low {
      color: #f44336;
    }
    
    .row-winner {
      background-color: #fff3e0 !important;
    }
    
    .row-podium {
      background-color: #f3e5f5 !important;
    }

    .control-panel {
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .pdf-controls {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .pdf-button {
      min-width: 140px;
    }
    
    .export-button {
      margin-left: auto;
    }
    
    .filter-controls {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .card {
      margin-bottom: 20px;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      background-color: #fff;
    }

    .section-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;
      position: relative;
    }

    .section-header mat-icon {
      font-size: 24px;
      margin-right: 8px;
    }

    .category-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 14px;
      margin-left: auto;
    }

    .category-badge.male {
      background-color: #e3f2fd;
      color: #0d47a1;
    }

    .category-badge.female {
      background-color: #f3e5f5;
      color: #6a1b9a;
    }

    .empty-state {
      text-align: center;
      padding: 40px 0;
      color: #999;
    }

    .modern-table {
      width: 100%;
      border-collapse: collapse;
    }

    .modern-table th, .modern-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }

    .modern-table th {
      background-color: #f5f5f5;
      font-weight: 500;
    }

    .rank-cell {
      display: flex;
      align-items: center;
    }

    .rank-1 {
      color: #ffd700;
    }

    .rank-2 {
      color: #c0c0c0;
    }

    .rank-3 {
      color: #cd7f32;
    }

    .total-points {
      font-weight: 600;
      font-size: 16px;
    }

    .formula-info {
      background-color: #f9f9f9;
      border-left: 4px solid #2196f3;
      padding: 12px;
      margin-bottom: 16px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .formula-content {
      font-size: 14px;
      color: #333;
    }

    .formula-explanation {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
  `]
})
export class OverviewComponent implements OnInit {
  viewMode: 'individual' | 'team' = 'individual';
  selectedCategory: 'M' | 'Ž' | '' = '';

  competitorRows: CompetitorRanking[] = [];
  teamRows: TeamRanking[] = [];

  individualDisplayedColumns: string[] = [];
  teamDisplayedColumns: string[] = [];

  constructor(
    private competitionService: CompetitionService,
    private dialog: MatDialog,
    private pdfReportService: PdfReportService
  ) {}

  ngOnInit() {
    this.competitionService.state$.subscribe(() => {
      this.updateView();
    });
    this.updateView();
  }

  updateView() {
    if (this.viewMode === 'individual') {
      const category = this.selectedCategory || undefined;
      this.competitorRows = this.competitionService.getCompetitorRankings(category as 'M' | 'Ž');
      this.updateIndividualColumns();
    } else {
      const category = this.selectedCategory || undefined;
      this.teamRows = this.competitionService.getTeamRankings(category as 'M' | 'Ž');
      this.updateTeamColumns();
    }
  }

  getDisciplineColumns(): string[] {
    const category = this.selectedCategory as 'M' | 'Ž' || undefined;
    if (category) {
      return this.competitionService.getDisciplinesForCategory(category).map(d => d.name);
    }

    // Ako nema kategorije, prikaži sve discipline
    return this.competitionService.getDisciplines().map(d => d.name);
  }

  updateIndividualColumns() {
    const disciplineColumns = this.getDisciplineColumns();
    this.individualDisplayedColumns = ['rank', 'name', 'team', ...disciplineColumns, 'total'];
  }

  updateTeamColumns() {
    const disciplineColumns = this.getDisciplineColumns();
    this.teamDisplayedColumns = ['rank', 'teamName', ...disciplineColumns, 'total'];
  }

  openAddTeam() {
    const dialogRef = this.dialog.open(AddTeamDialog, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.competitionService.addTeam(result.name, result.category);
      }
    });
  }

  openEditTeamSelector() {
    const dialogRef = this.dialog.open(EditTeamDialog, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.competitionService.updateTeam(result.id, result.name, result.category, result.members);
      }
    });
  }

  openAddResult() {
    const dialogRef = this.dialog.open(AddResultDialog, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.competitionService.addResult(result.competitorId, result.disciplineId, result.points);
      }
    });
  }

  exportCurrentViewToPdf() {
    if (this.viewMode === 'individual') {
      this.exportIndividualToPdf();
    } else {
      this.exportTeamToPdf();
    }
  }

  exportIndividualToPdf() {
    const category = this.selectedCategory || undefined;
    const data = this.competitionService.getCompetitorRankings(category as 'M' | 'Ž');
    const disciplines = this.competitionService.getDisciplinesForCategory(category as 'M' | 'Ž');

    this.pdfReportService.exportIndividualRankingToPdf(data, disciplines, this.selectedCategory);
  }

  exportTeamToPdf() {
    const category = this.selectedCategory || undefined;
    const data = this.competitionService.getTeamRankings(category as 'M' | 'Ž');
    const disciplines = this.competitionService.getDisciplinesForCategory(category as 'M' | 'Ž');

    this.pdfReportService.exportTeamRankingToPdf(data, disciplines, this.selectedCategory);
  }

  exportCompleteReport() {
    const category = this.selectedCategory || undefined;
    const individualData = this.competitionService.getCompetitorRankings(category as 'M' | 'Ž');
    const teamData = this.competitionService.getTeamRankings(category as 'M' | 'Ž');
    const disciplines = this.competitionService.getDisciplinesForCategory(category as 'M' | 'Ž');

    this.pdfReportService.exportCompleteReportToPdf(individualData, teamData, disciplines, this.selectedCategory);
  }

  hasData(): boolean {
    if (this.viewMode === 'individual') {
      return this.competitorRows.length > 0;
    } else {
      return this.teamRows.length > 0;
    }
  }

  getRankClass(rank: number): string {
    const baseClass = 'rank-cell';
    if (rank === 1) return `${baseClass} rank-1`;
    if (rank === 2) return `${baseClass} rank-2`;
    if (rank === 3) return `${baseClass} rank-3`;
    return baseClass;
  }

  getScoreClass(score: number): string {
    if (!score) return '';
    if (score >= 50) return 'score-high';
    if (score >= 25) return 'score-medium';
    return 'score-low';
  }

  getRowClass(rank: number): string {
    if (rank === 1) return 'row-winner';
    if (rank <= 3) return 'row-podium';
    return '';
  }

  formatPoints(points: number): string {
    return points.toString().replace('.', ',');
  }
}
