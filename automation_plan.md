# Plan automatizacije regresijskog testiranja (Playwright)

> Prati i nadograđuje `docs/MANUALNO-TESTIRANJE.md`. Cilj: pokriti Playwright E2E testovima sve test slučajeve (TC) iz manualnog dokumenta koji se realno mogu automatizirati, po fazama — **jedna faza = jedna radna sesija**. Manualni dokument se ne briše: ostaje kao fallback za TC-ove koji genuinski trebaju čovjeka (fizički uređaj, vizualna inspekcija boje, ručna provjera na produkcijskim podacima) i kao pre-event "dimni test" prije stvarnog natjecanja.

Status na `2026-09-08`: **Faza 0 gotova**, Faza 1 sljedeća na redu. Ovaj dokument piše i ažurira svaka sesija koja odradi jednu fazu — vidi [§6 Status log](#6-status-log) i [§7 Prompt za sljedeću sesiju](#7-prompt-za-sljedeću-sesiju).

---

## 1. Kontekst i cilj

`docs/MANUALNO-TESTIRANJE.md` sadrži 113 TC-ova (sekcije 0, A–K) i eksplicitno upozorava da su dev i produkcija **isti** Firebase projekt (`hunting-games-fe57e`) — svaki ručni test ostavlja trag u pravoj bazi, otud `TEST_` prefiks i ručno čišćenje nakon svakog ciklusa. To je prihvatljivo za povremeno ručno testiranje, ali neprihvatljivo kao temelj za automatizirani regresijski paket koji će se pokretati često (svaki put prije deploya) — ne smijemo bombardirati produkcijsku bazu testnim timovima/rezultatima niti riskirati da netko gleda `/pracenje` uživo dok testovi pišu i brišu podatke.

**Zato je prva i najvažnija arhitekturna odluka ovog plana: E2E testovi rade isključivo protiv Firebase Local Emulator Suite (Auth + Realtime Database), nikad protiv produkcijske baze.** Time potpuno nestaje rizik opisan u uvodu manualnog dokumenta (za automatizirane testove), a ostaje relevantan samo za sesije stvarnog ručnog testiranja koje netko odradi po `MANUALNO-TESTIRANJE.md`.

Sekundarni cilj: prije `firebase deploy` mora se automatski pokrenuti cijeli test paket (Karma/Jasmine unit testovi + Playwright E2E) i deploy smije proći **samo** ako oboje prođe. Ovo se rješava kroz Firebase Hostingov nativni `predeploy` hook u `firebase.json` (faza 8).

## 2. Ključne arhitekturne odluke

### 2.1 Firebase Local Emulator Suite
- `firebase-tools` je već globalno instaliran (`15.29.0` potvrđeno), nije potreban dodatni setup alata.
- `firebase.json` dobiva novi `emulators` blok (`auth`, `database`, `ui`), koristi **postojeći** `database.rules.json` (`.read: true`, `.write: "auth != null"`) — tako testovi vjerno provjeravaju prava pristupa (bitno za K10, I5), a ne neku pojednostavljenu verziju pravila.
- Novi `src/environments/environment.e2e.ts` — identičan `environment.ts`, uz dodatan flag `useEmulators: true`.
- `main.ts` se minimalno proširuje: ako `environment.useEmulators`, pozovi `connectDatabaseEmulator` / `connectAuthEmulator` odmah nakon `getDatabase()` / `getAuth()`. Nekoliko linija, uvjetno, bez utjecaja na postojeći produkcijski/dev bootstrap kad flag nije postavljen.
- `angular.json` dobiva novu build/serve konfiguraciju `e2e` s `fileReplacements` (`environment.ts` → `environment.e2e.ts`). **Postojeće `build`/`serve` konfiguracije se ne diraju** — `npm start` i `npm run build` nastavljaju raditi identično kao danas (i dalje protiv prave baze za normalan dev rad, to je izvan opsega ovog plana i posebna je odluka za drugi dan ako se ikad poželi promijeniti).
- Playwright pokreće **dva** procesa kroz `webServer` (Playwright podržava niz web servera): `firebase emulators:start --only auth,database` i `ng serve --configuration=e2e`. Playwright čeka da oba budu spremna prije pokretanja testova i gasi ih na kraju.
- Seed/reset podataka ide direktno preko emulatorovog REST sučelja (`PUT http://localhost:9000/<path>.json`) i Auth emulator REST API-ja za kreiranje test admin korisnika — bez dodatnog `firebase-admin` dependencyja, dovoljan je `fetch`.
- Posljedica ove odluke: **nestaje potreba za `TEST_` prefiksom i ručnim čišćenjem u automatiziranim testovima** — svaki test file resetira emulator na poznato, minimalno seed stanje (6 disciplina iz TC 0.4) prije svojih testova. `TEST_` konvencija iz manualnog dokumenta i dalje vrijedi isključivo za stvarno ručno testiranje na produkciji.

### 2.2 Playwright + Page Object Model
- `@playwright/test` kao devDependency, `playwright.config.ts` u rootu.
- `e2e/pages/*.page.ts` — jedan POM po ekranu/dijalogu (npr. `overview.page.ts`, `add-team.dialog.ts`, `edit-team.dialog.ts`, `add-result.dialog.ts`, `edit-result.dialog.ts`, `login.page.ts`, `verification-issues.dialog.ts`), da se lokatori ne dupliciraju po testovima i da promjena u UI-ju znači izmjenu na jednom mjestu.
- `e2e/support/emulator.ts` — helperi `resetEmulatorData()`, `seedTeams()`, `seedResults()`, `createTestAdminUser()`, `patchDisciplineMaxPoints()`.
- `e2e/tests/*.spec.ts` — jedan file po fazi/sekciji, TC kod u nazivu svakog testa (npr. `test('A1 - dodavanje tima s jednim članom', ...)`) radi izravne sljedivosti natrag na `MANUALNO-TESTIRANJE.md`.

### 2.3 Napomena o "jest" vs stvarni unit test stack
Zahtjev spominje "jest unit testove" prije deploya. Projekt **ne koristi Jest** — `CLAUDE.md` i `angular.json` potvrđuju Karma + Jasmine (`ng test`, 178 testova u trenutku pisanja `MANUALNO-TESTIRANJE.md`). U ovom planu "unit testovi" = postojeći `ng test --watch=false --browsers=ChromeHeadless`. Migracija na Jest je posebna, veća promjena (drugi test runner, drugi mock/spy API) i **nije** dio ovog plana — ako je stvarno namjera zamijeniti Karma/Jasmine Jestom, to treba biti eksplicitan zaseban zahtjev prije nego se krene u fazu 8.

### 2.4 Što NE ide u automatizaciju (i zašto)
| TC | Razlog |
|---|---|
| 0.4, K11 | Ručna inspekcija Firebase konzole — zamijenjeno provjerom da seed podaci u emulatoru i `database.rules.json` odgovaraju dokumentiranim vrijednostima (isti efekt, bez konzole) |
| G9 | Traži stvarne produkcijske podatke iz prošlog natjecanja — nema smisla na emulatoru; G1–G8 već pokrivaju istu logiku deterministički |
| G10, K12 | Zahtijevaju pravi fizički touch uređaj; Playwright može emulirati touch/mobilni viewport (K12 layout se automatizira), ali G10 (stvarni hover/tap na pravom telefonu) ostaje best-effort napomena, ne tvrda garancija |
| I4 | Inherentni arhitekturni rizik (race condition na `set()` bez lockinga), ne bug s jasnim pass/fail kriterijem — automatizira se kao promatrački/informativni test koji ne blokira pipeline, ne kao hard assert |
| D9, B5, B6, H9 (djelomično) | Ovo su u izvorniku napomene/promatranja, ne strogi pass/fail — automatiziraju se kao assertion trenutnog ponašanja (regression guard), radi dokumentiranja, ne "ispravka" |

Sve ostalo (procjena: ~105–108 od 113 TC-ova) automatizira se kao pravi pass/fail Playwright test.

## 3. Pokrivenost po sekciji i mapiranje na faze

| Sekcija | TC-ovi | Faza | Napomena |
|---|---|---|---|
| 0 — Priprema okoline | 6 | Faza 0 | Zamijenjeno smoke testom protiv emulatora |
| K — `/pracenje` + login | 12 | Faza 1 | Rana faza jer ne ovisi o timovima/rezultatima, validira cijelu infrastrukturu (routing, auth guard, real-time) |
| A — Dodaj tim | 10 | Faza 2 | |
| B — Editiraj tim | 10 | Faza 2 | |
| C — Unos rezultata | 16 | Faza 3 | Ovisi o timovima iz Faze 2 (POM/seed helperi) |
| D — Editiraj rezultat | 9 | Faza 3 | |
| E — Formula bodovanja | 8 | Faza 4 | |
| F — Poredak i prikaz | 11 | Faza 4 | |
| J — Regresija maxPoints | 4 | Faza 4 | Tematski uz E/F |
| G — Kaskadni tiebreak | 10 | Faza 5 | Najsloženija logika, izolirana faza |
| H — PDF izvoz | 11 | Faza 6 | |
| H.V — Verifikacija prije PDF-a | 7 | Faza 6 | |
| I — Real-time i konkurentnost | 5 | Faza 7 | |
| — CI gating prije deploya | — | Faza 8 | Nije TC iz dokumenta, ali eksplicitan zahtjev korisnika |

## 4. Faze

Svaka faza ima: **Cilj**, **Opseg** (TC-ovi), **Preduvjeti**, **Deliverables** (novi/izmijenjeni fajlovi), **Definition of Done**, **Status**, **Git hash**. Faze se rade **redom** (svaka sljedeća pretpostavlja da prethodne postoje i prolaze) — pri svakoj fazi se osim novih testova ponovno pokreće **cijeli** dotadašnji paket (regresija), ne samo testovi te faze.

---

### Faza 0 — Infrastruktura (Playwright + Firebase Emulator Suite)

**Cilj:** Postaviti cijelu testnu infrastrukturu tako da je pokretanje `npx playwright test` posve samostalno (diže emulatore + dev server, seeda podatke, gasi sve na kraju), bez ikakvog dodira produkcijske baze.

**Opseg (TC):** 0.1–0.3, 0.5, 0.6 (kao smoke test protiv emulatora, ne protiv prave baze).

**Preduvjeti:** nema (prva faza).

**Deliverables:**
- `@playwright/test` u `devDependencies`, `npx playwright install` upute u README/CLAUDE.md ako treba
- `playwright.config.ts` (root) — `webServer` niz: firebase emulatori + `ng serve --configuration=e2e`; `projects` barem `chromium` (razmotriti i mobilni viewport project za K12 u kasnijoj fazi)
- `firebase.json` — dodan `emulators` blok (`auth: 9099`, `database: 9000`, `ui: enabled`)
- `src/environments/environment.e2e.ts` (+ `useEmulators: true` flag u shared environment tipu ako se uvede)
- `main.ts` — uvjetno spajanje na emulatore kad `environment.useEmulators`
- `angular.json` — nova `e2e` build/serve konfiguracija s `fileReplacements`
- `e2e/support/emulator.ts` — `resetEmulatorData()`, `seedDisciplines()` (6 disciplina iz TC 0.4), `createTestAdminUser()`
- `e2e/pages/overview.page.ts` (osnovni skeleton — header, tablica, filteri)
- `e2e/tests/00-smoke.spec.ts` — app se učitava bez konzolnih grešaka, prikazuje header, prazan poredak (emulator prazan osim seed disciplina)
- `package.json` skripte: `test:e2e`, `test:e2e:ui`, `emulators`
- `.gitignore` — `playwright-report/`, `test-results/`, `blob-report/`

**Definition of Done:**
- `npx playwright test e2e/tests/00-smoke.spec.ts` prolazi lokalno, ponovljivo (min. 3 uzastopna pokretanja bez flakea)
- Potvrđeno da test NE dira produkcijsku bazu (provjeriti Firebase konzolu prije/poslije — 0 promjena)
- `ng test --watch=false --browsers=ChromeHeadless` i dalje prolazi (nedirano)
- `npm run build` i dalje prolazi (nedirano)
- Commit napravljen, git hash upisan u §6

**Status:** ✅ Gotovo
**Git hash:** `ccaa8e4`

**Napomene / odstupanja od plana:**
- **Java nije bila instalirana** na ovom stroju (`java -version` → "Unable to locate a Java Runtime"). Database emulator je JVM proces (Auth emulator nije), pa je bez toga bio hard blocker. Riješeno s `brew install openjdk`; `emulators` skripta u `package.json` sama prependa `$(brew --prefix openjdk)/bin` na `PATH` samo za taj proces, tako da `npm start`/`ng serve` ostaju nedirani i nije trebalo mijenjati korisnikov `~/.zshrc`.
- **Seed format za `disciplines` promijenjen usred faze**: prvi pokušaj je seedao objekt keyiran po `id`-u (`{"1": {...}, "2": {...}, ...}`) preko REST-a — Realtime Database ga je pretvorio u niz s umetnutim `null` na indeksu 0 (7 elemenata umjesto 6), jer RTDB uzastopne numeričke ključeve uvijek tretira kao niz. `competition.service.ts` ionako piše kolekcije kao plain JS nizove (`setCollection('disciplines', updatedDisciplines)`), pa je `seedDisciplines()` promijenjen da šalje pravi JSON niz — sada vjerno oponaša stvarni format podataka koji app piše.
- **Smoke test gađa `/pracenje`, ne `/`** — `''` ruta je iza `authGuard` (vidi `app.component.ts`), a auth flow je tek Faza 1. `/pracenje` je javna i dovoljna za "app se učitava, header vidljiv, prazan poredak, nema konzolnih grešaka" bez potrebe za login helperima.
- Discipline seed podaci koriste **trenutne** nazive/redoslijed iz TC 0.4 (`docs/MANUALNO-TESTIRANJE.md`), koji se poklapaju sa stvarnim UI tekstom u `overview.component.html` (provjereno ručno tijekom faze).
- CLAUDE.md ažuriran (Commands sekcija) s novim skriptama i objašnjenjem Java preduvjeta — pogledaj tamo za detalje ako sljedeća sesija bude na drugom stroju.

---

### Faza 1 — Autentikacija i javna `/pracenje` ruta

**Cilj:** Pokriti login, `authGuard`, i cijelu K sekciju — najbolja rana faza jer testira routing/auth/real-time infrastrukturu bez potrebe za seed podacima o timovima.

**Opseg (TC):** K1–K12 (K10 automatiziran kao `page.evaluate()` pokušaj izravnog upisa preko Firebase SDK-a s očekivanim `PERMISSION_DENIED`; K11 kao provjera da `firebase.json`/`database.rules.json` sadrže očekivana pravila; K12 kao Playwright mobilni viewport, uz napomenu da ne zamjenjuje pravi uređaj) + implicitni login flow (uspješna/neuspješna prijava).

**Preduvjeti:** Faza 0.

**Deliverables:**
- `e2e/pages/login.page.ts`
- `e2e/tests/10-auth-and-public-route.spec.ts`
- Proširenje `e2e/support/emulator.ts` po potrebi (auth state helperi, storageState za ubrzanje "prijavljen korisnik" scenarija)

**Definition of Done:**
- Svi testovi faze 1 prolaze + puna regresija faze 0
- Unit testovi prolaze
- Commit + git hash u §6, plan ažuriran

**Status:** ⬜ Nije započeto
**Git hash:** —

---

### Faza 2 — Upravljanje timovima (sekcije A + B)

**Cilj:** CRUD timova kroz UI, uključujući `confirm()` dijalog za brisanje i cascade-delete rezultata.

**Opseg (TC):** A1–A10, B1–B10 (B5/B6 kao dokumentacijski regression-guard testovi trenutnog ponašanja, ne "popravak").

**Preduvjeti:** Faza 1.

**Deliverables:**
- `e2e/pages/add-team.dialog.ts`, `e2e/pages/edit-team.dialog.ts`
- `e2e/tests/20-team-management.spec.ts`
- Handler za `page.on('dialog')` (browser `confirm()`) u POM-u za brisanje tima

**Definition of Done:** kao Faza 1 (svi novi testovi + regresija faza 0–1 + unit testovi), commit + git hash.

**Status:** ⬜ Nije započeto
**Git hash:** —

---

### Faza 3 — Unos i uređivanje rezultata (sekcije C + D)

**Cilj:** Autocomplete pretraga natjecatelja/timova, validacija bodova prema `discipline.maxPoints`, update-not-duplicate ponašanje.

**Opseg (TC):** C1–C16, D1–D9 (D9 kao dokumentacijska napomena, ne test).

**Preduvjeti:** Faza 2 (koristi njene POM-ove/helpere za brzo kreiranje timova u `beforeEach`).

**Deliverables:**
- `e2e/pages/add-result.dialog.ts`, `e2e/pages/edit-result.dialog.ts`
- `e2e/tests/30-results-entry.spec.ts`

**Definition of Done:** kao prije.

**Status:** ⬜ Nije započeto
**Git hash:** —

---

### Faza 4 — Formula bodovanja i prikaz poretka (sekcije E + F + J)

**Cilj:** Numerička ispravnost formule (`100/maxPoints`), hrvatski decimalni format, kategorijski filteri, rank/podium CSS klase, formula-info panel, dinamička promjena `maxPoints` bez redeploya.

**Opseg (TC):** E1–E8, F1–F11, J1–J4.

**Preduvjeti:** Faza 3.

**Deliverables:**
- Proširenje `overview.page.ts` (filteri, čitanje vrijednosti iz tablice, CSS klase redova)
- `e2e/tests/40-scoring-and-overview.spec.ts`
- `patchDisciplineMaxPoints()` helper u `emulator.ts` (za E8/J3 — izravan PATCH u emulator DB, provjera da se UI odmah preračuna, pa vraćanje na izvornu vrijednost)

**Definition of Done:** kao prije. Napomena: F7–F9 se provjeravaju kroz prisutnost CSS klasa (`row-winner`, `row-podium`, `score-high/medium/low`), ne piksel-precizno vizualno poređenje boje.

**Status:** ⬜ Nije započeto
**Git hash:** —

---

### Faza 5 — Izjednačeni rezultati / kaskadni tiebreak (sekcija G)

**Cilj:** Najkritičnija i najsloženija logika — deterministički seed scenariji za svaki slučaj kaskade (M i Ž), provjera teksta tooltipa po paru, ekipna varijanta.

**Opseg (TC):** G1, G2, G4, G5, G6, G8 kao puni pass/fail testovi (koriste ispravljene brojke iz dokumenta, ne izvorni pogrešni G3-scenarij). G3 kao negativna provjera ("nikad ne prikazuje lažno 'riješeno na ZRAČNOJ PUŠKI'"). G7 kao dokumentacijski test stvarnog (možda čudnog) ponašanja. G9 preskočen (traži prave prošlogodišnje podatke). G10 best-effort (touch emulacija), jasno označeno da ne zamjenjuje test na pravom uređaju.

**Preduvjeti:** Faza 4.

**Deliverables:**
- `e2e/tests/50-tiebreak.spec.ts`
- Proširenje `overview.page.ts` s helperom za čitanje tooltip/tieNote teksta (hover + touch varijanta)

**Definition of Done:** kao prije.

**Status:** ⬜ Nije započeto
**Git hash:** —

---

### Faza 6 — PDF izvoz i verifikacija podataka (sekcije H + H.V)

**Cilj:** Download interception, imenovanje fajla, sadržaj PDF-a (tekst, ne piksel-boje), trigeriranje `ResultsVerificationService` dijaloga namjernim kvarenjem integriteta podataka u emulatoru.

**Opseg (TC):** H1–H11, HV1–HV7.

**Preduvjeti:** Faza 5.

**Deliverables:**
- `pdf-parse` (ili slično) kao devDependency za čitanje teksta iz preuzetog PDF-a (H8, H9)
- `e2e/pages/verification-issues.dialog.ts`
- `e2e/tests/60-pdf-export.spec.ts`
- Helperi u `emulator.ts` za namjerno kvarenje podataka (dupli ID-evi, orphan reference) — isključivo na emulatoru, bez rizika za produkciju

**Definition of Done:** kao prije. Napomena: H1/H2 tema (plava/zelena) i pozlaćeni/posrebreni redovi provjeravaju se kroz strukturu PDF-a (broj stranica, prisutnost očekivanog teksta/naslova) gdje je to praktično izvedivo bez pixel-diff alata; puni vizualni regression test nije u opsegu.

**Status:** ⬜ Nije započeto
**Git hash:** —

---

### Faza 7 — Real-time sinkronizacija i konkurentnost (sekcija I)

**Cilj:** Provjera propagacije promjena između dva browser konteksta bez ručnog refresha, i da cascade mutacije šalju točno jedan atomaran multi-path `update()` (ne dva odvojena `set()` poziva).

**Opseg (TC):** I1, I2, I3, I5 kao puni pass/fail testovi. I4 kao informativni/exploratory test (dokumentira stvarno ponašanje race conditiona, ne blokira pipeline ako je "flaky" po prirodi problema — po potrebi `test.fixme`/`test.slow` s jasnim komentarom zašto).

**Preduvjeti:** Faza 6.

**Deliverables:**
- `e2e/tests/70-realtime-sync.spec.ts` (dva `browserContext`-a paralelno)
- Network request interception (`page.on('request')`) za I5 provjeru broja PATCH poziva

**Definition of Done:** kao prije.

**Status:** ⬜ Nije započeto
**Git hash:** —

---

### Faza 8 — CI gating prije `firebase deploy`

**Cilj:** Deploy se smije dogoditi samo ako prođu SVI Karma/Jasmine unit testovi i SVI Playwright E2E testovi.

**Opseg:** nije TC iz manualnog dokumenta — eksplicitan zahtjev korisnika iz ove sesije.

**Preduvjeti:** Faze 0–7 (cijeli paket mora postojati i biti zelen).

**Deliverables:**
- `firebase.json` → `hosting.predeploy`: niz naredbi koje `firebase deploy` **automatski** pokreće prije uploada i **prekida deploy ako bilo koja padne** (Firebase Hostingov nativni mehanizam, ne custom skripta):
  ```json
  "predeploy": [
    "npm run test -- --watch=false --browsers=ChromeHeadless",
    "npm run test:e2e",
    "npm run build"
  ]
  ```
- `package.json` — pomoćna `predeploy`/`verify` skripta za ručno pokretanje istog lanca bez stvarnog deploya (developer sanity check)
- Ažuriranje `CLAUDE.md` (Commands sekcija) s novim skriptama i objašnjenjem da `firebase deploy --only hosting` sada sam pokreće cijeli test paket
- (Opcionalno, stretch ako vremena/potrebe ima) minimalan GitHub Actions workflow koji na svaki PR prema `main` pokreće isti lanac testova kao read-only provjera — **nije nužno za ispunjenje izvornog zahtjeva**, koji se rješava već kroz `hosting.predeploy`

**Definition of Done:**
- `firebase deploy --only hosting --dry-run` (ili stvaran deploy na test grani/kanalu ako korisnik odobri) demonstrira da predeploy hook stvarno blokira deploy kad se namjerno pokvari jedan test
- Puna regresija (Faze 0–7) zelena
- Commit + git hash, plan ažuriran, sekcija §6 kompletna

**Status:** ⬜ Nije započeto
**Git hash:** —

---

## 5. Kako radi svaka sesija (ponavljajući proces)

Ovo poglavlje čita svaka sesija koja nastavlja rad na ovom planu:

1. Otvori ovaj fajl, pronađi prvu fazu sa statusom `⬜ Nije započeto` (ili `🔶 U tijeku` ako je prethodna sesija prekinuta usred faze).
2. Pročitaj **samo** tu fazu (Cilj/Opseg/Preduvjeti/Deliverables/DoD) — ne kreći u sljedeću fazu u istoj sesiji osim ako korisnik eksplicitno zatraži da se nastavi dalje.
3. Implementiraj deliverables te faze.
4. Pokreni **cijeli** dotadašnji test paket (sve prethodno završene faze + nova faza), ne samo nove testove — regresija mora ostati zelena.
5. Pokreni i `ng test --watch=false --browsers=ChromeHeadless` — mora ostati zelen (nedirano ili poboljšano, nikad pokvareno).
6. Commitaj promjene (jasna poruka, npr. `test(e2e): faza 2 — upravljanje timovima (A+B)`).
7. Ažuriraj ovaj fajl:
   - status te faze → `✅ Gotovo`
   - git hash te faze → stvarni hash commita (`git rev-parse --short HEAD`)
   - kratka bilješka što je stvarno napravljeno ako je odstupalo od plana (npr. otkriven bug, promijenjen pristup)
   - datum u §6 Status log
   - napiši/ažuriraj §7 Prompt za sljedeću sesiju za **iduću** fazu
8. Javi korisniku sažetak (što je urađeno, koliko TC-ova pokriveno, je li build/testovi zeleni) i da je plan ažuriran.

Ako se tijekom faze otkrije **pravi bug** u aplikaciji (ne u testu) — zabilježi ga u planu uz TC oznaku, ali ne popravljaj ga usput osim ako je trivijalan i user preferencije to dopuštaju; prioritet ove inicijative je pokrivenost testovima, ne popravci. Za veće nalaze, stani i pitaj korisnika prije popravka (pogotovo ako dira produkcijsku formulu bodovanja ili tiebreak logiku).

## 6. Status log

| Faza | Status | Datum | Git hash | Sesija / napomena |
|---|---|---|---|---|
| Plan (ovaj dokument) | ✅ Izrađen | 2026-09-08 | — | Plan kreiran, faze 0–8 definirane, nijedna još nije izvršena |
| 0 — Infrastruktura | ✅ Gotovo | 2026-09-08 | `ccaa8e4` | Playwright + Firebase Emulator Suite postavljeni; Java instalirana putem brewa (nije bila na stroju); seed disciplina promijenjen s id-keyed objekta na pravi JSON niz (RTDB inače ubacuje null na indeks 0); smoke test gađa `/pracenje` (javna ruta) jer `authGuard`/login flow dolazi tek u Fazi 1 |
| 1 — Auth + `/pracenje` | ⬜ Nije započeto | | | |
| 2 — Timovi (A+B) | ⬜ Nije započeto | | | |
| 3 — Rezultati (C+D) | ⬜ Nije započeto | | | |
| 4 — Formula/poredak (E+F+J) | ⬜ Nije započeto | | | |
| 5 — Tiebreak (G) | ⬜ Nije započeto | | | |
| 6 — PDF izvoz (H+HV) | ⬜ Nije započeto | | | |
| 7 — Real-time (I) | ⬜ Nije započeto | | | |
| 8 — CI gating / deploy | ⬜ Nije započeto | | | |

## 7. Prompt za sljedeću sesiju

Sljedeća sesija treba odraditi **Fazu 1** iz ovog plana. Kopiraj/zalijepi ovo kao prompt:

> Radi na `automation_plan.md` u rootu repozitorija `hunting-games` — odradi **Fazu 1 (Autentikacija i javna `/pracenje` ruta)**, točno kako je opisano u tom fajlu (Cilj/Opseg/Preduvjeti/Deliverables/Definition of Done). Faza 0 (Playwright + Firebase Emulator Suite) je gotova — pročitaj njene bilješke ("Napomene/odstupanja od plana" ispod DoD-a Faze 0) prije početka, posebno: (1) Java (JVM) mora biti na `PATH` da bi Database emulator radio — na ovom stroju je instalirana preko `brew install openjdk`, a `npm run emulators`/`npm run test:e2e` to sami rješavaju bez diranja `~/.zshrc`, ali provjeri da je i dalje tako ako radiš na drugom stroju; (2) `e2e/support/emulator.ts` već ima `createTestAdminUser()`, `resetToBaseline()` i konstante `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` — iskoristi ih umjesto pisanja novih; (3) `''` ruta je iza `authGuard`, `/pracenje` je javna (vidi `app.component.ts`); (4) postojeći `e2e/pages/overview.page.ts` je tek skeleton (header, control panel gumbi, empty-state/tablica pojedinačnog poretka) — proširi ga po potrebi umjesto pisanja duplikata lokatora.
>
> Ukratko opseg: `e2e/pages/login.page.ts` (POM za login formu), `e2e/tests/10-auth-and-public-route.spec.ts` pokrivajući K1–K12 iz `docs/MANUALNO-TESTIRANJE.md` (K10 kao `page.evaluate()` pokušaj izravnog upisa preko Firebase SDK-a s očekivanim `PERMISSION_DENIED`, K11 kao provjera da `firebase.json`/`database.rules.json` sadrže očekivana pravila, K12 kao Playwright mobilni viewport uz napomenu da ne zamjenjuje pravi uređaj) + uspješna/neuspješna prijava. Po potrebi proširi `e2e/support/emulator.ts` (npr. `storageState` helper za brže "već prijavljen" scenarije).
>
> **Kritično: testovi ne smiju nikad dirati produkcijsku Firebase bazu.** Nakon implementacije pokreni **cijeli** dotadašnji paket (Faza 0 smoke test + nova Faza 1 test datoteka), ne samo nove testove, pa i `ng test --watch=false --browsers=ChromeHeadless` — oba moraju ostati zelena. Zatim commitaj, upiši git hash u `automation_plan.md` (status Faze 1 → Gotovo, popuni §6 Status log, zabilježi eventualna odstupanja od plana), i ažuriraj §7 s pripremljenim promptom za Fazu 2 (Upravljanje timovima — sekcije A+B). Ne kreći u Fazu 2 u istoj sesiji osim ako te se eksplicitno zamoli. Ako tijekom faze otkriješ pravi bug u aplikaciji (ne u testu), zabilježi ga u planu uz TC oznaku ali ga ne popravljaj usput osim ako je trivijalan — prioritet je pokrivenost testovima.
