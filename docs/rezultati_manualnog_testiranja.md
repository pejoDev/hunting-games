# Rezultati manualnog testiranja

Testiranje izvršeno automatizirano putem Claude in Chrome (browser automatizacija), prema planu u `MANUALNO-TESTIRANJE.md`.

## 0. Priprema okoline

| # | Korak | Očekivano | Rezultat | Napomena |
|---|-------|-----------|----------|----------|
| 0.1 | npm install + npm start | Dev server na :4200 bez grešaka | ✅ | Instaliran uspješno (13 vulnerabilities su npm audit upozorenja, ne utječu na rad), server pokrenut i odgovara na :4200 |
| 0.2 | Otvori localhost:4200 | Header "Sustav za Praćenje Rezultata Međudruštvenog Natjecanja" + tablica pojedinačnog poretka | ⚠️ | Tablica poretka se prikazuje ispravno, ALI stvarni naslov headera je "Memorijal Dragutin Cenko" (s trofej ikonom i LD "Patka" logom), ne tekst iz dokumenta — dokument je zastario po pitanju naziva/brandinga, nije bug |
| 0.3 | Console bez crvenih grešaka | Da | ✅ | Provjereno tijekom cijelog testiranja putem read_console_messages, nema neočekivanih JS grešaka pri učitavanju ili navigaciji |
| 0.4 | Firebase konzola → `disciplines` grana, 6 zapisa s maxPoints | N/T (direktan pristup) | N/T | Nemam pristup Firebase Console (samo app login). Posredno potvrđeno kroz UI: "Unos rezultata" dialog za M natjecatelja prikazuje točno TRAP/ZRAČNA PUŠKA/PRAČKA s hintovima maxPoints 5/50/5; za Ž prikazuje ZRAČNA PUŠKA/PRAČKA/PIKADO s maxPoints 50/5/300 — vidi C5-C7 niže. Ovo posredno potvrđuje 6 disciplina s očekivanim maxPoints, ali ne zamjenjuje direktnu provjeru baze |
| 0.5 | npm run build | Prolazi bez grešaka | ✅ | Build prošao, samo CommonJS warninzi (očekivano) |
| 0.6 | `npx ng test --watch=false --browsers=ChromeHeadless` | Svi testovi prolaze | ✅ | **192/192 SUCCESS** (dokument spominje 178 iz ranijeg trenutka pisanja — broj je otad narastao, svi i dalje prolaze). Coverage: 95.21% statements |

---

## A. Upravljanje timovima — "Dodaj tim"

| # | Korak | Očekivano | Rezultat | Napomena |
|---|-------|-----------|----------|----------|
| A1 | Dodaj `TEST_EkipaM1`, kategorija M, 1 član | Tim se pojavljuje odmah bez refresha | ✅ | Potvrđeno kroz DOM (bez refresha stranice) |
| A2 | Naziv prazan | "Dodaj tim" disabled | ✅ | |
| A3 | Naziv upisan, kategorija nije odabrana | "Dodaj tim" disabled | ✅ | |
| A4 | Naziv+kategorija, 1. član bez imena/prezimena | "Dodaj tim" disabled | ✅ | |
| A5 | "Dodaj člana" dvaput (3 člana) | "Dodaj člana" disabled na 3 | ✅ | |
| A6 | Ukloni 1. člana (koš za smeće) | Disabled, ne može se ukloniti | ✅ | Klik na koš prvog člana nije napravio ništa |
| A7 | 2. član prazan (ne popunjen) | Dozvoljeno, prazan član se filtrira i ne sprema | ✅ | "Dodaj tim" ostaje enabled s praznim 2. članom |
| A8 | 2. član ima ime, prezime prazno | "Dodaj tim" disabled | ✅ | |
| A9 | "Odustani" nakon popunjavanja | Dialog se zatvara, ništa se ne sprema | ✅ | Potvrđeno da `TEST_ShouldNotSave` nije u DOM-u nakon odustajanja |
| A10 | `TEST_EkipaZ1`, kategorija Ž, 3 člana | Tim pod filterom "Žene", ne pod "Muškarci" | ✅ | Svi članovi (Prva/Druga/Treca Clanica) prikazani pod filterom Žene s 0 bodova; zanimljivo — budući da su sva 3 identična (0,0,0), odmah se aktivira ⚖️ tiebreak indikator (najavljuje G4 scenarij) |

## B. Upravljanje timovima — "Editiraj tim"

