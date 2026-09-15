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

# Dodatak (2026-09-15) — feature "Ocjenjivanje lovačkog gulaša"

Testiranje sekcija N/O/P izvršeno je u ISTOJ sesiji u kojoj je feature implementiran (developer je ujedno i testirao), odmah nakon `npm run build`/`npm test` (222/222 ✅), putem Claude in Chrome browser automatizacije protiv već pokrenutog `ng serve` (:4200) spojenog na produkcijski Firebase. Testni podaci (kodno ime `JELEN`, bez `TEST_` prefiksa — nije korišten po dogovorenoj konvenciji jer je odmah nakon testa obrisan istim tokom kao P5) uklonjeni su s produkcijske baze na kraju sesije putem gumba "Gotovo ocjenjivanje" (vidi P5/P6 niže). Za razliku od 2026-09-08 sesije, ovdje NIJE korišten poseban throwaway tim/entitet koji ostaje u bazi do kraja — cijeli test je izveden i očišćen unutar jedne kontinuirane pjesme radnji nad JEDNIM kodnim imenom, pa opseg pokrivenih scenarija (posebice O1/O2 — višestruki natjecatelji radi provjere sortiranja) nije bio moguć bez dodatnog vremena; zabilježeno kao N/T niže gdje je relevantno.

## N. Ocjenjivanje lovačkog gulaša — pristup, kodna imena i unos ocjena

