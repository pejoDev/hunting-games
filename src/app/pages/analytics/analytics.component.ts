import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { CompetitionService } from '../../core/competition.service';
import { AppState, Team } from '../../core/models';

interface SeasonStats {
  label: string;
  teams: number;
  teamsM: number;
  teamsZ: number;
  competitors: number;
  competitorsM: number;
  competitorsZ: number;
}

interface ComparisonRow {
  label: string;
  current: number;
  past: number;
}

interface TableRow {
  metric: string;
  past: number;
  current: number;
  delta: number;
}

const PAST_SEASON_YEAR = 2025;
const PAST_SEASON_FILE = 'assets/backup/hunting-games-2025.json';

function summarizeTeams(teams: Team[], label: string): SeasonStats {
  const teamsM = teams.filter(t => t.category === 'M');
  const teamsZ = teams.filter(t => t.category === 'Ž');
  return {
    label,
    teams: teams.length,
    teamsM: teamsM.length,
    teamsZ: teamsZ.length,
    competitors: teams.reduce((sum, t) => sum + t.members.length, 0),
    competitorsM: teamsM.reduce((sum, t) => sum + t.members.length, 0),
    competitorsZ: teamsZ.reduce((sum, t) => sum + t.members.length, 0)
  };
}

@Component({
    selector: 'app-analytics',
    imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatTableModule],
    templateUrl: './analytics.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent implements OnInit {
  readonly currentYear = new Date().getFullYear();
  readonly pastYear = PAST_SEASON_YEAR;

  current: SeasonStats | null = null;
  past: SeasonStats | null = null;
  loadError = false;

  constructor(private competitionService: CompetitionService, private http: HttpClient) {}

  ngOnInit() {
    this.competitionService.state$.subscribe(state => {
      this.current = summarizeTeams(state.teams, String(this.currentYear));
    });

    this.http.get<AppState>(PAST_SEASON_FILE).subscribe({
      next: data => {
        this.past = summarizeTeams(data.teams || [], String(this.pastYear));
      },
      error: () => {
        this.loadError = true;
      }
    });
  }

  get loading(): boolean {
    return !this.current || (!this.past && !this.loadError);
  }

  get competitorRows(): ComparisonRow[] {
    if (!this.current || !this.past) return [];
    return [
      { label: 'Ukupno', current: this.current.competitors, past: this.past.competitors },
      { label: 'Muškarci', current: this.current.competitorsM, past: this.past.competitorsM },
      { label: 'Žene', current: this.current.competitorsZ, past: this.past.competitorsZ }
    ];
  }

  get maxCompetitorValue(): number {
    return Math.max(1, ...this.competitorRows.flatMap(r => [r.current, r.past]));
  }

  barWidth(value: number): string {
    return `${Math.round((value / this.maxCompetitorValue) * 100)}%`;
  }

  get totalDelta(): number {
    if (!this.current || !this.past) return 0;
    return this.current.competitors - this.past.competitors;
  }

  get totalDeltaPercent(): number | null {
    if (!this.current || !this.past || this.past.competitors === 0) return null;
    return Math.round((this.totalDelta / this.past.competitors) * 100);
  }

  readonly tableDisplayedColumns = ['metric', 'past', 'current', 'delta'];

  get tableRows(): TableRow[] {
    if (!this.current || !this.past) return [];
    const c = this.current;
    const p = this.past;
    return [
      { metric: 'Sudionici - ukupno', past: p.competitors, current: c.competitors, delta: c.competitors - p.competitors },
      { metric: 'Sudionici - muškarci', past: p.competitorsM, current: c.competitorsM, delta: c.competitorsM - p.competitorsM },
      { metric: 'Sudionici - žene', past: p.competitorsZ, current: c.competitorsZ, delta: c.competitorsZ - p.competitorsZ },
      { metric: 'Ekipe - ukupno', past: p.teams, current: c.teams, delta: c.teams - p.teams },
      { metric: 'Ekipe - muškarci', past: p.teamsM, current: c.teamsM, delta: c.teamsM - p.teamsM },
      { metric: 'Ekipe - žene', past: p.teamsZ, current: c.teamsZ, delta: c.teamsZ - p.teamsZ }
    ];
  }
}