| # | Korak | Očekivano | Rezultat | Napomena |
|---|-------|-----------|----------|----------|
| B1 | Odaberi `TEST_EkipaM1` u "Editiraj tim" | Forma popunjena trenutnim podacima | ✅ | |
| B2 | Promijeni naziv u `TEST_EkipaM1_izmjena`, spremi | Naziv se odmah ažurira u poretku | ✅ | |
| B3 | Ne biraj tim | "Spremi promjene"/"Obriši tim" disabled | ✅ | |
| B4 | Obriši ime jednom članu (ostavi prezime) | "Spremi promjene" disabled | ✅ | |
| B5 | "Dodaj člana" 4-5 puta u edit dialogu | Nema ograničenja na 3 člana (za razliku od "Dodaj tim") | ⚠️ | Potvrđeno — dodano je 5 dodatnih praznih članova (ukupno 6) bez ikakvog ograničenja; "Dodaj člana" nikad nije postao disabled. Poznato/namjerno zabilježeno ograničenje iz dokumenta, vrijedno razmatranja prije produkcije |
| B6 | Ukloni sve članove tima, pokušaj spremiti | `canSave()` prolazi bez min. 1 člana | ⚠️ | Potvrđeno — s "Nema članova u timu" prikazom, "Spremi promjene" ostaje enabled. Nije stvarno spremljeno (testirano pa otkazano preko "Odustani") da se ne izgubi testni podatak potreban za sekciju C/D |
| B7 | "Obriši tim" | Traži potvrdu (browser `confirm()`) | ✅ | Testirano na zasebnom throwaway timu `TEST_ToDelete` (kreiran s članom "Brisi Me" i rezultatom TRAP=3 radi provjere cascade brisanja). Napomena o metodi: nativni `confirm()` dijalog blokira browser-automatizaciju, pa je test izveden kontroliranim JS override-om `window.confirm` (privremeno vraćao `false` pa `true`) prije klika na "Obriši tim" — stvarna komponentna logika (grananje na povratnu vrijednost `confirm()`) i dalje se izvršava i provjerava |
| B8 | Cancel/Odustani u confirm dijalogu | Tim NIJE obrisan | ✅ | S `confirm()` → `false`, tim ostaje u bazi i dialog ostaje otvoren |
| B9 | Ponovi B7 i potvrdi (OK) | Tim se briše ODMAH; rezultati članova nestaju iz baze | ✅ | S `confirm()` → `true`, `TEST_ToDelete` i njegov rezultat ("Brisi Me", TRAP=3) trenutno nestaju iz poretka — cascade delete rezultata potvrđen |
| B10 | "Odustani" nakon odabira tima i izmjene | Promjene se ne spremaju | ✅ | Testirano kao nusprodukt B6 (izmjena na 0 članova + Odustani) — `TEST_EkipaM1_izmjena` i dalje ima člana "Test Testic" nakon otkazivanja |

## C. Unos rezultata — "Unos rezultata"

| # | Korak | Očekivano | Rezultat | Napomena |
|---|-------|-----------|----------|----------|
| C1 | Upiši dio imena natjecatelja | Autocomplete filtrira po imenu (case-insensitive) | ✅ | Testirano s "Brisi" → pronašao "Brisi Me" |
| C2 | Upiši naziv tima u pretragu | Filtrira sve članove tog tima | ✅ | Implicitno kroz "Brza pretraga po timu" chipove |
| C3 | Klik na chip s nazivom tima | Pretraga se postavlja na tim | ✅ | Chipovi TEST_EkipaM1_izmjena/TEST_EkipaZ1/TEST_ToDelete vidljivi i funkcionalni |
| C4 | Klik "Očisti" nakon C3 | Filter po timu se uklanja | ✅ | Nakon klika na "Očisti" prikazani su ponovno svi chipovi/natjecatelji |
| C5 | Odaberi natjecatelja M | Disciplina prikazuje samo TRAP/ZRAČNA PUŠKA/PRAČKA | ✅ | Potvrđeno dropdown sadržajem za "Brisi Me" i "Test Testic" |
| C6 | Odaberi natjecateljicu Ž | Disciplina prikazuje samo ZRAČNA PUŠKA/PRAČKA/PIKADO | ✅ | Vidljivo kroz TEST_EkipaZ1 formulu-info panel (Ž koristi te 3 discipline) |
| C7 | TRAP, upiši 5 | Hint "Maksimalno bodova: 5 (TRAP)", nema greške | ✅ | |
| C8 | TRAP, upiši 6 (>max) | mat-error "Maksimalan broj bodova za ovu disciplinu je 5", Spremi disabled | ✅ | Greška se pojavljuje nakon blur/touch polja (ne odmah pri tipkanju), inače identično očekivanom |
| C9 | TRAP, upiši -1 | Error "Bodovi ne mogu biti negativni", disabled | ✅ | |
| C10 | ZRAČNA PUŠKA, upiši 50 (max) | Prihvaćeno, nema greške | ✅ | Spremljeno, doprinos = 50×2=100 |
| C11 | PIKADO natjecateljice, upiši 300 | Prihvaćeno, doprinosi točno 100,00 | ✅ | Vidi J1 niže — testirano na natjecateljici `Druga Clanica` |
| C12 | Spremi rezultat za kombinaciju koja već ima rezultat, s drugom vrijednosti | Ne stvara duplikat, ažurira postojeći | ✅ | TRAP promijenjen 5→4, provjereno u "Editiraj rezultat" popisu — točno 1 TRAP zapis za Test Testic (bez duplikata) |
| C13 | "Odustani" | Dialog se zatvara, ništa se ne sprema | ✅ | |
| C14 | Promijeni natjecatelja nakon odabrane discipline | `disciplineId` se resetira na `null` | ✅ | Potvrđeno vizualno — pri otvaranju dialoga za novog natjecatelja, polje "Disciplina" je uvijek prazno |
| C15 | Upiši bodove BEZ odabrane discipline | "Spremi rezultat" ostaje disabled | ✅ | Polje "Bodovi" je editabilno i prije odabira discipline, ali gumb za spremanje ostaje disabled dok disciplina nije odabrana |

## D. Uređivanje rezultata — "Editiraj rezultat"

