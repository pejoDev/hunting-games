// Helperi za pripremu Firebase Local Emulator Suite prije/tijekom Playwright testova.
// Rade isključivo preko REST sučelja emulatora (localhost) - nikad se ne dodiruje
// produkcijska baza (`hunting-games-fe57e-default-rtdb.europe-west1.firebasedatabase.app`).

const PROJECT_ID = 'hunting-games-fe57e';
const DB_NAMESPACE = 'hunting-games-fe57e-default-rtdb';
const DB_EMULATOR_URL = 'http://127.0.0.1:9000';
const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';

// `access_token=owner` je dokumentirani "admin bypass" Realtime Database emulatora -
// zaobilazi `database.rules.json` (isto kao Admin SDK), pa seed/reset radi bez obzira
// na to je li netko prijavljen. Ne postoji u produkciji, samo na emulatoru.
function dbUrl(path: string): string {
  return `${DB_EMULATOR_URL}/${path}.json?ns=${DB_NAMESPACE}&access_token=owner`;
}

/** 6 disciplina iz TC 0.4 (`docs/MANUALNO-TESTIRANJE.md`). */
export const SEED_DISCIPLINES = [
  { id: 1, name: 'TRAP', category: 'M', maxPoints: 5 },
  { id: 2, name: 'ZRAČNA PUŠKA', category: 'M', maxPoints: 50 },
  { id: 3, name: 'PRAČKA', category: 'M', maxPoints: 5 },
  { id: 4, name: 'ZRAČNA PUŠKA', category: 'Ž', maxPoints: 50 },
  { id: 5, name: 'PRAČKA', category: 'Ž', maxPoints: 5 },
  { id: 6, name: 'PIKADO', category: 'Ž', maxPoints: 300 }
] as const;

/** Briše `teams`, `disciplines`, `results` na emulatoru - polazna točka svakog test filea. */
export async function resetEmulatorData(): Promise<void> {
  await Promise.all(
    ['teams', 'disciplines', 'results'].map(path =>
      fetch(dbUrl(path), { method: 'PUT', body: 'null' })
    )
  );
}

/**
 * Seeda 6 disciplina iz TC 0.4 (`docs/MANUALNO-TESTIRANJE.md`).
 *
 * `competition.service.ts` piše kolekcije kao plain JS nizove (`setCollection('disciplines',
 * updatedDisciplines)`), ne kao objekt keyiran po `id`-u - zato ovdje šaljemo pravi JSON niz.
 * (Objekt s uzastopnim numeričkim ključevima bi Firebase svejedno pretvorio u niz, ali s
 * pomaknutim indeksima ako ključevi ne kreću od 0, pa je izravan niz jednoznačan.)
 */
export async function seedDisciplines(): Promise<void> {
  const res = await fetch(dbUrl('disciplines'), {
    method: 'PUT',
    body: JSON.stringify(SEED_DISCIPLINES)
  });
  if (!res.ok) {
    throw new Error(`seedDisciplines failed: ${res.status} ${await res.text()}`);
  }
}

/** Resetira sve kolekcije pa vraća samo seed discipline - "čisto" polazno stanje. */
export async function resetToBaseline(): Promise<void> {
  await resetEmulatorData();
  await seedDisciplines();
}

/**
 * Kreira (ili ponovno koristi, ako već postoji) test admin korisnika na Auth emulatoru,
 * preko istog Identity Toolkit REST API-ja koji koristi `firebase/auth` SDK.
 */
export async function createTestAdminUser(
  email = 'admin@test.local',
  password = 'testpass123'
): Promise<void> {
  const res = await fetch(
    `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2e-fake-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    }
  );
  if (res.ok) return;

  const body = await res.json().catch(() => ({}));
  const alreadyExists = body?.error?.message === 'EMAIL_EXISTS';
  if (!alreadyExists) {
    throw new Error(`createTestAdminUser failed: ${res.status} ${JSON.stringify(body)}`);
  }
}

/** Izravan PATCH `maxPoints` polja jedne discipline na emulatoru (za E8/J3 u Fazi 4). */
export async function patchDisciplineMaxPoints(disciplineId: number, maxPoints: number): Promise<void> {
  const res = await fetch(dbUrl(`disciplines/${disciplineId}/maxPoints`), {
    method: 'PUT',
    body: JSON.stringify(maxPoints)
  });
  if (!res.ok) {
    throw new Error(`patchDisciplineMaxPoints failed: ${res.status} ${await res.text()}`);
  }
}

export const E2E_ADMIN_EMAIL = 'admin@test.local';
export const E2E_ADMIN_PASSWORD = 'testpass123';
export const E2E_PROJECT_ID = PROJECT_ID;
