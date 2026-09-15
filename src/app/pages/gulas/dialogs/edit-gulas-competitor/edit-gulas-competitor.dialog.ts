import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { GulasCompetitor } from '../../../../core/models';
import { GulasService } from '../../../../core/gulas.service';

@Component({
    selector: 'edit-gulas-competitor-dialog',
    imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatIconModule],
    templateUrl: './edit-gulas-competitor.dialog.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './edit-gulas-competitor.dialog.scss'
})
export class EditGulasCompetitorDialog implements OnInit {
  availableCompetitors: GulasCompetitor[] = [];
  selectedCompetitor: GulasCompetitor | null = null;
  codeName = '';

  constructor(
    private ref: MatDialogRef<EditGulasCompetitorDialog>,
    private gulasService: GulasService
  ) {}

  ngOnInit() {
    this.availableCompetitors = this.gulasService.getCompetitors();
  }

  onCompetitorSelected() {
    this.codeName = this.selectedCompetitor ? this.selectedCompetitor.codeName : '';
  }

  canSave(): boolean {
    return this.selectedCompetitor !== null && this.codeName.trim().length > 0;
  }

  save() {
    if (!this.canSave() || !this.selectedCompetitor) return;
    this.ref.close({ id: this.selectedCompetitor.id, codeName: this.codeName.trim() });
  }

  deleteCompetitor() {
    if (!this.selectedCompetitor) return;

    const confirmDelete = confirm(
      `Jeste li sigurni da želite obrisati kodno ime "${this.selectedCompetitor.codeName}"? ` +
      `Ovime se brišu i sve dosad unesene ocjene za ovog natjecatelja.`
    );

    if (confirmDelete) {
      this.ref.close({ delete: true, competitor: this.selectedCompetitor });
    }
  }

  close() {
    this.ref.close();
  }
}