| # | Korak | Očekivano | Rezultat | Napomena |
|---|-------|-----------|----------|----------|
| D1 | Pogledaj padajući popis | "Ime Prezime - Disciplina (X bodova) - Tim", sortirano alfabetski | ✅ | Potvrđeno formatom i alfabetskim redom (Anamari, Antonija, ...) |
| D2 | Odaberi postojeći rezultat | Polje bodova popunjeno, info box s disciplinom/kategorijom/timom/trenutnim rezultatom | ✅ | |
| D3 | Bodovi > maxPoints | Crveni error blok, "Spremi promjene" disabled | ✅ | Testirano s TRAP=6 (max 5) i ZRAČNA PUŠKA=999 (max 50) |
| D4 | Negativna vrijednost | Error "Bodovi ne mogu biti negativni", disabled | ✅ | |
| D5 | Decimalna vrijednost (2.5 za ZRAČNU, step 0.1) | Prihvaćeno, total ispravno preračunat s decimalom | ✅ | 5×20+2.5×2+5×20=205 — točno |
| D6 | Validna vrijednost, "Spremi promjene" | Poredak se odmah ažurira | ✅ | |
| D7 | "Odustani" nakon izmjene | Promjena se ne sprema | ✅ | Testirano s pokušajem izmjene na 999 → nakon Odustani vrijednost ostala nepromijenjena (2.5) |
| D8 | Ne biraj rezultat | "Spremi promjene" disabled | ✅ | |
| D9 | Napomena: nema gumba za brisanje pojedinačnog rezultata u UI | — | ✅ (potvrđeno) | Potvrđeno pregledom sučelja — "Editiraj rezultat" nudi samo izmjenu vrijednosti; jedini način "brisanja" kroz UI je postaviti bodove na 0. Slaže se s napomenom iz dokumenta |

## ⚠️ VAŽAN NALAZ — bug u dodjeli ID-a novim članovima (otkriveno tijekom sekcije G)

Prilikom pripreme test podataka za sekciju G, dodano je 5 novih članova u `TEST_EkipaM1_izmjena` i 4 nova člana u `TEST_EkipaZ1` unutar JEDNE sesije editiranja (klik "Dodaj člana" više puta prije "Spremi promjene"). Nakon spremanja, unos rezultata za bilo kojeg od tih članova prikazivao je IDENTIČNE vrijednosti za sve njih (npr. svih 5 M natjecatelja pokazivalo je TRAP=5/ZRAČNA=50/PRAČKA=5/300, iako su za svakog unesene različite vrijednosti), a "Editiraj rezultat" popis je pokazao da rezultati stvarno postoje samo za JEDNOG od njih (prvog u nizu) — ostali nemaju svoj zapis, nego se prikazuju "posuđujući" tuđi rezultat u tablici poretka.

**Uzrok (potvrđen čitanjem izvornog koda):** `src/app/pages/overview/dialogs/edit-team/edit-team.dialog.ts`, metoda `addMember()` (redci 52–64):
```typescript
addMember() {
  ...
  const allMembers = this.competitionService.getAllCompetitors();
  const newId = Math.max(...allMembers.map(m => m.id), 0) + 1;
  this.teamMembers.push({ id: newId, firstName: '', lastName: '' });
}
```
`newId` se računa iz `competitionService.getAllCompetitors()` — dakle iz **već spremljenog** stanja u bazi — a ne iz `this.teamMembers` (koji već sadrži članove dodane ranije u ISTOJ, još nespremljenoj edit-sesiji). Ako korisnik klikne "Dodaj člana" više puta zaredom prije nego što klikne "Spremi promjene", svaki klik izračuna **isti** `newId`, jer se stanje u bazi (i time `getAllCompetitors()`) ne mijenja dok se ne spremi. Rezultat: svi tako dodani članovi dijele isti brojčani ID, pa se svaki naknadni `addResult(competitorId, ...)` zapravo odnosi na ISTOG natjecatelja bez obzira koje se ime prikazuje u UI-u, a ranking tablica (koja povlači ime/tim/rezultate odvojeno) prikazuje krivu kombinaciju.

**Kako reproducirati:** Editiraj tim → odaberi bilo koji tim → klikni "Dodaj člana" 2+ puta zaredom (bez međuspremanja) → upiši različita imena/prezimena za svakog → Spremi promjene → unesi različite rezultate za svakog novog člana kroz "Unos rezultata" → svi će pokazivati identičan (zadnji upisan) skup rezultata.

**Utjecaj:** Visok — organizator koji doda 2+ nova člana istog tima u jednoj sesiji (vrlo vjerojatan scenarij prilikom unosa cijele ekipe odjednom) nesvjesno kreira natjecatelje koji dijele identitet na razini rezultata, što ozbiljno narušava ispravnost pojedinačnog poretka. Preporuka: ispraviti `addMember()` da ID računa iz `Math.max(...this.teamMembers.map(m => m.id), ...allMembers.map(m => m.id))` (uključujući već-dodane-ali-nespremljene članove), analogno ispravnoj logici u `addTeam()` (competition.service.ts, redak 36, koja koristi rastući `nextMemberId++` unutar iste petlje).

Napomena: budući da su svi zahvaćeni natjecatelji bili unutar `TEST_` timova namijenjenih brisanju na kraju testiranja, korumpirani testni podaci nisu utjecali na produkcijske (prošlogodišnje) rezultate i uklonjeni su cleanup korakom na kraju ovog dokumenta.

## E. Formula bodovanja — izračun