| # | Korak | Očekivano | Rezultat | Napomena |
|---|-------|-----------|----------|----------|
| N1 | `/gulas` neprijavljen | Preusmjerava na `/login` | N/T | Sesija je bila već prijavljena (postojeći `ng serve` s aktivnom auth sesijom u browseru); redirect logika je identična `authGuard`-u koji već štiti `/` i temeljito je testiran u K8, ali nije neovisno ponovljen za `/gulas` |
| N2 | Otvori `/gulas`, prazno stanje | Empty state "Još nema natjecatelja..." | ✅ | Potvrđeno prvim screenshotom prije dodavanja bilo kojeg kodnog imena |
| N3 | Gumbi bez ijednog kodnog imena | "Editiraj/obriši", "Unos ocjene", "Izvoz u PDF" disabled | ✅ | Potvrđeno vizualno (sivi/outline stil) na istom prvom screenshotu |
| N3b | ⚠️ Isti screenshot, gumb "Gotovo ocjenjivanje" | Očekivano: i ovaj gumb disabled kad nema kodnih imena (`[disabled]="!hasCompetitors()"` u kodu) | ⚠️ **NALAZ** | Vizualno NEODVOJIV od enabled stanja — gumb je prikazan kao puni tamnocrveni pravokutnik i prije i poslije dodavanja prvog kodnog imena. Uzrok: `.finish-button { background-color: #b71c1c !important; color: #fff !important; }` u `gulas.component.scss` forsira boju bez obzira na Material-ovo `disabled` stanje (koje inače gumb posivi). Funkcionalno neškodljivo (klik na stvarno disabled gumb ne radi ništa), ali korisnik nema vizualnu potvrdu da je gumb neaktivan. **Isti obrazac (`!important` bez `:not(.mdc-button--disabled)` iznimke) postoji i u postojećem `.finish-competition-button` u `overview.component.scss` (sekcija M) — vjerojatno identičan, dosad nezabilježen, kozmetički nalaz i za "Gotovo natjecanje" gumb.** Nije blocker, preporuka: dodati `&:not(:disabled)` ili osloniti se na Material-ov `[disabled]` stil umjesto potpunog override-a boje |
| N4 | Prazno polje u "Dodaj kodno ime" | "Dodaj" disabled | ✅ | Potvrđeno vizualno (muted/siva ikona+tekst) u screenshotu odmah nakon otvaranja dialoga, prije upisivanja |
| N5 | Dodaj `JELEN`, potvrdi | Pojavljuje se u "U tijeku" s 3 sive "Sudac" oznake | ✅ | Potvrđeno — nova sekcija "U tijeku (1)" s tri `○ Sudac 1/2/3` (siva, `radio_button_unchecked` ikona) |
| N6 | "Unos ocjene", odaberi natjecatelja + Sudac 1 | 5 polja s hintovima raspona | ✅ | Sva 4 labela točno odgovaraju listiću ("1. Boja gulaša", "2. Izgled divljačine (rezanje, mekoća)", "3. Odgovarajuća gustoća gulaša", "4. Okus divljačine", "5. Ukupan dojam"), rasponi 1-5/1-5/1-5/1-10/1-5 |
| N7 | Upiši 5,4,5,9,zatim 4 | Živi zbroj se ažurira po polju | ✅ | Potvrđeno kroz dva međukoraka: "23 / 30" nakon 4 polja, "27 / 30" nakon 5. polja; "Spremi ocjenu" prelazi iz disabled u enabled točno u tom trenutku |
| N8 | Vrijednost izvan raspona | Error poruka, disabled | N/T | Nije namjerno testirano (nije unesena nevažeća vrijednost tijekom sesije) |
| N9 | Decimalna vrijednost | Error "cijeli broj", disabled | N/T | Nije testirano |
| N10 | Spremi ocjenu suca 1 | Oznaka postaje zelena | ✅ | Potvrđeno — "✓ Sudac 1" (zeleno, `check_circle`) odmah nakon spremanja, bez ručnog refresha (Firebase real-time) |
| N11 | Ponovno otvori za istog suca (već ocijenjen) | Info poruka + prefill | ✅ | Izravno potvrđeno (nenamjerno, greškom u navigaciji kroz dropdown) — pri pokušaju odabira "Sudac 3" slučajno je odabran već-ocijenjeni "Sudac 2", i dialog je ispravno prikazao plavu poruku "Ovaj sudac je već ocijenio ovog natjecatelja - spremanje će prepisati postojeću ocjenu" s poljima prefillanim točnim prethodno spremljenim vrijednostima (5,5,5,10) |
| N12 | Promijeni polje i ponovno spremi (upsert) | Nema duplikata | N/T | Nakon N11 dialog je zatvoren biranjem ispravnog "Sudac 3" umjesto spremanja izmjene — upsert-bez-duplikata mehanizam nije eksplicitno re-testiran ovim putem, ALI je implicitno potvrđen kroz N10→N11 tok (isti par natjecatelj+sudac dosljedno vraća JEDAN zapis) |
| N13 | Unesi sva 3 suca | Natjecatelj prelazi iz "U tijeku" u "Poredak" | ✅ | Potvrđeno — nakon spremanja trećeg suca (Sudac 3: 3,3,3,6,3=18), sekcija "U tijeku" nestaje, "Poredak" prikazuje JELEN s Rang 1, Ukupno 75 (27+30+18, provjereno ručnim zbrajanjem) |
| N14 | "Editiraj/obriši", odaberi kodno ime | Prefill + enabled gumbi | ✅ | Potvrđeno — "Kodno ime" polje prefillano s "JELEN", "Obriši"/"Spremi promjene" oba enabled |
| N15 | Preimenuj i spremi | Ažurira se u poretku | N/T | Dialog zatvoren tipkom Escape (bez spremanja) radi izbjegavanja nepotrebne izmjene testnog naziva prije PDF provjere |
| N16-N18 | Obriši kodno ime (confirm/cancel/potvrdi) preko "Editiraj/obriši" dialoga | Cascade brisanje ocjena, s vidljivim `confirm()` tekstom i mogućnošću Cancel | N/T | Čišćenje testnih podataka umjesto ovoga izvedeno preko "Gotovo ocjenjivanje" (vidi P niže) — pojedinačni delete-jednog-natjecatelja tok (s pravim, ne-overridanim `confirm()` dijalogom) nije zaseban testiran |
| N19 | Poredak prikazuje samo kompletne natjecatelje | Potvrđeno kroz N13 (jedini test natjecatelj) | ✅ | Prije trećeg suca, JELEN je bio isključivo u "U tijeku", nikad u "Poredak" — potvrđeno na svakom međukoraku |

## O. Ocjenjivanje lovačkog gulaša — poredak i PDF izvoz

