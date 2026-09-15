import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { GulasCompetitor, GulasCriteriaScores } from '../../../../core/models';
import { GulasService } from '../../../../core/gulas.service';

// Kriteriji i raspon bodova kako stoje na ocjenjivačkom listiću (vidi
// docs/Ocjenjivacki_listic_Lovacki_gulas_v3.docx) - četiri kriterija 1-5, okus 1-10, max 30 po sucu.
interface CriterionField {
  key: 'boja' | 'izgled' | 'gustoca' | 'okus' | 'dojam';
  label: string;
  min: number;
  max: number;
}

type JudgeNum = 1 | 2 | 3;

@Component({
    selector: 'enter-gulas-score-dialog',
    imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatIconModule],
    templateUrl: './enter-gulas-score.dialog.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './enter-gulas-score.dialog.scss'
})
export class EnterGulasScoreDialog implements OnInit {
  readonly criteria: CriterionField[] = [
    { key: 'boja', label: '1. Boja gulaša', min: 1, max: 5 },
    { key: 'izgled', label: '2. Izgled divljačine (rezanje, mekoća)', min: 1, max: 5 },
    { key: 'gustoca', label: '3. Odgovarajuća gustoća gulaša', min: 1, max: 5 },
    { key: 'okus', label: '4. Okus divljačine', min: 1, max: 10 },
    { key: 'dojam', label: '5. Ukupan dojam', min: 1, max: 5 }
  ];
  readonly judges: JudgeNum[] = [1, 2, 3];

  availableCompetitors: GulasCompetitor[] = [];
  selectedCompetitor: GulasCompetitor | null = null;
  selectedJudge: JudgeNum | null = null;

  values: { [key: string]: number | null } = { boja: null, izgled: null, gustoca: null, okus: null, dojam: null };

  // Postavljeno nakon što je spremljen zadnji (treći) sudac za trenutnog natjecatelja - prikazuje
  // "gotovo" panel umjesto forme, dok korisnik ne odabere idi na sljedećeg natjecatelja ili zatvori.
  justCompletedCodeName: string | null = null;
  saving = false;

  constructor(
    private ref: MatDialogRef<EnterGulasScoreDialog>,
    private gulasService: GulasService
  ) {}

  ngOnInit() {
    this.availableCompetitors = this.gulasService.getCompetitors();
  }

  // Prvi sudac (po redu 1→2→3) koji još nema ocjenu za ovog natjecatelja; null ako su sva tri
  // suca već ocijenila (natjecatelj kompletan).
  private nextUnscoredJudge(competitorId: number): JudgeNum | null {
    return this.judges.find(j => !this.gulasService.getScoreFor(competitorId, j)) ?? null;
  }

  judgeState(judge: JudgeNum): 'done' | 'current' | 'pending' {
    if (!this.selectedCompetitor) return 'pending';
    if (this.gulasService.getScoreFor(this.selectedCompetitor.id, judge)) return 'done';
    if (this.selectedJudge === judge) return 'current';
    return 'pending';
  }

  // Odabir natjecatelja - automatski skoči na prvog suca koji ga još nije ocijenio (redoslijed
  // 1→2→3), da organizator ne mora ručno birati suca pri prelasku na sljedećeg natjecatelja. Ako
  // je natjecatelj već kompletan (sva 3 suca), otvara na sucu 1 radi eventualne ispravke.
  onCompetitorSelected() {
    this.justCompletedCodeName = null;
    if (!this.selectedCompetitor) {
      this.selectedJudge = null;
      this.resetValues();
      return;
    }
    this.selectedJudge = this.nextUnscoredJudge(this.selectedCompetitor.id) ?? 1;
    this.loadJudgeValues();
  }

  onJudgeSelected() {
    this.justCompletedCodeName = null;
    this.loadJudgeValues();
  }

  private loadJudgeValues() {
    if (!this.selectedCompetitor || !this.selectedJudge) return;
    const existing = this.gulasService.getScoreFor(this.selectedCompetitor.id, this.selectedJudge);
    this.values = existing ? { ...existing.criteria } : { boja: null, izgled: null, gustoca: null, okus: null, dojam: null };
  }

  private resetValues() {
    this.values = { boja: null, izgled: null, gustoca: null, okus: null, dojam: null };
  }

  isAlreadyScored(): boolean {
    if (!this.selectedCompetitor || !this.selectedJudge) return false;
    return !!this.gulasService.getScoreFor(this.selectedCompetitor.id, this.selectedJudge);
  }

  // Ima li natjecatelj JOŠ neocijenjenih sudaca nakon što bi se trenutni spremio - određuje hoće
  // li gumb za spremanje nastaviti na sljedećeg suca ili prikazati "gotovo" panel.
  hasMoreJudgesAfterSave(): boolean {
    if (!this.selectedCompetitor || !this.selectedJudge) return false;
    const remaining = this.judges.filter(j => j !== this.selectedJudge && !this.gulasService.getScoreFor(this.selectedCompetitor!.id, j));
    return remaining.length > 0;
  }

  getTotal(): number {
    return this.criteria.reduce((sum, c) => sum + (this.values[c.key] || 0), 0);
  }

  fieldError(field: CriterionField): string | null {
    const value = this.values[field.key];
    if (value === null || value === undefined) return null;
    if (!Number.isInteger(value)) return 'Ocjena mora biti cijeli broj';
    if (value < field.min || value > field.max) return `Ocjena mora biti između ${field.min} i ${field.max}`;
    return null;
  }

  canSave(): boolean {
    if (!this.selectedCompetitor || !this.selectedJudge) return false;
    return this.criteria.every(field => {
      const value = this.values[field.key];
      return value !== null && value !== undefined && !this.fieldError(field);
    });
  }

  async save() {
    if (!this.canSave() || !this.selectedCompetitor || !this.selectedJudge || this.saving) return;

    this.saving = true;
    const competitor = this.selectedCompetitor;
    try {
      await this.gulasService.setScore(competitor.id, this.selectedJudge, {
        boja: this.values['boja']!,
        izgled: this.values['izgled']!,
        gustoca: this.values['gustoca']!,
        okus: this.values['okus']!,
        dojam: this.values['dojam']!
      });
    } finally {
      this.saving = false;
    }

    const next = this.nextUnscoredJudge(competitor.id);
    if (next) {
      this.selectedJudge = next;
      this.resetValues();
    } else {
      this.justCompletedCodeName = competitor.codeName;
      this.selectedCompetitor = null;
      this.selectedJudge = null;
      this.resetValues();
    }
  }

  // Nakon "gotovo" panela - vrati formu na prazan odabir natjecatelja, dialog ostaje otvoren za
  // brz nastavak na sljedećeg natjecatelja bez ponovnog otvaranja dialoga.
  startNextCompetitor() {
    this.justCompletedCodeName = null;
    this.selectedCompetitor = null;
    this.selectedJudge = null;
    this.resetValues();
  }

  close() {
    this.ref.close();
  }
}