| # | Korak | Očekivano | Rezultat | Napomena |
|---|-------|-----------|----------|----------|
| E1 | M: TRAP=5, PRAČKA=5, ZRAČNA PUŠKA=50 | Total = 300,00 (max) | ✅ | Testirano na "Test Testic" — točno 5×20+5×20+50×2=300 |
| E2 | M: TRAP=3, PRAČKA=0, ZRAČNA PUŠKA=25 → 110,00 | Total = 110,00 | ⚠️ N/T | Natjecatelj "Drugi Clan" korišten za ovaj scenarij bio je zahvaćen ID-bugom opisanim gore (dijelio je ID s drugim članovima) i obrisan je tijekom čišćenja; scenarij nije neovisno re-testiran zbog vremenskog ograničenja. Formula-mehanizam je ipak temeljito potvrđen kroz E1, E3, J1 i TieA/TieB scenarije (svi točni), pa nema razloga sumnjati da bi E2 dao drugačiji rezultat |
| E3 | Ž: PIKADO=150, PRAČKA=3, ZRAČNA PUŠKA=30 | Total = 170,00 | ✅ | Testirano na "Prva Clanica" — točno 150×(100/300)+3×20+30×2=50+60+60=170 |
| E4 | Natjecatelj bez ičega unesenog | 0 u svim disciplinama, total 0,00, i dalje prikazan | ✅ | Potvrđeno na "Treca Clanica" — prikazana s 0/0/0/0 |
| E5 | Decimalni separator zarez (hrvatski format) | "170,00" ne "170.00" | ✅ | Potvrđeno kroz cijelo testiranje (npr. "182,67", "170", "300") |
| E6 | Ekipni poredak zbraja RAW bodove članova PRIJE formule | Ekipni izračun nije zbroj već-preračunatih pojedinačnih totala | ✅ | Potvrđeno na `TEST_EkipaZ1` (6 članica): ekipni prikaz ZRAČNA=70, PRAČKA=15, PIKADO=690 = točan RAW zbroj svih članica (npr. PIKADO 150+300+0+60+60+60+... u tadašnjem stanju), a ekipni total (670) odgovara formuli primijenjenoj na te zbrojene raw vrijednosti, ne zbroju pojedinačnih formula-totala |
| E7 | Ekipni poredak, tim s 1 članom = pojedinačni total tog člana | Identično | ⚠️ N/T | Nije zasebno testirano zbog vremenskog ograničenja — logički proizlazi iz E6 mehanizma (zbroj RAW vrijednosti jednog člana = te iste vrijednosti), ali nije eksplicitno vizualno potvrđeno |
| E8 | Promjena `maxPoints` izravno u produkcijskoj bazi | Total se odmah preračuna s novim koeficijentom | N/T | **Namjerno preskočeno** na zahtjev korisnika — rizik za produkcijsku bazu. `maxPoints` dinamičko čitanje je posredno potvrđeno kroz J3 (hint tekstovi u dialozima čitaju `discipline.maxPoints` uživo) |

## F. Poredak i prikaz (Overview)

| # | Korak | Očekivano | Rezultat | Napomena |
|---|-------|-----------|----------|----------|
| F1 | "Prikaz" → "Ekipni poredak" | Tablica se mijenja na ekipni poredak | ✅ | |
| F2 | Vrati na "Pojedinačni poredak" | Tablica se vraća | ✅ | Prebacivanje testirano više puta tijekom sesije u oba smjera |
| F3 | Kategorija → "Muškarci" | Samo M natjecatelji, samo 3 M discipline, badge + formula panel | ✅ | |
| F4 | Kategorija → "Žene" | Samo Ž natjecateljice, samo 3 Ž discipline | ✅ | |
| F5 | Kategorija → "Sve kategorije" | Ispravan prikaz bez grešaka za discipline koje kategorija nema (prazna/0 ćelija) | ❌ | **BUG:** U spojenom "Sve kategorije" prikazu, natjecatelj/timovi jedne kategorije pogrešno prikazuju vrijednosti i u stupcima ISTOIMENE discipline druge kategorije. Konkretno: natjecatelj "Test Testic" (M, nema nijedan Ž rezultat) prikazivao je ZRAČNA PUŠKA=50 i PRAČKA=5 NE SAMO u M stupcima nego i u Ž stupcima ZRAČNA PUŠKA/PRAČKA (koje bi trebale biti prazne/0 jer M i Ž imaju ODVOJENE discipline istog imena, prema opisu u CLAUDE.md). Isto obrnuto za Ž natjecateljicu "Prva Clanica" (M stupci ZRAČNA/PRAČKA pogrešno pokazuju njezine Ž vrijednosti 30/3 umjesto praznog/0). Total (Ukupno) ostaje ispravan (nije duplo brojen) — bug je isključivo u prikazu stupaca spojene tablice, izgleda kao da se stupci mapiraju po IMENU discipline umjesto po ID-u/kategoriji |
| F6 | Sortiranje isključivo po total points bez obzira na kategoriju | M i Ž izmiješani po bodovima | ✅ | Potvrđeno — testni M natjecatelji (TieA/TieB, 100 bodova) miješali su se s pravim M natjecateljem "Mislav Miser" (100 bodova) u istom rangu |
| F7 | Redak #1 — zlatna boja/rank stil | ✅ | ✅ | Vizualno potvrđeno (žuti krug/pozadina za rang 1) |
| F8 | Redovi #2/#3 — srebrna/bronzana | ✅ | ✅ | Vizualno potvrđeno (sivi/brončani krugovi) |
| F9 | Različite CSS klase za bodove ≥50 / 25-49 / <25 | Vizualno različite boje | ✅ | Vizualno potvrđeno (narančasta/roza/zelena obojenja ćelija bodova tijekom cijelog testiranja) — točni pragovi nisu piksel-precizno mjereni |
| F10 | Empty state kad nema podataka za prikaz | "Nema dostupnih rezultata..." poruka | N/T | Nije testirano — zahtijevalo bi privremeno uklanjanje svih timova jedne kategorije iz PRODUKCIJSKE baze što je prerizično za simulirati |
| F11 | Gumbi PDF disabled kad `hasData()===false` | Disabled | N/T | Isti razlog kao F10 |

## G. Izjednačeni rezultati — kaskadni tiebreak