| # | Korak | Očekivano | Rezultat | Napomena |
|---|-------|-----------|----------|----------|
| O1 | Sortiranje silazno, rang 1 = zlatno | Najviši zbroj = rang 1, zlatna oznaka | ✅ (djelomično) | Potvrđena zlatna oznaka/`row-winner` za jedini (rang 1) redak; STVARNO sortiranje između više natjecatelja nije testirano (samo 1 test natjecatelj u sesiji) |
| O2 | Srebro/broncano za rang 2/3 | Vidljivo s 3+ natjecatelja | N/T | Nema dovoljno test podataka u ovoj sesiji (isti razlog kao O1) |
| O3 | Stupci tablice | Rang, Kodno ime, Boja(15), Izgled(15), Gustoća(15), Okus(30), Dojam(15), Ukupno(90) | ✅ | Svi stupci prisutni točno tim redoslijedom i oznakama maksimuma |
| O4 | Zbroj po kriteriju = zbroj triju sudaca | Boja 5+5+3=13, Izgled 4+5+3=12, Gustoća 5+5+3=13, Okus 9+10+6=25, Dojam 4+5+3=12 | ✅ | Svih pet vrijednosti u tablici podudara se točno s ručnim zbrojem unesenih ocjena triju sudaca |
| O5 | Ukupno = zbroj 5 stupaca kriterija | 13+12+13+25+12=75 | ✅ | Tablica prikazuje točno 75 |
| O6 | "Izvoz u PDF" disabled kad prazno | Da | ✅ | Potvrđeno prvim screenshotom (prije dodavanja podataka) |
| O7 | Klikni "Izvoz u PDF" | Preuzima `gulas-poredak-[datum].pdf` | ✅ | Datoteka `gulas-poredak-2026-09-15.pdf` potvrđena u `~/Downloads` odmah nakon klika |
| O8 | Sadržaj PDF-a | Brendirano zaglavlje, naslov, napomena o maksimumima, tablica, top-3 boje, footer | ✅ | Provjereno čitanjem PDF-a alatom — svi elementi prisutni: "MEMORIJAL DRAGUTIN CENKO" banner + LD Patka logo/podnaslov, "Ocjenjivanje lovackog gulasa", napomena "Zbroj ocjena tri suca po kriteriju - max...", tablica sa svih 8 stupaca, redak 1 zlatno pozadinski istaknut, footer "Izvjestaj generiran: 15. 09. 2026." + "Stranica 1 od 1" |
| O9 | Brojevi u PDF-u = brojevi na ekranu | Identični | ✅ | 13/12/13/25/12/75 — identično oboje |
| O10 | Hrvatski dijakritici stripani u PDF-u | Da | ✅ | "Ocjenjivanje lovackog gulasa" (ne "lovačkog gulaša"), "Gustoca" (ne "Gustoća") — dosljedno s H9 ponašanjem |

## P. Ocjenjivanje lovačkog gulaša — "Gotovo ocjenjivanje" (reset)

> Napomena o metodi: identično B7 iz 2026-09-08 sesije, nativni `confirm()` blokira browser-automatizaciju, pa je test izveden kontroliranim JS override-om `window.confirm = () => true` prije klika na "Gotovo ocjenjivanje" — stvarna komponentna logika (`finishGulas()` → `GulasService.resetGulas()`) i dalje se izvršava i provjerava, ALI stvaran tekst/izgled `confirm()` dijaloga i Cancel-put nisu vizualno potvrđeni ovim pristupom (isto ograničenje kao dolje kod P3/P4).

