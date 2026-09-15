import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';

import { GulasService } from '../../core/gulas.service';
import { PdfReportService } from '../../core/pdf-report.service';
import { GulasRanking } from '../../core/models';
import { AddGulasCompetitorDialog } from './dialogs/add-gulas-competitor/add-gulas-competitor.dialog';
import { EditGulasCompetitorDialog } from './dialogs/edit-gulas-competitor/edit-gulas-competitor.dialog';
import { EnterGulasScoreDialog } from './dialogs/enter-gulas-score/enter-gulas-score.dialog';

@Component({
    selector: 'gulas',
    imports: [RouterLink, MatTableModule, MatButtonModule, MatDialogModule, MatIconModule, MatCardModule, MatTooltipModule, MatChipsModule],
    templateUrl: './gulas.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './gulas.component.scss'
})
export class GulasComponent implements OnInit {
  rankings: GulasRanking[] = [];
  incomplete: { competitor: { id: number; codeName: string }; judgesScored: number[] }[] = [];

  displayedColumns = ['rank', 'codeName', 'boja', 'izgled', 'gustoca', 'okus', 'dojam', 'total'];

  constructor(
    private gulasService: GulasService,
    private dialog: MatDialog,
    private pdfReportService: PdfReportService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.gulasService.state$.subscribe(() => this.updateView());
    this.updateView();
  }

  private updateView() {
    this.rankings = this.gulasService.getRankings();
    this.incomplete = this.gulasService.getIncompleteCompetitors();
  }

  openAddCompetitor() {
    const dialogRef = this.dialog.open(AddGulasCompetitorDialog, {
      width: '480px',
      maxWidth: '95vw'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.gulasService.addCompetitor(result.codeName);
      }
    });
  }

  openEditCompetitor() {
    const dialogRef = this.dialog.open(EditGulasCompetitorDialog, {
      width: '480px',
      maxWidth: '95vw'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.delete && result.competitor) {
          this.gulasService.deleteCompetitor(result.competitor.id);
        } else {
          this.gulasService.updateCompetitor(result.id, result.codeName);
        }
      }
    });
  }

  openEnterScore() {
    // Dialog sprema svaku ocjenu izravno preko GulasService (i automatski nastavlja na
    // sljedećeg suca za istog natjecatelja) - ne treba obraditi rezultat pri zatvaranju.
    this.dialog.open(EnterGulasScoreDialog, {
      width: '520px',
      maxWidth: '95vw'
    });
  }

  exportToPdf() {
    if (this.rankings.length === 0) return;
    this.pdfReportService.exportGulasRankingToPdf(this.rankings);
    this.snackBar.open('PDF izvještaj preuzet.', undefined, { duration: 3000 });
  }

  hasCompetitors(): boolean {
    return this.gulasService.getCompetitors().length > 0;
  }

  judgeStatus(judgesScored: number[], judge: number): boolean {
    return judgesScored.includes(judge);
  }

  getRankClass(rank: number): string {
    const baseClass = 'rank-cell';
    if (rank === 1) return `${baseClass} rank-1`;
    if (rank === 2) return `${baseClass} rank-2`;
    if (rank === 3) return `${baseClass} rank-3`;
    return baseClass;
  }

  getRowClass(rank: number): string {
    if (rank === 1) return 'row-winner';
    if (rank <= 3) return 'row-podium';
    return '';
  }

  // "Gotovo ocjenjivanje" - briše sva kodna imena i ocjene, priprema aplikaciju za sljedeće
  // ocjenjivanje gulaša. Nepovratna radnja pa traži potvrdu.
  finishGulas() {
    const competitorCount = this.gulasService.getCompetitors().length;

    const confirmReset = confirm(
      `Jeste li sigurni da želite završiti ocjenjivanje gulaša?\n\n` +
      `Ovo će trajno obrisati ${competitorCount} kodnih imena i sve unesene ocjene.\n\n` +
      `Ova radnja se ne može poništiti.`
    );

    if (confirmReset) {
      this.gulasService.resetGulas();
      this.snackBar.open('Ocjenjivanje gulaša je završeno. Podaci su obrisani.', undefined, { duration: 5000 });
    }
  }
}
