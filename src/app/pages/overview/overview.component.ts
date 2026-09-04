import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CompetitionService } from '../../core/competition.service';
import { PdfReportService } from '../../core/pdf-report.service';
import { AddTeamDialog } from './dialogs/add-team/add-team.dialog';
import { EditTeamDialog } from './dialogs/edit-team/edit-team.dialog';
import { AddResultDialog } from './dialogs/add-result/add-result.dialog';
import { CompetitorRanking, TeamRanking } from '../../core/models';
import { EditResultDialog } from './dialogs/edit-result/edit-result.dialog';

@Component({
    selector: 'overview',
    imports: [MatTableModule, MatButtonModule, MatDialogModule, MatSelectModule, MatFormFieldModule, MatIconModule, MatCardModule, MatTooltipModule],
    templateUrl: './overview.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './overview.component.scss'
})
export class OverviewComponent implements OnInit {
  // Kad je true (javna /pracenje stranica), sakrivaju se sve akcije za uređivanje.
  @Input() readOnly = false;

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
      width: '600px', // Povećaj širinu zbog dodanih članova
      maxWidth: '95vw'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.competitionService.addTeam(result.name, result.category, result.members);
      }
    });
  }

  openEditTeamSelector() {
    const dialogRef = this.dialog.open(EditTeamDialog, {
      width: '600px',
      maxWidth: '95vw'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.delete && result.team) {
          // Handle team deletion
          this.competitionService.deleteTeam(result.team.id);
        } else {
          // Handle team update
          this.competitionService.updateTeam(result.id, result.name, result.category, result.members);
        }
      }
    });
  }

  openAddResult() {
    const dialogRef = this.dialog.open(AddResultDialog, {
      width: '500px',
      maxWidth: '95vw'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.competitionService.addResult(result.competitorId, result.disciplineId, result.points);
      }
    });
  }

  openEditResult() {
    const dialogRef = this.dialog.open(EditResultDialog, {
      width: '500px',
      maxWidth: '95vw'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.competitionService.updateResult(
          result.id,
          result.competitorId,
          result.disciplineId,
          result.points
        );
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