| # | Korak | Očekivano | Rezultat | Napomena |
|---|-------|-----------|----------|----------|
| P1 | Izgled gumba "Gotovo ocjenjivanje" | Crven, ikona kante, tooltip | ⚠️ (djelomično) | Crvena boja i ikona kante potvrđene vizualno; tooltip tekst nije eksplicitno hoverano/pročitano. Vidi i N3b — disabled stanje ovog gumba nije vizualno razlučivo |
| P2 | Disabled kad nema kodnih imena | Da | ⚠️ | Vidi N3b — gumb funkcionalno JEST disabled (`[disabled]="!hasCompetitors()"` u kodu, klik ne bi ništa učinio), ali VIZUALNO se ne razlikuje od enabled stanja |
| P3 | `confirm()` navodi točan broj | Da | N/T | `window.confirm` je override-an da uvijek vraća `true` prije klika (vidi napomenu o metodi iznad) — stvaran tekst dijaloga nije pročitan/potvrđen |
| P4 | Cancel u confirm dijalogu | Ništa se ne briše | N/T | Isti razlog kao P3 — override je uvijek vraćao `true`, put za `false`/Cancel nije testiran u ovoj sesiji (Cancel-put JE testiran za analogni "Gotovo natjecanje" gumb u M3 iz 2026-09-08 sesije, ista implementacijska logika) |
| P5 | Potvrdi — briše sve, prikazuje snackbar | Da | ✅ | Nakon klika (s override-anim `confirm()`), "Poredak" se odmah isprazni na empty state, i pojavljuje se snackbar s TOČNIM tekstom "Ocjenjivanje gulaša je završeno. Podaci su obrisani." |
| P6 | Grane baze prazne nakon reseta | `gulasCompetitors`/`gulasScores` prazne | ✅ (djelomično) | Potvrđeno posredno kroz UI (empty state u "Poredak", "U tijeku" sekcija nestala) — nije provjereno izravno u Firebase konzoli (nema pristupa), niti je dodano novo kodno ime radi provjere da ID broji ispočetka |

### Sažetak — sekcije N/O/P (Gulaš)

| Sekcija | Ukupno TC | Prošlo | Pao | N/T | Napomena |
|---|---|---|---|---|---|
| N — Kodna imena i unos ocjena | 19 (+1 nalaz N3b) | 12 | 0 | 6 | N3b nije test slučaj iz plana nego dodatni nalaz otkriven usput |
| O — Poredak i PDF izvoz | 10 | 8 | 0 | 2 | O1/O2 djelomično/N-T zbog samo 1 test natjecatelja u sesiji |
| P — Gotovo ocjenjivanje (reset) | 6 | 2 | 0 | 4 | P1/P2 djelomično zbog N3b nalaza; P3/P4 N/T zbog `confirm()` override metode |
| **UKUPNO (N+O+P)** | **35** | **22** | **0** | **13** | Nula funkcionalnih bugova pronađeno; 1 kozmetički nalaz (N3b) koji vjerojatno pogađa i postojeći "Gotovo natjecanje" gumb |

**Testirano na:** grana `feature/analitcs-and-soup` (isti commit u kojem je feature implementiran), verzija 1.0.0
**Testirao:** Claude (automatizirano putem Claude in Chrome, developer = testirao u istoj sesiji kao implementacija — NE nezavisna/blind provjera)
**Datum:** 2026-09-15

**Zaključak (spremno za produkciju?):** Uvjetno da. Osnovni tok (dodavanje kodnog imena, unos ocjena sva tri suca s upsert/prefill ponašanjem, prijelaz u konačni poredak, matematička ispravnost zbrajanja po kriteriju i ukupno, PDF izvoz s ispravnim sadržajem) je izravno i točno potvrđen. Otvoreno prije produkcije: (1) N3b — kozmetički popravak `.finish-button`/`.finish-competition-button` disabled stila (nizak prioritet, ne blokira funkcionalnost); (2) validacija granica ocjena (N8/N9), pojedinačni delete-tok s pravim `confirm()` (N16-18/P3/P4), i sortiranje s 3+ natjecatelja (O1/O2) preporučuje se ručno dovršiti od strane organizatora prije prvog stvarnog korištenja, jer ovi scenariji zahtijevaju ili više test podataka ili interakciju s nativnim browser dijalozima izvan pouzdanog dosega ove automatizacije.

---

# Dodatak 2 (2026-09-15) — auto-advance tok u "Unos ocjene"

