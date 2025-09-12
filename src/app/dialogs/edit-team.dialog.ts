import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Team, Competitor } from '../models';
import { CompetitionService } from '../competition.service';

@Component({
  standalone: true,
  selector: 'edit-team-dialog',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatIconModule],
  template: `
    <div class="dialog-content">
      <div class="dialog-header">
        <h2>
          <mat-icon color="primary">edit</mat-icon>
          Editiraj tim
        </h2>
      </div>

      <!-- Team Selection -->
      <div class="form-group">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Odaberi tim za uređivanje</mat-label>
          <mat-select [(ngModel)]="selectedTeam" (selectionChange)="onTeamSelected()">
            <mat-option value="">-- Odaberi tim --</mat-option>
            <mat-option *ngFor="let team of availableTeams" [value]="team">
              {{team.name}} ({{team.category === 'M' ? 'Muškarci' : 'Žene'}})
            </mat-option>
          </mat-select>
          <mat-icon matSuffix>groups</mat-icon>
        </mat-form-field>
      </div>

      <!-- Team Details (shown only when team is selected) -->
      <div *ngIf="selectedTeam" class="team-details">
        <div class="form-group">
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Naziv tima</mat-label>
            <input matInput [(ngModel)]="teamName" placeholder="Unesite naziv tima" />
            <mat-icon matSuffix>edit</mat-icon>
          </mat-form-field>
        </div>

        <div class="form-group">
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Kategorija</mat-label>
            <mat-select [(ngModel)]="teamCategory">
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

        <!-- Team Members -->
        <div class="members-section">
          <div class="members-header">
            <h3>
              <mat-icon>group</mat-icon>
              Članovi tima
            </h3>
            <button mat-button color="accent" (click)="addMember()">
              <mat-icon>person_add</mat-icon>
              Dodaj člana
            </button>
          </div>

          <div *ngIf="teamMembers.length === 0" class="empty-members">
            <mat-icon>person_off</mat-icon>
            <p>Nema članova u timu</p>
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
            <button mat-icon-button color="warn" (click)="removeMember(i)" matTooltip="Ukloni člana">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <div class="dialog-actions">
        <!-- Delete button on the left -->
        <button mat-raised-button 
                color="warn" 
                (click)="deleteTeam()" 
                [disabled]="!selectedTeam"
                class="delete-button">
          <mat-icon>delete_forever</mat-icon>
          Obriši tim
        </button>
        
        <!-- Spacer to push other buttons to the right -->
        <div class="spacer"></div>
        
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
    
    .team-details {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }
    
    .members-section {
      margin: 20px 0;
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
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666;
    }
    
    .empty-members {
      text-align: center;
      padding: 20px;
      color: #999;
    }
    
    .empty-members mat-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      margin-bottom: 8px;
    }
    
    .member-item {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      padding: 12px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .dialog-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }
    
    .delete-button {
      margin-right: auto;
    }
    
    .spacer {
      flex: 1;
    }
  `]
})
export class EditTeamDialog implements OnInit {
  availableTeams: Team[] = [];
  selectedTeam: Team | null = null;
  teamName = '';
  teamCategory: 'M' | 'Ž' = 'M';
  teamMembers: Competitor[] = [];

  constructor(
    private ref: MatDialogRef<EditTeamDialog>,
    private competitionService: CompetitionService
  ) {}

  ngOnInit() {
    // Dohvati sve dostupne timove
    this.availableTeams = this.competitionService.getTeams();
  }

  onTeamSelected() {
    if (this.selectedTeam) {
      // Popuni podatke odabranog tima
      this.teamName = this.selectedTeam.name;
      this.teamCategory = this.selectedTeam.category;
      // Kreiraj kopije članova da ne mijenjamo originale
      this.teamMembers = this.selectedTeam.members.map(m => ({ ...m }));
    } else {
      // Resetiraj podatke
      this.teamName = '';
      this.teamCategory = 'M';
      this.teamMembers = [];
    }
  }

  addMember() {
    if (!this.selectedTeam) return;

    // Generiraj novi ID
    const allMembers = this.competitionService.getAllCompetitors();
    const newId = Math.max(...allMembers.map(m => m.id), 0) + 1;

    this.teamMembers.push({
      id: newId,
      firstName: '',
      lastName: ''
    });
  }

  removeMember(index: number) {
    this.teamMembers.splice(index, 1);
  }

  canSave(): boolean {
    if (!this.selectedTeam || !this.teamName.trim()) return false;

    // Provjeri da svi članovi imaju ime i prezime
    return this.teamMembers.every(m => m.firstName.trim() && m.lastName.trim());
  }

  save() {
    if (!this.canSave() || !this.selectedTeam) return;

    const updatedTeam: Team = {
      id: this.selectedTeam.id,
      name: this.teamName.trim(),
      category: this.teamCategory,
      members: this.teamMembers.filter(m => m.firstName.trim() && m.lastName.trim())
    };

    this.ref.close(updatedTeam);
  }

  deleteTeam() {
    if (!this.selectedTeam) return;

    const confirmDelete = confirm(`Jeste li sigurni da želite obrisati tim "${this.selectedTeam.name}"?`);

    if (confirmDelete) {
      this.ref.close({ delete: true, team: this.selectedTeam });
    }
  }

  close() {
    this.ref.close();
  }
}
