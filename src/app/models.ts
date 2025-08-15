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
}

export interface TeamRanking {
  rank: number;
  team: Team;
  disciplineScores: { [disciplineName: string]: number };
  totalPoints: number;
}

export interface AppState {
  teams: Team[];
  disciplines: Discipline[];
  results: Result[];
}