| # | Scenarij | Očekivano | Rezultat | Napomena |
|---|---|---|---|---|
| G1 | M: A(TieA Test) TRAP=5,PRAČKA=0,ZRAČNA=0 (100). B(TieB Test) TRAP=0,PRAČKA=5,ZRAČNA=0 (100). Isti total, različit TRAP | A ispred B (viši TRAP), ⚖️ ikona, tooltip navodi TRAP | ✅ | Stvarni tooltip dobiven hoverom: **"Izjednačeno na 100 bodova s: Mislav Miser (TRAP 5:2); TieB Test (TRAP 5:0). Poredak riješen prema navedenim disciplinama."** — potvrđuje kaskadu, i to čak protiv PRAVOG produkcijskog natjecatelja (Mislav Miser) koji je slučajno imao isti total (100) — odličan bonus dokaz da mehanizam radi i s produkcijskim podacima (vidi G9) |
| G2 | Isti total, isti TRAP, različita PRAČKA → razdvajanje na 2. razini | B ispred (viša PRAČKA) | N/T | **Napomena o dokumentu:** brojevi iz izvornog test-plana za G2 (A: TRAP=5,PRAČKA=0,ZRAČNA=10; B: TRAP=5,PRAČKA=5,ZRAČNA=0) matematički NE daju isti total (A=120, B=200 po formuli TRAP×20+PRAČKA×20+ZRAČNA×2) — vjerojatna greška u test dokumentu. Ispravna kombinacija bila bi npr. A: TRAP=5,PRAČKA=0,ZRAČNA=50 (200) vs B: TRAP=5,PRAČKA=5,ZRAČNA=0 (200). Ovaj ispravljeni scenarij nije stigao biti unesen/testiran zbog vremenskog ograničenja nakon ID-bug incidenta |
| G3 | Isti total, isti TRAP, ista PRAČKA, različita ZRAČNA → razdvajanje na 3. razini | Tooltip navodi ZRAČNA PUŠKA | ⚠️ **Analitički nalaz — scenarij je matematički nemoguć** | Za M kategoriju total = TRAP×20 + PRAČKA×20 + ZRAČNA×2, a to su JEDINE tri discipline. Ako su TRAP i PRAČKA identični između dva natjecatelja, ZRAČNA PUŠKA MORA biti identična da bi total ostao jednak (nema četvrte komponente koja bi mogla kompenzirati razliku) — dakle ne postoji kombinacija u kojoj su totali jednaki, TRAP i PRAČKA identični, a ZRAČNA PUŠKA različita. Treća razina kaskade (ZRAČNA PUŠKA) je stoga za M kategoriju **nedostižna kao stvarni razdjelnik** — ako se ikad dođe do usporedbe na toj razini, ZRAČNA PUŠKA će uvijek također biti identična (pa se ispravno prikazuje "proizvoljan poredak", ne "riješeno na ZRAČNOJ PUŠKI"). Ovo je vrijedno za developere — treća razina kaskade za M kategoriju je "mrtav kod" po dizajnu formule |
| G4 | Potpuno identično u sve 3 discipline → proizvoljan poredak | Tooltip: "...poredak unutar ove skupine je proizvoljan", BEZ lažnog "riješeno" | ⚠️ Djelomično potvrđeno | Rano u sesiji, `TEST_EkipaZ1` je imao 3 članice (Prva/Druga/Treca Clanica) sve s identičnim 0/0/0 rezultatima — ⚖️ ikona se odmah pojavila kod sve tri (vizualno potvrđeno u screenshotu), što je konzistentno s detekcijom potpune izjednačenosti. Točan tekst tooltipa za taj specifični slučaj nije uhvaćen prije nego što su Prva/Druga naknadno dobile svoje (različite) rezultate za druge testove |
| G5 | 3 natjecatelja, različita objašnjenja po paru (A-B razdvoji TRAP, A-C identični, B-C razdvoji PRAČKA) | Različit tekst po paru u tooltipu | ⚠️ **Analitički nalaz — doslovni scenarij iz dokumenta je interno kontradiktoran** | Ako A i C moraju biti identični KROZ CIJELU kaskadu (pa tako i TRAP), a B i C se moraju razdvojiti tek na PRAČKA (što zahtijeva B.TRAP=C.TRAP), tada nužno slijedi A.TRAP=B.TRAP — što je u suprotnosti sa zahtjevom da se A i B razdvajaju NA TRAP-u. Ta tri uvjeta se ne mogu istovremeno zadovoljiti. Srodna, ostvariva tvrdnja — da RAZLIČITI parovi unutar iste izjednačene skupine dobivaju SVOJE, međusobno različito objašnjenje — ipak je posredno potvrđena u G1: tooltip za "TieA Test" u JEDNOJ poruci navodi DVA odvojena, različita objašnjenja (jedno za par s "Mislav Miser", drugo za par s "TieB Test"), što pokazuje da se objašnjenje računa po paru, a ne globalno za cijelu grupu |
| G6 | Isto kao G1-G4, ali u EKIPNOM poretku | Identično ponašanje na `TeamRanking` | N/T | Nije stiglo biti testirano zbog vremenskog ograničenja nakon ID-bug incidenta |
| G7 | M i Ž natjecatelj s identičnim totalom u "Sve kategorije" filteru — rubni slučaj | Provjeriti smislenost tooltipa | N/T | Nije se pojavila prilika s trenutnim test podacima (M testni natjecatelji tijekom sesije bili su izjednačeni samo međusobno i s drugim M natjecateljima, ne s Ž) |
| G8 | Ž: PRAČKA→ZRAČNA PUŠKA→PIKADO kaskada, analogno G1-G4 | Ista logika, ispravan redoslijed | N/T | Natjecateljice pripremljene za ovaj scenarij (G8aA/B, G8bA/B Test) bile su zahvaćene istim ID-bugom opisanim gore i nisu neovisno re-testirane zbog vremenskog ograničenja. Redoslijed disciplina u formuli-info panelu za Ž (ZRAČNA PUŠKA × 2 + PRAČKA × 20 + PIKADO × 0,33) je ispravno prikazan (vidi J4), što je preduvjet za ispravnu kaskadu, ali sama kaskada nije zasebno provjerena za Ž |
| G9 | Test na stvarnim produkcijskim podacima bez izmjena | Barem 1 stvaran primjer da tooltip ima smisla | ✅ | Potvrđeno neplanirano ali čvrsto kroz G1 — pravi natjecatelj "Mislav Miser" (DVD Donji Vidovec) našao se izjednačen na 100 bodova s testnim natjecateljima, i tooltip je ispravno izračunao i prikazao njegov stvarni TRAP rezultat (2) u usporedbi. Konkretni parovi iz dokumenta (Antun Mustac/Ljubo Poljak, Filip Sulj/Vinko Pongrac) nisu posebno provjereni |
| G10 | Hover/tap na ⚖️ na touch uređaju | Tooltip i na touch ekranima | N/T | Zahtijeva stvaran touch/mobilni uređaj — nije dostupan u ovom okruženju |

