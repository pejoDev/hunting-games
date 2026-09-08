import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Team, Discipline, Result, AppState, Competitor, CompetitorRanking, TeamRanking } from './models';
import { RealtimeDbGateway } from './realtime-db.gateway';

@Injectable({ providedIn: 'root' })
export class CompetitionService {
  private _state = new BehaviorSubject<AppState>({ teams: [], disciplines: [], results: [] });
  state$ = this._state.asObservable();

  constructor(private dbGateway: RealtimeDbGateway) {
    this.loadInitialData();
  }

  get value() { return this._state.getValue(); }

  private loadInitialData() {
    this.dbGateway.observeRoot((data) => {
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
    await this.dbGateway.setCollection('teams', updatedTeams);
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

    // Obriši rezultate natjecatelja koji su uklonjeni iz tima uređivanjem,
    // da njihov ID ne "naslijedi" stare bodove ako se kasnije ponovno dodijeli
    const remainingMemberIds = updatedTeam.members.map(m => m.id);
    const removedMemberIds = s.teams[teamIndex].members
      .map(m => m.id)
      .filter(id => !remainingMemberIds.includes(id));
    const updatedResults = removedMemberIds.length > 0
      ? s.results.filter(r => !removedMemberIds.includes(r.competitorId))
      : s.results;

    await Promise.all([
      this.dbGateway.setCollection('teams', updatedTeams),
      ...(removedMemberIds.length > 0 ? [this.dbGateway.setCollection('results', updatedResults)] : [])
    ]);
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

    await this.dbGateway.setCollection('teams', updatedTeams);
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

    await this.dbGateway.setCollection('results', updatedResults);
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

      await this.dbGateway.setCollection('results', updatedResults);
    }
  }

  // Brisanje tima
  async deleteTeam(teamId: number) {
    const s = this.value;

    // PRVO dohvati članove tima PRIJE brisanja tima
    const teamToDelete = s.teams.find(t => t.id === teamId);
    const teamMembers = teamToDelete?.members || [];
    const memberIds = teamMembers.map(m => m.id);

    // ZATIM obriši tim iz liste
    const updatedTeams = s.teams.filter(t => t.id !== teamId);

    // Obriši sve rezultate natjecatelja iz ovog tima
    const updatedResults = s.results.filter(r => !memberIds.includes(r.competitorId));

    await Promise.all([
      this.dbGateway.setCollection('teams', updatedTeams),
      this.dbGateway.setCollection('results', updatedResults)
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
      this.dbGateway.setCollection('teams', updatedTeams),
      this.dbGateway.setCollection('results', updatedResults)
    ]);
  }

  // Brisanje rezultata
  async deleteResult(resultId: number) {
    const s = this.value;
    const updatedResults = s.results.filter(r => r.id !== resultId);
    await this.dbGateway.setCollection('results', updatedResults);
  }

  // Dodavanje discipline
  async addDiscipline(name: string, category: 'M' | 'Ž', maxPoints: number) {
    const s = this.value;
    const newId = Math.max(...s.disciplines.map(d => d.id), 0) + 1;
    const discipline: Discipline = {
      id: newId,
      name: name.trim(),
      category,
      maxPoints
    };

    const updatedDisciplines = [...s.disciplines, discipline];
    await this.dbGateway.setCollection('disciplines', updatedDisciplines);
  }

  // Ažuriranje discipline
  async updateDiscipline(disciplineId: number, name: string, category: 'M' | 'Ž', maxPoints: number) {
    const s = this.value;
    const disciplineIndex = s.disciplines.findIndex(d => d.id === disciplineId);

    if (disciplineIndex === -1) return false;

    const updatedDisciplines = [...s.disciplines];
    updatedDisciplines[disciplineIndex] = {
      id: disciplineId,
      name: name.trim(),
      category,
      maxPoints
    };

    await this.dbGateway.setCollection('disciplines', updatedDisciplines);
    return true;
  }

  // Brisanje discipline
  async deleteDiscipline(disciplineId: number) {
    const s = this.value;
    const updatedDisciplines = s.disciplines.filter(d => d.id !== disciplineId);

    // Također obriši sve rezultate u ovoj disciplini
    const updatedResults = s.results.filter(r => r.disciplineId !== disciplineId);

    await Promise.all([
      this.dbGateway.setCollection('disciplines', updatedDisciplines),
      this.dbGateway.setCollection('results', updatedResults)
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
  // Svaka disciplina kategorije nosi jednak maksimalni utjecaj (100 bodova), izveden
  // iz discipline.maxPoints — nema hardkodiranja po nazivu discipline.
  calculateTotalPoints(disciplineScores: { [disciplineName: string]: number }, category: 'M' | 'Ž'): number {
    const disciplines = this.getDisciplinesForCategory(category);

    const total = disciplines.reduce((sum, discipline) => {
      const score = disciplineScores[discipline.name] || 0;
      const coefficient = discipline.maxPoints > 0 ? 100 / discipline.maxPoints : 0;
      return sum + score * coefficient;
    }, 0);

    // Zaokružuj na 2 decimale
    return Math.round(total * 100) / 100;
  }

  // Redoslijed disciplina koje redom razbijaju izjednačenje, po kategoriji - od najteže
  // (najvažnije) do najlakše. Muškarci: TRAP → PRAČKA → ZRAČNA PUŠKA. Žene: PRAČKA → ZRAČNA
  // PUŠKA → PIKADO. Kategorija se prepoznaje po prisutnosti PRVE discipline kaskade u
  // disciplineScores - PRAČKA postoji kod obje kategorije, pa TRAP (samo muški) mora biti
  // provjeren prvi da bi se muškarci ispravno prepoznali.
  private readonly TIEBREAK_CASCADES: string[][] = [
    ['TRAP', 'PRAČKA', 'ZRAČNA PUŠKA'],
    ['PRAČKA', 'ZRAČNA PUŠKA', 'PIKADO']
  ];

  private cascadeFor(disciplineScores: { [name: string]: number }): string[] {
    return this.TIEBREAK_CASCADES.find(cascade => cascade[0] in disciplineScores) ?? [];
  }

  // Prva disciplina u kaskadi na kojoj se dva rezultata razlikuju; undefined ako su identični
  // kroz cijelu kaskadu (stvarno, potpuno izjednačeni).
  private decidingDiscipline(
    cascade: string[],
    a: { [name: string]: number },
    b: { [name: string]: number }
  ): string | undefined {
    return cascade.find(discipline => (a[discipline] || 0) !== (b[discipline] || 0));
  }

  private compareByCascade(
    a: { disciplineScores: { [name: string]: number } },
    b: { disciplineScores: { [name: string]: number } }
  ): number {
    const cascade = this.cascadeFor(a.disciplineScores).length ? this.cascadeFor(a.disciplineScores) : this.cascadeFor(b.disciplineScores);
    for (const discipline of cascade) {
      const diff = (b.disciplineScores[discipline] || 0) - (a.disciplineScores[discipline] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  // Objašnjava izjednačene rezultate radi transparentnosti (prikazuje se u overviewu i PDF izvozu).
  // Grupira uzastopne redove s istim totalPoints (već sortirano opadajuće prema istoj kaskadi) i
  // za svaki takav red postavlja tieNote - navodi s kime je izjednačen i na kojoj se disciplini
  // (ako ikojoj) njegov poredak u odnosu na svakog od njih razlikuje.
  private annotateTies<T extends { totalPoints: number; disciplineScores: { [name: string]: number }; tieNote?: string }>(
    rankings: T[],
    nameOf: (row: T) => string
  ): void {
    let i = 0;
    while (i < rankings.length) {
      let j = i + 1;
      while (j < rankings.length && rankings[j].totalPoints === rankings[i].totalPoints) j++;

      if (j - i > 1) {
        const group = rankings.slice(i, j);
        // Provjerava cijelu skupinu, ne samo prvi red — bitno ako "sve kategorije" prikaz slučajno
        // spoji muškarca i žene s istim totalPoints u istu skupinu.
        const cascade = group.map(r => this.cascadeFor(r.disciplineScores)).find(c => c.length > 0) ?? [];

        for (const row of group) {
          const others = group.filter(r => r !== row);

          if (cascade.length === 0) {
            const othersList = others.map(nameOf).join(', ');
            row.tieNote = `Izjednačeno na ${row.totalPoints} bodova s: ${othersList}. Poredak unutar ove skupine je proizvoljan.`;
            continue;
          }

          // Za svakog drugog natjecatelja/tim u skupini, pronađi PRVU disciplinu u kaskadi na
          // kojoj se razlikuju od njega (može biti različita disciplina za različite druge u
          // istoj skupini). Ako nijedna disciplina u kaskadi ne razlikuje ovaj par, oni ostaju
          // stvarno, potpuno izjednačeni.
          const stillTiedWith: string[] = [];
          const comparisons = others.map(other => {
            const discipline = this.decidingDiscipline(cascade, row.disciplineScores, other.disciplineScores);
            if (!discipline) {
              stillTiedWith.push(nameOf(other));
              return `${nameOf(other)} (identičan rezultat u disciplinama ${cascade.join(', ')})`;
            }
            const rowScore = row.disciplineScores[discipline] || 0;
            const otherScore = other.disciplineScores[discipline] || 0;
            return `${nameOf(other)} (${discipline} ${rowScore}:${otherScore})`;
          });

          let tail: string;
          if (stillTiedWith.length === others.length) {
            tail = 'Poredak unutar ove skupine je proizvoljan.';
          } else if (stillTiedWith.length === 0) {
            tail = 'Poredak riješen prema navedenim disciplinama.';
          } else {
            tail = `Poredak riješen prema navedenim disciplinama, osim u odnosu na ${stillTiedWith.join(', ')} gdje ostaje identičan rezultat u svim promatranim disciplinama i poredak je proizvoljan.`;
          }

          row.tieNote = `Izjednačeno na ${row.totalPoints} bodova s: ${comparisons.join('; ')}. ${tail}`;
        }
      }

      i = j;
    }
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

    // Sortiraj po ukupnim bodovima (silazno); izjednačen rezultat razbija se kaskadom disciplina
    // (vidi TIEBREAK_CASCADES) - muškarci TRAP → PRAČKA → ZRAČNA PUŠKA, žene PRAČKA → ZRAČNA
    // PUŠKA → PIKADO, redom dok se ne pronađe razlika.
    rankings.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return this.compareByCascade(a, b);
    });
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });
    this.annotateTies(rankings, r => `${r.competitor.firstName} ${r.competitor.lastName}`);

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

    // Sortiraj po ukupnim bodovima (silazno); izjednačen rezultat razbija se kaskadom disciplina
    // (vidi TIEBREAK_CASCADES) - muškarci TRAP → PRAČKA → ZRAČNA PUŠKA, žene PRAČKA → ZRAČNA
    // PUŠKA → PIKADO, redom dok se ne pronađe razlika.
    rankings.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return this.compareByCascade(a, b);
    });
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });
    this.annotateTies(rankings, r => r.team.name);

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
