import { Injectable } from '@angular/core';
import { CompetitionService } from './competition.service';

export interface VerificationIssue {
  severity: 'error' | 'warning';
  message: string;
}

export interface VerificationResult {
  ok: boolean;
  issues: VerificationIssue[];
}

// Provjerava integritet podataka prije PDF izvoza - namjerno NE ponovno računa
// calculateTotalPoints ili poretke (formula ne smije provjeravati samu sebe), nego traži
// strukturne probleme u podacima koji tiho kvare ili gube rezultate: dupli ID-evi, nepostojeće
// reference i pokidan redoslijed rangova.
@Injectable({
  providedIn: 'root'
})
export class ResultsVerificationService {
  constructor(private competitionService: CompetitionService) {}

  verify(): VerificationResult {
    const issues: VerificationIssue[] = [
      ...this.checkDuplicateIds(),
      ...this.checkDuplicateResultsPerCompetitorDiscipline(),
      ...this.checkOrphanedResults(),
      ...this.checkRankSequencing()
    ];

    return { ok: issues.length === 0, issues };
  }

  private checkDuplicateIds(): VerificationIssue[] {
    const competitors = this.competitionService.getAllCompetitors();
    const teams = this.competitionService.getTeams();
    const disciplines = this.competitionService.getDisciplines();
    const results = this.competitionService.getResults();

    return [
      ...this.findDuplicateIds(competitors.map(c => c.id), id => {
        const names = competitors.filter(c => c.id === id).map(c => `${c.firstName} ${c.lastName}`);
        return `Natjecatelji dijele isti ID (${id}): ${names.join(', ')} - rezultati jednog mogu "curiti" na sve ostale u poretku.`;
      }),
      ...this.findDuplicateIds(teams.map(t => t.id), id => {
        const names = teams.filter(t => t.id === id).map(t => t.name);
        return `Dva tima dijele isti ID (${id}): ${names.join(', ')}.`;
      }),
      ...this.findDuplicateIds(disciplines.map(d => d.id), id => {
        const names = disciplines.filter(d => d.id === id).map(d => d.name);
        return `Dvije discipline dijele isti ID (${id}): ${names.join(', ')}.`;
      }),
      ...this.findDuplicateIds(results.map(r => r.id), id =>
        `Dva zapisa rezultata dijele isti ID (${id}).`
      )
    ];
  }

  private findDuplicateIds(ids: number[], message: (id: number) => string): VerificationIssue[] {
    const seen = new Set<number>();
    const duplicates = new Set<number>();

    for (const id of ids) {
      if (seen.has(id)) duplicates.add(id);
      seen.add(id);
    }

    return Array.from(duplicates).map(id => ({ severity: 'error' as const, message: message(id) }));
  }

  private checkDuplicateResultsPerCompetitorDiscipline(): VerificationIssue[] {
    const results = this.competitionService.getResults();
    const seen = new Set<string>();
    const issues: VerificationIssue[] = [];

    for (const result of results) {
      const key = `${result.competitorId}:${result.disciplineId}`;
      if (seen.has(key)) {
        issues.push({
          severity: 'error',
          message: `Više zapisa rezultata za natjecatelja (ID ${result.competitorId}) u istoj disciplini (ID ${result.disciplineId}) - u poretku se koristi samo prvi pronađeni, ostali se tiho ignoriraju.`
        });
      }
      seen.add(key);
    }

    return issues;
  }

  private checkOrphanedResults(): VerificationIssue[] {
    const results = this.competitionService.getResults();
    const competitorIds = new Set(this.competitionService.getAllCompetitors().map(c => c.id));
    const disciplineIds = new Set(this.competitionService.getDisciplines().map(d => d.id));
    const issues: VerificationIssue[] = [];

    for (const result of results) {
      if (!competitorIds.has(result.competitorId)) {
        issues.push({
          severity: 'warning',
          message: `Rezultat (ID ${result.id}) upisan je na nepostojećeg natjecatelja (ID ${result.competitorId}) - neće se prikazati ni u jednom poretku.`
        });
      }
      if (!disciplineIds.has(result.disciplineId)) {
        issues.push({
          severity: 'warning',
          message: `Rezultat (ID ${result.id}) upisan je na nepostojeću disciplinu (ID ${result.disciplineId}) - neće se prikazati ni u jednom poretku.`
        });
      }
    }

    return issues;
  }

  private checkRankSequencing(): VerificationIssue[] {
    const issues: VerificationIssue[] = [];

    const checkRanks = (ranks: number[], label: string) => {
      if (ranks.length === 0) return;
      const sorted = [...ranks].sort((a, b) => a - b);
      const isSequential = sorted.every((rank, index) => rank === index + 1);
      if (!isSequential) {
        issues.push({
          severity: 'error',
          message: `Rangovi u "${label}" nisu ispravan uzastopni niz 1..${sorted.length} - moguća greška u sortiranju/rangiranju.`
        });
      }
    };

    checkRanks(this.competitionService.getCompetitorRankings().map(r => r.rank), 'Pojedinačni poredak');
    checkRanks(this.competitionService.getTeamRankings().map(r => r.rank), 'Ekipni poredak');

    return issues;
  }
}