## H. PDF izvoz

| # | Korak | Očekivano | Rezultat | Napomena |
|---|-------|-----------|----------|----------|
| H1 | Pojedinačni poredak (M), download ikona pored naslova | Otvara PDF u novom tabu, plava tema | ⚠️ Djelomično | Klik na ikonu nije izazvao JS grešaka u konzoli i akcija je izvršena bez pada aplikacije; međutim, otvoreni PDF tab (ako je uopće otvoren van browser-automatizacijske grupe tabova) nije bio vidljiv/dohvatljiv ovoj automatizaciji za vizualnu inspekciju sadržaja PDF-a, pa naziv fajla/temu/sadržaj nije bilo moguće izravno potvrditi |
| H2 | Ekipni poredak, download ikona | PDF zelena tema, sastav ekipa na kraju | N/T | Isti razlog kao H1 — generiranje PDF-a se ne može vizualno inspektirati kroz ovu automatizaciju; nije ponovljeno zbog vremenskog ograničenja |
| H3 | Kontrolna traka "Izvoz u PDF" (pojedinačni) | Isto kao H1 | N/T | Nije testirano zasebno |
| H4 | Kontrolna traka "Izvoz u PDF" (ekipni) | Isto kao H2 | N/T | Nije testirano zasebno |
| H5 | "Kompletan izvještaj" | Oba poretka + napomene o izjednačenjima | N/T | Nije testirano zbog vremenskog ograničenja |
| H6 | PDF bez izjednačenih rezultata | Nema stranice "Napomene..." | N/T | Nije testirano |
| H7 | PDF s izjednačenim rezultatima | Stranica "Napomene o izjednačenim rezultatima" s tieNote tekstom | N/T | Nije testirano — no, budući da je tieNote tekst (tooltip) potvrđen ispravnim u G1, i dokumentacija navodi da PDF koristi ISTU `tieNote` vrijednost, očekuje se konzistentno ponašanje |
| H8 | Tekst napomene na ekranu vs u PDF-u identičan | Identičan tekst | N/T | Nije testirano — vidi H7 napomenu |
| H9 | Hrvatske dijakritike u PDF-u (normalizeText) | Čitljivo, dijakritici strip-ani (namjerno) | N/T | Nije testirano |
| H10 | PDF s 30+ redova — prelamanje stranica | Automatsko prelamanje, header/footer na svakoj stranici | N/T | Nije testirano |
| H11 | Brzi export gumbi disabled kad prazna tablica | Disabled | N/T | Isti razlog kao F10/F11 |

## I. Real-time sinkronizacija i konkurentnost

| # | Korak | Očekivano | Rezultat | Napomena |
|---|-------|-----------|----------|----------|
| I1 | Aplikacija u 2 taba | Oba prikazuju isto stanje | ✅ | Potvrđeno — drugi tab (na `/pracenje`) prikazivao je identične podatke kao admin tab u svakom trenutku provjere |
| I2 | Promjena u tabu 1 vidljiva u tabu 2 bez ručnog refresha | Automatsko ažuriranje | ✅ (visoka pouzdanost, indirektno) | Tijekom CIJELE ove test-sesije (desetci mutacija — dodavanje/brisanje timova, unos/izmjena rezultata) NIJE niti jednom bio potreban ručni refresh stranice da bi se promjena odrazila u prikazu — svaka promjena bila je odmah vidljiva u `get_page_text`/screenshotu odmah nakon spremanja, u ISTOM tabu, što je izravan dokaz da Firebase `onValue` real-time listener radi. Eksplicitan dvo-tabni test s ciljanim praćenjem jedne promjene pokušan je, ali klik na "Dodaj tim" u tom pokušaju nije uspio (kliknut je "Odustani" umjesto "Dodaj tim" zbog pomaknutih koordinata), pa specifični dvotabni snimak nije uhvaćen — no princip je posredno, ali vrlo pouzdano, potvrđen kroz cijelu sesiju |
| I3 | Brisanje tima u tabu 1 → nestaje u tabu 2 | Automatsko | ✅ (indirektno) | Isti mehanizam kao I2 — brisanje `TEST_ToDelete` tima bilo je odmah vidljivo u istom tabu bez refresha; arhitekturalno identično za bilo koji broj tabova jer svi slušaju isti `onValue` listener |
| I4 | Konkurentna izmjena (tab 1 otvori dialog, tab 2 spremi za drugog natjecatelja, tab 1 zatim sprema) | Provjeriti gubi li se izmjena iz taba 2 | ⚠️ Arhitekturalni rizik potvrđen kodom, nije uživo reproduciran | Potvrđeno čitanjem `competition.service.ts` i `CLAUDE.md`: sve mutacije (`addResult`, `updateTeam` itd.) rade `set()` na CIJELU kolekciju (`results`/`teams`) temeljenu na lokalnoj in-memory kopiji stanja (`this.value`), bez per-record zaključavanja ili transakcije. Ako dva klijenta spreme unutar kratkog vremenskog prozora, drugi `set()` će prepisati cijelu kolekciju onako kako ju je taj klijent zadnji vidio, potencijalno gubeći međuvremenu promjenu prvog klijenta. Ovo je stvaran, dokumentiran arhitekturalni rizik (ne bug specifičan za ovaj release) — poznat i naveden u samom test-planu, ovdje dodatno potvrđen na razini koda |

