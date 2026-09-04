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
