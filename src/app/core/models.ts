export interface Competitor {
  id: number;
  firstName: string;
  lastName: string;
}

export interface Team {
  id: number;
  name: string;
  category: 'M' | 'Ž';
  members: Competitor[];
}

export interface Discipline {
  id: number;
  name: string;
  category: 'M' | 'Ž';
  maxPoints: number;
}

export interface Result {
  id: number;
  competitorId: number;
  disciplineId: number;
  points: number;
}

export interface CompetitorRanking {
  rank: number;
  competitor: Competitor;
  team: string;
  disciplineScores: { [disciplineName: string]: number };
  totalPoints: number;
  // Set when this row shares totalPoints with at least one other row; explains how (or whether)
  // the tie was broken, for transparency in the UI and PDF exports.
  tieNote?: string;
}

export interface TeamRanking {
  rank: number;
  team: Team;
  disciplineScores: { [disciplineName: string]: number };
  totalPoints: number;
  tieNote?: string;
}

export interface AppState {
  teams: Team[];
  disciplines: Discipline[];
  results: Result[];
}

// Natjecatelj u ocjenjivanju lovačkog gulaša - identificiran isključivo kodnim imenom
// (vidi docs/divlje_zivotinje.pdf), bez veze na Competitor/Team iz sportskog dijela natjecanja;
// ocjenjivanje je namjerno anonimno.
export interface GulasCompetitor {
  id: number;
  codeName: string;
}

// Pet kriterija s ocjenjivačkog listića (docs/Ocjenjivacki_listic_Lovacki_gulas_v3.docx),
// jedan po sucu: boja/izgled/gustoća/dojam su 1-5, okus je 1-10 (max 30 po sucu).
export interface GulasCriteriaScores {
  boja: number;
  izgled: number;
  gustoca: number;
  okus: number;
  dojam: number;
}

export interface GulasScore {
  id: number;
  competitorId: number;
  judge: 1 | 2 | 3;
  criteria: GulasCriteriaScores;
}

export interface GulasRanking {
  rank: number;
  competitor: GulasCompetitor;
  // Zbroj svakog kriterija kroz sva tri suca (max 15 za boja/izgled/gustoća/dojam, max 30 za okus).
  criteriaSums: GulasCriteriaScores;
  totalPoints: number; // Zbroj criteriaSums, max 90 (3 suca × max 30)
}

export interface GulasState {
  competitors: GulasCompetitor[];
  scores: GulasScore[];
}