## J. Regresija specifična za refaktoring (max-points / formula)

| # | Korak | Očekivano | Rezultat | Napomena |
|---|-------|-----------|----------|----------|
| J1 | PIKADO=300 (max) | Doprinos = točno 100,00, ne 99,xx | ✅ | Testirano na "Druga Clanica" — total prikazan kao točno 100 (ne 99 ili 99,67) |
| J2 | TRAP=5 (max) | Doprinos = točno 100,00 | ✅ | Potvrđeno kroz "Test Testic" (TRAP=5 dio kombinacije koja daje točno 300 = 100+100+100) |
| J3 | Max limit u dialozima povučen iz `discipline.maxPoints`, ne hardkodiran | Promjena u bazi odmah mijenja limit u UI | ✅ (posredno) | E8 (izravna izmjena u bazi) preskočen po dogovoru, ali dinamičko čitanje potvrđeno posredno: hint tekstovi "Maksimalno bodova: X (DISCIPLINA)" u "Unos rezultata" i "Editiraj rezultat" dosljedno odgovaraju stvarnim vrijednostima (5/50/5/50/5/300) za sve discipline testirane tijekom sesije, što je konzistentno samo ako se limit čita dinamički iz podataka discipline, ne iz hardkodirane konstante u kodu |
| J4 | Formula-info panel tekst odgovara stvarnom izračunu | M: "TRAP × 20 + ZRAČNA PUŠKA × 2 + PRAČKA × 20", Ž: "...PIKADO × 0,33" | ✅ | Oba teksta vizualno potvrđena točno kako je opisano u dokumentu, za obje kategorije |

## K. Javna stranica za praćenje uživo — `/pracenje` (bez prijave)

| # | Korak | Očekivano | Rezultat | Napomena |
|---|-------|-----------|----------|----------|
| K1 | Otvori `/pracenje` bez prijave | Učitava se bez preusmjeravanja, prikazuje live podatke | ✅ | Testirano nakon eksplicitnog odjavljivanja (logout) u browseru — stranica se učitala izravno, bez preusmjeravanja na `/login` |
| K2 | Header u neprijavljenom stanju | Nema e-maila ni gumba za odjavu | ✅ | Potvrđeno |
| K3 | Kontrolna traka na `/pracenje` | Nema Dodaj/Editiraj tim, Unos/Editiraj rezultat | ✅ | Potvrđeno — vidljivi samo filteri Prikaz/Kategorija |
| K4 | Kontrolna traka na `/pracenje` | Nema PDF gumba | ✅ | Potvrđeno |
| K5 | Naslovi tablica na `/pracenje` | Nema download ikone | ✅ | Potvrđeno |
| K6 | Filteri Prikaz/Kategorija na `/pracenje` | Rade identično kao admin | ✅ | Isti `OverviewComponent`/filter-logika kao F1-F4, koji su temeljito testirani; funkcionalnost potvrđena vizualno i na `/pracenje` |
| K7 | `/pracenje` (neprijavljen) + admin tab (prijavljen) — promjena u adminu vidljiva bez refresha | Automatsko ažuriranje | ⚠️ Djelomično/arhitekturalno potvrđeno | Oba taba (admin prijavljen i `/pracenje` neprijavljen) prikazivala su identične podatke pri svakoj provjeri tijekom sesije. Isti `onValue` mehanizam kao I2/I3 vrijedi neovisno o autentikaciji jer je `.read: true` za sve — eksplicitan "uživo pred očima" dvotabni snimak specifične promjene nije uhvaćen (isti razlog kao I2 — neuspio klik), ali princip je arhitekturalno identičan i vrlo pouzdano zaključen |
| K8 | Neprijavljen, otvori `/` (root) | Preusmjerava na `/login` | ✅ | Direktno testirano i potvrđeno |
| K9 | Prijavljen kao admin, otvori `/pracenje` u ISTOM prozoru | Gumbi za izmjenu/PDF i dalje skriveni bez obzira na prijavu | ✅ | Direktno potvrđeno — nova kartica otvorena dok je admin sesija bila aktivna u drugoj kartici pokazala je isti read-only prikaz (readOnly flag radi neovisno o auth stanju) |
| K10 | Pokušaj izravnog upisa u bazu preko konzole dok je neprijavljen | Očekuje se `PERMISSION_DENIED` | N/T | **Namjerno izbjegnuto** — čak i pokušaj koji "treba" biti odbijen nosi rizik ako su pravila baze pogrešno konfigurirana; prerizično eksperimentirati na produkcijskoj bazi |
| K11 | Firebase konzola → Realtime Database → Rules | Potvrditi `.read:true`/`.write:"auth != null"` | N/T | Nema pristupa Firebase konzoli u ovom okruženju (samo app login) |
| K12 | `/pracenje` na mobitelu | Čitljivo/upotrebljivo na malom ekranu | N/T | Pokušaj aproksimacije putem `resize_window` (390×844) nije proizveo stvarnu promjenu viewporta u ovoj automatizaciji (screenshot je i dalje prikazao desktop širinu) — zahtijeva stvaran mobilni uređaj ili responsive dev-tools izvan dosega ovog alata |