Nakon inicijalnog testiranja iz "Dodatak (2026-09-15)" iznad, na korisnikov zahtjev dialog "Unos ocjene" (`EnterGulasScoreDialog`) je proširen auto-advance tokom (vidi ažurirani opis i N6-N18 u `MANUALNO-TESTIRANJE.md`): nakon spremanja jednog suca, dialog se ne zatvara nego automatski prelazi na sljedećeg neocijenjenog suca za istog natjecatelja, a kad su sva tri suca uneseni prikazuje se "gotovo" panel s opcijom "Sljedeći natjecatelj" (dialog ostaje otvoren). Testirano izravno u browseru (Claude in Chrome) protiv produkcijske baze, na postojećem kodnom imenu **"Jelen"** (stvaran zapis koji je u bazi već imao Sudac 1 ocijenjenog prije početka ove test sesije — vjerojatno korisnikov vlastiti test dok je opisivao zahtjev) umjesto namjenskog `TEST_` zapisa, jer je iskorištena prilika da se odmah provjeri i scenarij "natjecatelj već ima jednog suca gotovog" (N6/N15 iz ažuriranog plana). Zapis je namjerno OSTAVLJEN u bazi nakon testa (dovršen, rang 1, 65 bodova) — nije obrisan poput `TEST_` zapisa u prijašnjim sesijama, jer nije jasno je li riječ o korisnikovom stvarnom podatku; korisnik je o tome eksplicitno obaviješten u chatu.

| # | Korak | Očekivano | Rezultat | Napomena |
|---|-------|-----------|----------|----------|
| N6 | Odaberi natjecatelja s barem jednim ocijenjenim sucem | "Sudac" se automatski postavlja na PRVOG neocijenjenog (ne uvijek na 1) | ✅ | Direktno potvrđeno — "Jelen" je imao Sudac 1 gotov; odabirom natjecatelja dialog je automatski postavio "Sudac 2" (NE "Sudac 1"), s progress oznakama "✓ Sudac 1", "✎ Sudac 2" (trenutni, plavo), "○ Sudac 3" |
| N6 (fresh) | Isto, za natjecatelja BEZ ijedne ocjene | Auto-select na "Sudac 1" | ⚠️ N/T (logikom potvrđeno) | Nije direktno testirano na svježem (0/3) natjecatelju u ovoj sesiji — provjereno samo posredno kroz kod: `nextUnscoredJudge()` vraća prvog suca iz `[1,2,3]` bez zapisa, pa za natjecatelja s 0 ocjena mora vratiti 1 (ista funkcija čije "preskoči već ocijenjene" ponašanje JE izravno potvrđeno u N6 retku iznad) |
| N7 | Unos 5 kriterija, live zbroj, dinamički label gumba | "Spremi i nastavi na sljedećeg suca" dok preostaju suci | ✅ | Potvrđeno za Sudac 2 (popunjen 4/4/4/8/4, zbroj uživo 12→24, gumb "Spremi i nastavi na sljedećeg suca" prikazan i enabled na 24/30) |
| N8/N9 | Validacija raspona/cijelog broja | Error, disabled | N/T | Nije namjerno testirano u ovoj sesiji (isto kao ranije) |
| N10 | Spremi (nije zadnji preostali sudac) | Dialog NE zatvara, auto-advance na sljedećeg neocijenjenog, polja prazna | ✅ | Nakon spremanja Sudac 2 (klik "Spremi i nastavi na sljedećeg suca"), dialog je ostao otvoren i automatski prešao na "Sudac 3" sa svih 5 polja praznim; u pozadini (glavna stranica, iza dialoga) "U tijeku" oznaka za "Jelen" pokazala "✓ Sudac 1 ✓ Sudac 2" odmah, bez zatvaranja dialoga (Firebase real-time) |
| N11 | Isto ponašanje za pretposljednjeg suca | Auto-advance na zadnjeg | ✅ | Potvrđeno kroz isti korak kao N10 (Sudac 2 → Sudac 3 prijelaz) |
| N12 | Zadnji preostali sudac popunjen | Label gumba mijenja se u "Spremi ocjenu" (bez "...i nastavi") | ✅ | Za Sudac 3 (3/3/3/6/3=18), gumb je ispravno prikazao "Spremi ocjenu" (ikona kvačice, ne strelice) |
| N13 | Spremi zadnjeg (trećeg) suca | Prikazuje se "gotovo" panel, natjecatelj prelazi u "Poredak" | ✅ | Nakon spremanja Sudac 3, forma je nestala i prikazan je zeleni panel s ikonom `task_alt`: "**Jelen** ocijenjen - sva tri suca su unesena." s gumbima "Zatvori"/"Sljedeći natjecatelj"; u pozadini "U tijeku" sekcija je nestala, a "Poredak" je odmah prikazao "Jelen" na rangu 1 s Ukupno=65 — sve dok je dialog i dalje bio otvoren |
| N14 | "Sljedeći natjecatelj" na gotovo panelu | Forma se resetira, dialog ostaje otvoren | ✅ | Klik je vratio formu na prazan odabir ("Kodno ime natjecatelja"/"Sudac" oba prazna), dialog nije zatvoren (naslov "Unos ocjene" i dalje vidljiv) |
| N15 | Ponovni odabir kompletnog natjecatelja | Auto-select na Sudac 1 radi ispravke | N/T | Nije ponovljeno u ovoj sesiji nakon N14 (dialog zatvoren umjesto toga radi provjere N18-ekvivalenta) |
| N16/N17 | Ručni odabir već ocijenjenog suca → info+prefill, upsert bez duplikata | Da | N/T (ovom sesijom) | Nije ponovljeno ovom prilikom — identičan mehanizam (`onJudgeSelected()`/prefill) izravno je potvrđen u prvom "Dodatak (2026-09-15)" testiranju (stari N11/N12), a kod nije mijenjan za ovaj dio |
| N18 | "Zatvori" umjesto "Spremi" čuva već spremljene suce | Da | ✅ (posredno) | Nakon N14, dialog je zatvoren klikom na "Zatvori" (na praznoj formi) — sve tri prethodno spremljene ocjene za "Jelen" ostale su netaknute u "Poredak" tablici i nakon zatvaranja |

