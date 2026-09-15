import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GulasCompetitor, GulasCriteriaScores, GulasRanking, GulasScore, GulasState } from './models';
import { RealtimeDbGateway } from './realtime-db.gateway';

const EMPTY_CRITERIA: GulasCriteriaScores = { boja: 0, izgled: 0, gustoca: 0, okus: 0, dojam: 0 };

/**
 * Odvojeno stanje od CompetitionService - ocjenjivanje gulaša je potpuno neovisan feature
 * (anonimno, po kodnom imenu, bez veze na timove/natjecatelje sportskog dijela natjecanja).
 * Perzistira se pod zasebnim top-level ključevima u Firebaseu (gulasCompetitors, gulasScores),
 * istim obrascem kao CompetitionService: cijela kolekcija se piše natrag pri svakoj promjeni.
 */
@Injectable({ providedIn: 'root' })
export class GulasService {
  private _state = new BehaviorSubject<GulasState>({ competitors: [], scores: [] });
  state$ = this._state.asObservable();

  constructor(private dbGateway: RealtimeDbGateway) {
    this.dbGateway.observeRoot((data) => {
      if (data) {
        this._state.next({
          competitors: data.gulasCompetitors || [],
          scores: data.gulasScores || []
        });
      }
    });
  }

  get value() { return this._state.getValue(); }

  async addCompetitor(codeName: string) {
    const s = this.value;
    const newId = Math.max(...s.competitors.map(c => c.id), 0) + 1;
    const competitor: GulasCompetitor = { id: newId, codeName: codeName.trim() };
    await this.dbGateway.setCollection('gulasCompetitors', [...s.competitors, competitor]);
  }

  async updateCompetitor(id: number, codeName: string) {
    const s = this.value;
    const index = s.competitors.findIndex(c => c.id === id);
    if (index === -1) return false;

    const updated = [...s.competitors];
    updated[index] = { ...updated[index], codeName: codeName.trim() };
    await this.dbGateway.setCollection('gulasCompetitors', updated);
    return true;
  }

  // Brisanje natjecatelja kaskadno briše i sve njegove ocjene, atomarno (setCollections) da
  // prekid veze usred pisanja ne ostavi ocjene koje upućuju na obrisano kodno ime.
  async deleteCompetitor(id: number) {
    const s = this.value;
    const updatedCompetitors = s.competitors.filter(c => c.id !== id);
    const updatedScores = s.scores.filter(sc => sc.competitorId !== id);
    await this.dbGateway.setCollections({ gulasCompetitors: updatedCompetitors, gulasScores: updatedScores });
  }

  // Upisuje ocjenu jednog suca za jednog natjecatelja; ako sudac već ima ocjenu za tog
  // natjecatelja, prepisuje je (jedan sudac = jedna ocjena po natjecatelju).
  async setScore(competitorId: number, judge: 1 | 2 | 3, criteria: GulasCriteriaScores) {
    const s = this.value;
    const existingIndex = s.scores.findIndex(sc => sc.competitorId === competitorId && sc.judge === judge);

    let updated: GulasScore[];
    if (existingIndex >= 0) {
      updated = [...s.scores];
      updated[existingIndex] = { ...updated[existingIndex], criteria };
    } else {
      const newId = Math.max(...s.scores.map(sc => sc.id), 0) + 1;
      updated = [...s.scores, { id: newId, competitorId, judge, criteria }];
    }

    await this.dbGateway.setCollection('gulasScores', updated);
  }

  getCompetitors(): GulasCompetitor[] {
    return this.value.competitors;
  }

  getScoreFor(competitorId: number, judge: 1 | 2 | 3): GulasScore | undefined {
    return this.value.scores.find(sc => sc.competitorId === competitorId && sc.judge === judge);
  }

  // Natjecatelji kojima nedostaje ocjena barem jednog od tri suca - ne ulaze u konačni poredak
  // (vidi getRankings) dok sva tri suca ne unesu svoju ocjenu.
  getIncompleteCompetitors(): { competitor: GulasCompetitor; judgesScored: number[] }[] {
    const s = this.value;
    return s.competitors
      .map(competitor => ({
        competitor,
        judgesScored: s.scores.filter(sc => sc.competitorId === competitor.id).map(sc => sc.judge).sort()
      }))
      .filter(entry => entry.judgesScored.length < 3);
  }

  private sumCriteria(scores: GulasScore[]): GulasCriteriaScores {
    return scores.reduce((sum, sc) => ({
      boja: sum.boja + sc.criteria.boja,
      izgled: sum.izgled + sc.criteria.izgled,
      gustoca: sum.gustoca + sc.criteria.gustoca,
      okus: sum.okus + sc.criteria.okus,
      dojam: sum.dojam + sc.criteria.dojam
    }), { ...EMPTY_CRITERIA });
  }

  private totalOf(c: GulasCriteriaScores): number {
    return c.boja + c.izgled + c.gustoca + c.okus + c.dojam;
  }

  // Konačni poredak - samo natjecatelji koje su ocijenila sva tri suca ulaze u poredak,
  // sortirano silazno po ukupnim bodovima.
  getRankings(): GulasRanking[] {
    const s = this.value;
    const rankings: GulasRanking[] = [];

    for (const competitor of s.competitors) {
      const scores = s.scores.filter(sc => sc.competitorId === competitor.id);
      if (scores.length < 3) continue;

      const criteriaSums = this.sumCriteria(scores);
      rankings.push({
        rank: 0,
        competitor,
        criteriaSums,
        totalPoints: this.totalOf(criteriaSums)
      });
    }

    rankings.sort((a, b) => b.totalPoints - a.totalPoints);
    rankings.forEach((r, i) => r.rank = i + 1);

    return rankings;
  }

  // "Gotovo natjecanje" - briše sva kodna imena i ocjene, priprema aplikaciju za sljedeće
  // ocjenjivanje gulaša (nova sezona, nova kodna imena). Atomarno, iz istog razloga kao
  // deleteCompetitor.
  async resetGulas() {
    await this.dbGateway.setCollections({ gulasCompetitors: [], gulasScores: [] });
  }
}
