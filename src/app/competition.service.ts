import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Team, Discipline, Result, AppState, Competitor, CompetitorRanking, TeamRanking } from './models';

@Injectable({ providedIn: 'root' })
export class CompetitionService {
  private _state = new BehaviorSubject<AppState>({ teams: [], disciplines: [], results: [] });
  state$ = this._state.asObservable();

  constructor(private http: HttpClient) {
    this.loadInitialData();
  }

  get value() { return this._state.getValue(); }

  private loadInitialData() {
    this.http.get<AppState>('/assets/competition-data.json').subscribe(data => {
      this._state.next(data);
    });
  }

  // Dodavanje tima
  addTeam(name: string, category: 'M' | 'Ž') {
    const s = this.value;
    const newId = Math.max(...s.teams.map(t => t.id), 0) + 1;
    const team: Team = {
      id: newId,
      name: name.trim(),
      category,
      members: []
    };
    s.teams = [...s.teams, team];
    this._state.next(s);
  }

  // Dodavanje natjecatelja u tim
  addCompetitorToTeam(teamId: number, firstName: string, lastName: string) {
    const s = this.value;
    const team = s.teams.find(t => t.id === teamId);
    if (!team || team.members.length >= 3) return false;

    const newId = Math.max(...s.teams.flatMap(t => t.members.map(m => m.id)), 0) + 1;
    const competitor: Competitor = {
      id: newId,
      firstName: firstName.trim(),
      lastName: lastName.trim()
    };

    team.members = [...team.members, competitor];
    this._state.next(s);
    return true;
  }

  // Dodavanje discipline
  addDiscipline(name: string, category: 'M' | 'Ž') {
    const s = this.value;
    const newId = Math.max(...s.disciplines.map(d => d.id), 0) + 1;
    const discipline: Discipline = {
      id: newId,
      name: name.trim(),
      category
    };
    s.disciplines = [...s.disciplines, discipline];
    this._state.next(s);
  }

  // Dodavanje rezultata
  addResult(competitorId: number, disciplineId: number, points: number) {
    const s = this.value;
    const newId = Math.max(...s.results.map(r => r.id), 0) + 1;

    // Provjeri da li već postoji rezultat za ovog natjecatelja u ovoj disciplini
    const existingIndex = s.results.findIndex(r =>
      r.competitorId === competitorId && r.disciplineId === disciplineId
    );

    const result: Result = {
      id: existingIndex >= 0 ? s.results[existingIndex].id : newId,
      competitorId,
      disciplineId,
      points
    };

    if (existingIndex >= 0) {
      s.results[existingIndex] = result;
    } else {
      s.results = [...s.results, result];
    }

    this._state.next(s);
  }

  // Dohvaćanje disciplina za kategoriju
  getDisciplinesForCategory(category: 'M' | 'Ž'): Discipline[] {
    return this.value.disciplines.filter(d => d.category === category);
  }

  // Izračun ukupnih bodova prema balansiranoj formuli (na temelju maksimalnih bodova)
  calculateTotalPoints(disciplineScores: { [disciplineName: string]: number }, category: 'M' | 'Ž'): number {
    let total = 0;

    if (category === 'M') {
      // BALANSIRANA FORMULA za muškarce:
      // TRAP: max 5 bodova → koef. 20 (5×20=100 max utjecaj)
      // ZRAČNA: max 50 bodova → koef. 2 (50×2=100 max utjecaj)
      // PRAČKA: max 5 bodova → koef. 20 (5×20=100 max utjecaj)
      // Sada sve discipline imaju jednaki maksimalni utjecaj od 100 bodova
      total = (disciplineScores['TRAP'] || 0) * 20 +
              (disciplineScores['ZRAČNA PUŠKA'] || 0) * 2 +
              (disciplineScores['PRAČKA'] || 0) * 20;
    } else {
      // BALANSIRANA FORMULA za žene:
      // ZRAČNA: max 50 bodova → koef. 2 (50×2=100 max utjecaj)
      // PRAČKA: max 5 bodova → koef. 20 (5×20=100 max utjecaj)
      // PIKADO: max 300 bodova → koef. 0.33 (300×0.33≈100 max utjecaj)
      // Sve discipline imaju približno jednaki maksimalni utjecaj od ~100 bodova
      total = (disciplineScores['ZRAČNA PUŠKA'] || 0) * 2 +
              (disciplineScores['PRAČKA'] || 0) * 20 +
              (disciplineScores['PIKADO'] || 0) * 0.33;
    }

    // Zaokružuj na 2 decimale
    return Math.round(total * 100) / 100;
  }

  // Izračun pojedinačnog poretka
  getCompetitorRankings(category?: 'M' | 'Ž'): CompetitorRanking[] {
    const state = this.value;
    const rankings: CompetitorRanking[] = [];

    // Dohvati sve natjecatelje iz timova odgovarajuće kategorije
    const teams = category ? state.teams.filter(t => t.category === category) : state.teams;

    for (const team of teams) {
      for (const competitor of team.members) {
        const disciplineScores: { [disciplineName: string]: number } = {};

        // Dohvati rezultate za ovog natjecatelja
        const competitorResults = state.results.filter(r => r.competitorId === competitor.id);
        const relevantDisciplines = this.getDisciplinesForCategory(team.category);

        for (const discipline of relevantDisciplines) {
          const result = competitorResults.find(r => r.disciplineId === discipline.id);
          const points = result ? result.points : 0;
          disciplineScores[discipline.name] = points;
        }

        // Koristi novu formulu za izračun ukupnih bodova
        const totalPoints = this.calculateTotalPoints(disciplineScores, team.category);

        rankings.push({
          rank: 0, // Postavit ćemo nakon sortiranja
          competitor,
          team: team.name,
          disciplineScores,
          totalPoints
        });
      }
    }

    // Sortiraj po ukupnim bodovima (silazno) i postavi rang
    rankings.sort((a, b) => b.totalPoints - a.totalPoints);
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    return rankings;
  }

  // Izračun ekipnog poretka
  getTeamRankings(category?: 'M' | 'Ž'): TeamRanking[] {
    const state = this.value;
    const rankings: TeamRanking[] = [];

    const teams = category ? state.teams.filter(t => t.category === category) : state.teams;

    for (const team of teams) {
      const disciplineScores: { [disciplineName: string]: number } = {};
      const relevantDisciplines = this.getDisciplinesForCategory(team.category);

      for (const discipline of relevantDisciplines) {
        let disciplineTotal = 0;

        // Zbrojiti bodove svih članova tima u ovoj disciplini
        for (const member of team.members) {
          const result = state.results.find(r =>
            r.competitorId === member.id && r.disciplineId === discipline.id
          );
          disciplineTotal += result ? result.points : 0;
        }

        disciplineScores[discipline.name] = disciplineTotal;
      }

      // Koristi novu formulu za izračun ukupnih bodova
      const totalPoints = this.calculateTotalPoints(disciplineScores, team.category);

      rankings.push({
        rank: 0, // Postavit ćemo nakon sortiranja
        team,
        disciplineScores,
        totalPoints
      });
    }

    // Sortiraj po ukupnim bodovima (silazno) i postavi rang
    rankings.sort((a, b) => b.totalPoints - a.totalPoints);
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    return rankings;
  }

  // Dohvaćanje svih timova
  getTeams(): Team[] {
    return this.value.teams;
  }

  // Dohvaćanje svih disciplina
  getDisciplines(): Discipline[] {
    return this.value.disciplines;
  }

  // Dohvaćanje svih natjecatelja
  getAllCompetitors(): Competitor[] {
    return this.value.teams.flatMap(team => team.members);
  }
}


