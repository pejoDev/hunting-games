import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Competitor } from '../models';

@Component({
  standalone: true,
  selector: 'add-team-dialog',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatIconModule],
  template: `
    <div class="dialog-content">
      <div class="dialog-header">
        <h2>
          <mat-icon color="primary">group_add</mat-icon>
          Dodaj novi tim
        </h2>
      </div>

      <div class="form-group">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Naziv tima</mat-label>
          <input matInput [(ngModel)]="name" placeholder="Unesite naziv tima" />
          <mat-icon matSuffix>edit</mat-icon>
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

      <!-- Team Members Section -->
      <div class="members-section">
        <div class="members-header">
          <h3>
            <mat-icon>group</mat-icon>
            Članovi tima
          </h3>
          <button mat-button color="accent" (click)="addMember()" [disabled]="teamMembers.length >= 3">
            <mat-icon>person_add</mat-icon>
            Dodaj člana
          </button>
        </div>

        <div class="member-item" *ngFor="let member of teamMembers; let i = index">
          <mat-form-field appearance="outline" style="flex: 1; margin-right: 8px;">
            <mat-label>Ime</mat-label>
            <input matInput [(ngModel)]="member.firstName" placeholder="Ime" />
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex: 1; margin-right: 8px;">
            <mat-label>Prezime</mat-label>
            <input matInput [(ngModel)]="member.lastName" placeholder="Prezime" />
          </mat-form-field>
          <button mat-icon-button color="warn" (click)="removeMember(i)" 
                  [disabled]="i === 0">
            <mat-icon>delete</mat-icon>
          </button>
        </div>

        <div *ngIf="teamMembers.length === 0" class="empty-members">
          <mat-icon>person_off</mat-icon>
          <p>Dodajte barem jednog člana tima</p>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="close()">
          <mat-icon>close</mat-icon>
          Odustani
        </button>
        <button mat-raised-button color="primary" (click)="add()" [disabled]="!isFormValid()">
          <mat-icon>check</mat-icon>
          Dodaj tim
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-content {
      padding: 24px;
      min-width: 500px;
      max-width: 700px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      margin-bottom: 24px;
    }

    .dialog-header h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 1.5rem;
      font-weight: 500;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .members-section {
      margin: 24px 0;
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background-color: #fafafa;
    }

    .members-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .members-header h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 1.1rem;
      font-weight: 500;
    }

    .member-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      padding: 8px;
      background-color: white;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }

    .empty-members {
      text-align: center;
      padding: 32px;
      color: #666;
    }

    .empty-members mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }
  `]
})
export class AddTeamDialog {
  name = '';
  category: 'M' | 'Ž' | '' = '';
  teamMembers: Competitor[] = [];

  constructor(private ref: MatDialogRef<AddTeamDialog>) {
    // Dodaj jedan prazan član kao obavezan
    this.addMember();
  }

  addMember() {
    if (this.teamMembers.length < 3) {
      this.teamMembers.push({
        id: 0, // ID će se postaviti u servisu
        firstName: '',
        lastName: ''
      });
    }
  }

  removeMember(index: number) {
    // Ne dozvoli uklanjanje prvog člana (index 0)
    if (index > 0) {
      this.teamMembers.splice(index, 1);
    }
  }

  isFormValid(): boolean {
    if (!this.name.trim() || !this.category) return false;

    // Provjeri da li je barem prvi član ispunjen
    if (this.teamMembers.length === 0) return false;

    const firstMember = this.teamMembers[0];
    if (!firstMember.firstName.trim() || !firstMember.lastName.trim()) return false;

    // Provjeri da li su svi uneseni članovi kompletno ispunjeni
    return this.teamMembers.every(member =>
      (member.firstName.trim() && member.lastName.trim()) ||
      (!member.firstName.trim() && !member.lastName.trim())
    );
  }

  add() {
    if (!this.isFormValid()) return;

    // Filtriraj samo članove koji imaju uneseno ime i prezime
    const validMembers = this.teamMembers.filter(member =>
      member.firstName.trim() && member.lastName.trim()
    );

    this.ref.close({
      name: this.name.trim(),
      category: this.category,
      members: validMembers
    });
  }

  close() {
    this.ref.close();
  }
}
