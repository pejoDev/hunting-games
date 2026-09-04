import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { Team, Competitor } from '../../../../core/models';
import { CompetitionService } from '../../../../core/competition.service';

@Component({
    selector: 'edit-team-dialog',
    imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatIconModule],
    templateUrl: './edit-team.dialog.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './edit-team.dialog.scss'
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