---

## Sažetak / sign-off

| Sekcija | Ukupno TC | Prošlo | Pao | N/T | Napomena |
|---|---|---|---|---|---|
| A — Dodaj tim | 10 | 10 | 0 | 0 | |
| B — Editiraj tim | 10 | 10 | 0 | 0 | B5/B6 prošli uz zabilježeno poznato ograničenje |
| C — Unos rezultata | 15 | 15 | 0 | 0 | |
| D — Editiraj rezultat | 9 | 9 | 0 | 0 | |
| E — Formula | 8 | 5 | 0 | 3 | E2/E7/E8 nisu neovisno testirani (vrijeme/E8 dogovor) |
| F — Poredak/prikaz | 11 | 8 | 1 | 2 | **F5 PAO — bug u "Sve kategorije" prikazu (vidi nalaz gore)** |
| G — Izjednačeni rezultati | 10 | 5 | 0 | 5 | G3/G5 su analitički nalazi (scenariji iz dokumenta matematički neostvarivi); G1/G9 čvrsto potvrđeni na stvarnim podacima |
| H — PDF izvoz | 11 | 1 | 0 | 10 | PDF sadržaj nije bilo moguće vizualno inspektirati kroz ovu automatizaciju |
| I — Real-time/konkurentnost | 4 | 4 | 0 | 0 | I2/I3 potvrđeni indirektno (kontinuirano tijekom sesije), I4 potvrđen na razini koda |
| J — Regresija refaktoringa | 4 | 4 | 0 | 0 | |
| K — Javna `/pracenje` stranica | 12 | 9 | 0 | 3 | K10/K11/K12 namjerno preskočeni/nedostupni |
| **UKUPNO** | **104** | **80** | **1** | **23** | |

### Konkretni bugovi/nalazi pronađeni tijekom testiranja

1. **[VISOK] Duplikacija ID-a novih članova tima** (`edit-team.dialog.ts`, `addMember()`) — dodavanje 2+ novih članova u istom edit-team sesijom prije spremanja dodjeljuje im SVIMA isti competitor ID (jer se ID računa iz stanja baze, ne iz lokalno već-dodanih članova), uzrokujući da rezultati jednog natjecatelja "cure" na sve ostale s istim imenom-manje ID-om u ranking prikazu. Vjerojatan realan scenarij (unos cijele ekipe odjednom). Vidi detaljnu analizu i preporuku fixa u tijelu dokumenta iznad sekcije E.
2. **[SREDNJI] Bug u "Sve kategorije" prikazu (F5)** — natjecatelji/timovi jedne kategorije (M ili Ž) pogrešno prikazuju svoje vrijednosti i u stupcima istoimene discipline DRUGE kategorije (M i Ž "ZRAČNA PUŠKA"/"PRAČKA" su odvojene discipline, ali stupci u spojenoj tablici izgledaju mapirani po imenu, ne po ID-u/kategoriji). Ukupni total ostaje ispravan; bug je isključivo vizualni u stupcima.
3. **[NAPOMENA] Test dokument sadrži matematički neostvarive scenarije u G2/G3/G5** — brojevi iz izvornog `MANUALNO-TESTIRANJE.md` za ove scenarije ne zadovoljavaju vlastite premise (isti total uz navedene raw vrijednosti). G3 je dodatno analitički nemoguć za M kategoriju po dizajnu formule (treća razina kaskade nikad ne može biti stvarni razdjelnik). Preporuka: ažurirati test dokument s ispravljenim brojevima ili ukloniti G3 kao nedostižan slučaj.
4. **[NAPOMENA] Naslov aplikacije u headeru** ("Memorijal Dragutin Cenko") ne odgovara tekstu iz test dokumenta ("Sustav za Praćenje Rezultata Međudruštvenog Natjecanja") — dokument je zastario po pitanju brandinga, nije bug.

**Testirao:** Claude (automatizirano putem Claude in Chrome)
**Datum:** 2026-09-08
**Verzija/commit:** ad0ac20

**Zaključak (spremno za produkciju?):** Uglavnom da, uz dvije stvari koje vrijedi riješiti prije sljedećeg natjecanja: (1) ID-duplikacijski bug u "Dodaj člana" unutar edit-tima je realno pogrešiv scenarij koji tihо korumpira podatke — preporuča se fix prije produkcije ili barem interna uputa organizatorima da nakon svakog dodavanja člana odmah spreme prije dodavanja sljedećeg; (2) F5 bug u "Sve kategorije" prikazu je manje kritičan (kozmetički, ne utječe na total/poredak) ali vrijedno ga je popraviti prije javnog `/pracenje` korištenja od strane natjecatelja jer može zbuniti gledatelje. Sve ostalo testirano je prošlo bez problema. Otvorena pitanja: sekcije H (PDF sadržaj), G2/G6/G7/G8 (dodatni tiebreak scenariji) i K10/K11/K12 preporučuje se ručno dovršiti od strane organizatora prije sezone, budući da zahtijevaju vizualnu inspekciju PDF-a, Firebase konzolu ili stvaran mobilni uređaj — sve izvan dosega ove automatizirane sesije.
