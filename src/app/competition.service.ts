import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Database, ref, onValue, set, push, update, remove } from '@angular/fire/database';
import { Team, Discipline, Result, AppState, Competitor, CompetitorRanking, TeamRanking } from './models';

@Injectable({ providedIn: 'root' })
export class CompetitionService {
  private _state = new BehaviorSubject<AppState>({ teams: [], disciplines: [], results: [] });
  state$ = this._state.asObservable();

  constructor(private db: Database) {
    this.loadInitialData();
  }

  get value() { return this._state.getValue(); }

  private loadInitialData() {
    const competitionRef = ref(this.db);
    console.log(competitionRef);
    onValue(competitionRef, (snapshot) => {
      const data = snapshot.val();
      console.log(data);
      if (data) {
        this._state.next({
          teams: data.teams || [],
          disciplines: data.disciplines || [],
          results: data.results || []
        });
      }
    });
  }

  // Dodavanje tima
  async addTeam(name: string, category: 'M' | 'Ž', members: Competitor[] = []) {
    const s = this.value;
    const newTeamId = Math.max(...s.teams.map(t => t.id), 0) + 1;

    // Generiraj ID-jeve za nove članove
    const allMembers = s.teams.flatMap(t => (t.members || []));
    let nextMemberId = allMembers.length > 0 ? Math.max(...allMembers.map(m => m.id), 0) + 1 : 1;

    const teamMembers = members.map(member => ({
      ...member,
      id: nextMemberId++
    }));

    const team: Team = {
      id: newTeamId,
      name: name.trim(),
      category,
      members: teamMembers
    };

    const updatedTeams = [...s.teams, team];
    await set(ref(this.db, 'teams'), updatedTeams);
  }

  // Ažuriranje tima
  async updateTeam(teamId: number, name: string, category: 'M' | 'Ž', members?: Competitor[]) {
    const s = this.value;
    const teamIndex = s.teams.findIndex(t => t.id === teamId);

    if (teamIndex === -1) return false;

    const updatedTeam: Team = {
      ...s.teams[teamIndex],
      name: name.trim(),
      category,
      members: members || s.teams[teamIndex].members
    };

    const updatedTeams = [...s.teams];
    updatedTeams[teamIndex] = updatedTeam;

    await set(ref(this.db, 'teams'), updatedTeams);
    return true;
  }

  // Dodavanje natjecatelja u tim
  async addCompetitorToTeam(teamId: number, firstName: string, lastName: string) {
    const s = this.value;
    const team = s.teams.find(t => t.id === teamId);
    if (!team || team.members.length >= 3) return false;

    const newId = Math.max(...s.teams.flatMap(t => t.members.map(m => m.id)), 0) + 1;
    const competitor: Competitor = {
      id: newId,
      firstName: firstName.trim(),
      lastName: lastName.trim()
    };

    const updatedTeams = s.teams.map(t => {
      if (t.id === teamId) {
        return { ...t, members: [...t.members, competitor] };
      }
      return t;
    });

    await set(ref(this.db, 'teams'), updatedTeams);
    return true;
  }

  // Dodavanje rezultata
  async addResult(competitorId: number, disciplineId: number, points: number) {
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

    let updatedResults;
    if (existingIndex >= 0) {
      updatedResults = [...s.results];
      updatedResults[existingIndex] = result;
    } else {
      updatedResults = [...s.results, result];
    }

    await set(ref(this.db, 'results'), updatedResults);
  }

  // Ažuriranje rezultata
  async updateResult(resultId: number, competitorId: number, disciplineId: number, points: number) {
    const s = this.value;
    const existingIndex = s.results.findIndex(r => r.id === resultId);

    if (existingIndex >= 0) {
      const updatedResults = [...s.results];
      updatedResults[existingIndex] = {
        id: resultId,
        competitorId,
        disciplineId,
        points
      };

      await set(ref(this.db, 'results'), updatedResults);
    }
  }

  // Brisanje tima
  async deleteTeam(teamId: number) {
    const s = this.value;
    const updatedTeams = s.teams.filter(t => t.id !== teamId);

    // Također obriši sve rezultate natjecatelja iz ovog tima
    const teamMembers = s.teams.find(t => t.id === teamId)?.members || [];
    const memberIds = teamMembers.map(m => m.id);
    const updatedResults = s.results.filter(r => !memberIds.includes(r.competitorId));

    await Promise.all([
      set(ref(this.db, 'teams'), updatedTeams),
      set(ref(this.db, 'results'), updatedResults)
    ]);
  }

  // Brisanje natjecatelja iz tima
  async removeCompetitorFromTeam(teamId: number, competitorId: number) {
    const s = this.value;
    const updatedTeams = s.teams.map(t => {
      if (t.id === teamId) {
        return { ...t, members: t.members.filter(m => m.id !== competitorId) };
      }
      return t;
    });

    // Također obriši sve rezultate ovog natjecatelja
    const updatedResults = s.results.filter(r => r.competitorId !== competitorId);

    await Promise.all([
      set(ref(this.db, 'teams'), updatedTeams),
      set(ref(this.db, 'results'), updatedResults)
    ]);
  }

  // Brisanje rezultata
  async deleteResult(resultId: number) {
    const s = this.value;
    const updatedResults = s.results.filter(r => r.id !== resultId);
    await set(ref(this.db, 'results'), updatedResults);
  }

  // Dodavanje discipline
  async addDiscipline(name: string, category: 'M' | 'Ž') {
    const s = this.value;
    const newId = Math.max(...s.disciplines.map(d => d.id), 0) + 1;
    const discipline: Discipline = {
      id: newId,
      name: name.trim(),
      category
    };

    const updatedDisciplines = [...s.disciplines, discipline];
    await set(ref(this.db, 'disciplines'), updatedDisciplines);
  }

  // Ažuriranje discipline
  async updateDiscipline(disciplineId: number, name: string, category: 'M' | 'Ž') {
    const s = this.value;
    const disciplineIndex = s.disciplines.findIndex(d => d.id === disciplineId);

    if (disciplineIndex === -1) return false;

    const updatedDisciplines = [...s.disciplines];
    updatedDisciplines[disciplineIndex] = {
      id: disciplineId,
      name: name.trim(),
      category
    };

    await set(ref(this.db, 'disciplines'), updatedDisciplines);
    return true;
  }

  // Brisanje discipline
  async deleteDiscipline(disciplineId: number) {
    const s = this.value;
    const updatedDisciplines = s.disciplines.filter(d => d.id !== disciplineId);

    // Također obriši sve rezultate u ovoj disciplini
    const updatedResults = s.results.filter(r => r.disciplineId !== disciplineId);

    await Promise.all([
      set(ref(this.db, 'disciplines'), updatedDisciplines),
      set(ref(this.db, 'results'), updatedResults)
    ]);
  }

  // Dohvaćanje svih rezultata
  getResults(): Result[] {
    return this.value.results;
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