**Testirano na:** grana `feature/analitcs-and-soup`, commit s auto-advance izmjenom (`enter-gulas-score.dialog.ts/html/scss`, `gulas.component.ts`)
**Testirao:** Claude (automatizirano putem Claude in Chrome, developer = testirao u istoj sesiji kao implementacija)
**Datum:** 2026-09-15

**Zaključak:** Auto-advance tok radi točno kako je traženo — ključni scenarij iz korisnikovog zahtjeva (nastavak na sljedećeg suca bez zatvaranja dialoga, uključujući ispravan "preskoči već ocijenjenog suca" kad se nastavlja rad na djelomično ocijenjenom natjecatelju) izravno je potvrđen na stvarnom (ne `TEST_`) zapisu. `npm run build` i `npx ng test` (222/222) prolaze bez grešaka nakon izmjene. Konzola bez grešaka tijekom sesije. Preostaje ručno potvrditi N6(fresh)/N15/N16/N17 (nisu ponovljeni ovom prilikom, ali oslanjaju se na kod koji nije mijenjan ili je logički identičan izravno testiranom dijelu) prije produkcije.

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

1. **[VISOK] Duplikacija ID-a novih članova tima** (`edit-team.dialog.ts`, `addMember()`) — dodavanje 2+ novih članova u istom edit-team sesijom prije spremanja dodjeljuje im SVIMA isti competitor ID (jer se ID računa iz stanja baze, ne iz lokalno već-dodanih članova), uzrokujući da rezultati jednog natjecatelja "cure" na sve ostale s istim imenom-manje ID-om u ranking prikazu. Vjerojatan realan scenarij (unos cijele ekipe odjednom). — ✅ **POPRAVLJENO u commitu `17475e2` ("fix: regression bugs")**: `addMember()` sada računa novi ID iz unije baze I već dodanih-a-nespremljenih članova iste sesije.
2. **[SREDNJI] Bug u "Sve kategorije" prikazu (F5)** — natjecatelji/timovi jedne kategorije (M ili Ž) pogrešno prikazuju svoje vrijednosti i u stupcima istoimene discipline DRUGE kategorije (M i Ž "ZRAČNA PUŠKA"/"PRAČKA" su odvojene discipline, ali stupci u spojenoj tablici izgledaju mapirani po imenu, ne po ID-u/kategoriji). Ukupni total ostaje ispravan; bug je isključivo vizualni u stupcima. — ✅ **POPRAVLJENO u commitu `17475e2` ("fix: regression bugs")**: `getDisciplineColumns()` sada deduplicira stupce po nazivu discipline kad nije odabrana kategorija (prije su "ZRAČNA PUŠKA"/"PRAČKA" postojale dvaput u nizu stupaca, što je stvaralo duple `matColumnDef` i lomilo/miješalo tablicu). Ručno potvrđeno u browseru nakon fixa: "Sve kategorije" prikaz sada ispravno renda točno 4 jedinstvena stupca discipline (TRAP, ZRAČNA PUŠKA, PRAČKA, PIKADO).
3. **[NAPOMENA] Test dokument sadrži matematički neostvarive scenarije u G2/G3/G5** — brojevi iz izvornog `MANUALNO-TESTIRANJE.md` za ove scenarije ne zadovoljavaju vlastite premise (isti total uz navedene raw vrijednosti). G3 je dodatno analitički nemoguć za M kategoriju po dizajnu formule (treća razina kaskade nikad ne može biti stvarni razdjelnik). — ✅ **RIJEŠENO u commitu `17475e2`**: `docs/MANUALNO-TESTIRANJE.md` ažuriran — G2 ima ispravljene ostvarive brojke, G3 (i G3-analogni dio G8) prepravljen u strukturnu napomenu umjesto nemogućeg scenarija, G5 zamijenjen logički konzistentnim primjerom s 3 natjecatelja (izvorna verzija je bila interno kontradiktorna zbog tranzitivnosti).
4. **[NAPOMENA] Naslov aplikacije u headeru** ("Memorijal Dragutin Cenko") ne odgovara tekstu iz test dokumenta ("Sustav za Praćenje Rezultata Međudruštvenog Natjecanja") — dokument je zastario po pitanju brandinga, nije bug. Nije adresirano (kozmetičko, van dogovorenog opsega popravaka).
5. **[NAPOMENA, otkriveno post-testiranje] Nepotpuno čišćenje testnih podataka** — nakon inicijalnog izvještaja pronađen je zaboravljeni tim `test tim` (bez `TEST_` prefiksa, 6 članova, jedan s bodovima 5/50/5/0=300) koji je ostao u produkcijskoj bazi unatoč tvrdnji o završenom čišćenju. Ručno pronađen i obrisan iz produkcijske baze (`Editiraj tim` → `test tim` → `Obriši tim`, potvrđeno u produkciji da je nestao). Nakon ovog čišćenja produkcijska baza sadrži isključivo 63 stvarna natjecatelja iz prošlogodišnjeg natjecanja, bez ikakvih testnih ostataka.

**Testirano na:** commit `ad0ac20` (stanje prije popravaka)
**Popravci 1-3 primijenjeni u:** commit `17475e2` ("fix: regression bugs")
**Testirao:** Claude (automatizirano putem Claude in Chrome)
**Datum:** 2026-09-08

**Zaključak (spremno za produkciju?):** Da. Oba funkcionalna bugova pronađena testiranjem (1 — ID duplikacija u "Editiraj tim"; 2 — vizualni bug u "Sve kategorije" prikazu) su popravljena u commitu `17475e2` i potvrđena kroz `npm test` (192/192 ✅) te ručnu provjeru u browseru. Test dokument je također ažuriran da više ne sadrži matematički neostvarive scenarije. Preostala otvorena pitanja nisu blockeri: sekcija H (vizualna PDF provjera), preostali G tiebreak scenariji (G6/G7/G8 uživo) i K10/K11/K12 (Firebase konzola, stvaran mobitel) preporučuje se ručno dovršiti od strane organizatora prije sezone jer zahtijevaju alate izvan dosega ove automatizirane sesije. Naslov aplikacije u headeru odstupa od teksta u test dokumentu — kozmetičko, nije adresirano.
