import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'add-discipline-dialog',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatIconModule],
  template: `
    <div class="dialog-content">
      <div class="dialog-header">
        <h2>
          <mat-icon color="accent">sports</mat-icon>
          Dodaj novu disciplinu
        </h2>
      </div>

      <div class="form-group">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Naziv discipline</mat-label>
          <input matInput [(ngModel)]="name" placeholder="npr. TRAP, ZRAČNA PUŠKA..." />
          <mat-icon matSuffix>sports_score</mat-icon>
        </mat-form-field>
      </div>

      <div class="form-group">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Kategorija</mat-label>
          <mat-select [(ngModel)]="category">
            <mat-option value="M">
              <mat-icon>man</mat-icon>
              Muškarci
            </mat-option>
            <mat-option value="Ž">
              <mat-icon>woman</mat-icon>
              Žene
            </mat-option>
          </mat-select>
          <mat-icon matSuffix>category</mat-icon>
        </mat-form-field>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="close()">
          <mat-icon>close</mat-icon>
          Odustani
        </button>
        <button mat-raised-button color="accent" (click)="add()" [disabled]="!name.trim() || !category">
          <mat-icon>check</mat-icon>
          Dodaj disciplinu
        </button>
      </div>
    </div>
  `
})
export class AddDisciplineDialog {
  name = '';
  category: 'M' | 'Ž' | '' = '';

  constructor(private ref: MatDialogRef<AddDisciplineDialog>) {}

  add() {
    if (!this.name.trim() || !this.category) return;
    this.ref.close({ name: this.name.trim(), category: this.category });
  }

  close() {
    this.ref.close();
  }
}

