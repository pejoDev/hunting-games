import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import { VerificationIssue } from '../../../../core/results-verification.service';

export interface VerificationIssuesDialogData {
  issues: VerificationIssue[];
}

@Component({
    selector: 'verification-issues-dialog',
    imports: [MatDialogModule, MatButtonModule, MatIconModule, MatListModule],
    templateUrl: './verification-issues.dialog.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './verification-issues.dialog.scss'
})
export class VerificationIssuesDialog {
  issues: VerificationIssue[];

  constructor(
    private ref: MatDialogRef<VerificationIssuesDialog>,
    @Inject(MAT_DIALOG_DATA) data: VerificationIssuesDialogData
  ) {
    this.issues = data.issues;
  }

  cancel() {
    this.ref.close(false);
  }

  downloadAnyway() {
    this.ref.close(true);
  }
}
