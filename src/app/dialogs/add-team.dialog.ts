import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { Competitor } from '../models';

@Component({
    selector: 'add-team-dialog',
    imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatIconModule],
    templateUrl: './add-team.dialog.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './add-team.dialog.scss'
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
