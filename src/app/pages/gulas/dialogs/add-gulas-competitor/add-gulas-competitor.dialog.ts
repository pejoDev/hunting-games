import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'add-gulas-competitor-dialog',
    imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
    templateUrl: './add-gulas-competitor.dialog.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './add-gulas-competitor.dialog.scss'
})
export class AddGulasCompetitorDialog {
  codeName = '';

  constructor(private ref: MatDialogRef<AddGulasCompetitorDialog>) {}

  isFormValid(): boolean {
    return this.codeName.trim().length > 0;
  }

  add() {
    if (!this.isFormValid()) return;
    this.ref.close({ codeName: this.codeName.trim() });
  }

  close() {
    this.ref.close();
  }
}
