# Regresijski plan manualnog testiranja

Ovaj dokument je popis test slučajeva (TC) za manualnu provjeru cijele aplikacije prije puštanja u produkciju. Cilj je proći **svaku funkcionalnost i svaku kombinaciju** koja se realno može dogoditi na natjecanju, uključujući nedavni refaktoring formule bodovanja (dinamički `maxPoints`) i novi kaskadni tiebreak.

Svaki TC ima: korake, očekivani rezultat i prazan stupac za rezultat (✅/❌) i napomenu. Kopiraj tablice i popuni ih tijekom testiranja.

> ⚠️ **VAŽNO — baza je PRODUKCIJSKA.** Dev (`npm start`) i produkcija koriste **isti** Firebase projekt (`hunting-games-fe57e`). Pravila baze (`database.rules.json`) su: `.read: true` (svatko može čitati, bez prijave — omogućuje javnu `/pracenje` stranicu iz sekcije K), `.write: "auth != null"` (samo prijavljeni admin može mijenjati podatke). Svaki tim/rezultat koji dodaš tijekom testiranja odmah je vidljiv svima (uključivo eventualne druge korisnike koji trenutno gledaju aplikaciju, i sve neprijavljene posjetitelje `/pracenje` stranice).
>
> **Prije testiranja:**
> 1. Sve testne timove nazivaj s prefiksom **`TEST_`** (npr. `TEST_Ekipa1`) da ih lako pronađeš i obrišeš nakon testiranja.
> 2. Nakon završenog regresijskog ciklusa, **obriši sve `TEST_*` timove** (Editiraj tim → odaberi → Obriši tim) — brisanje tima automatski briše i njegove rezultate (cascade).
> 3. Ne mijenjaj/ne briši postojeće (prave) timove i rezultate iz prošlogodišnjeg natjecanja osim ako test to eksplicitno traži i planiraš vratiti stanje.
> 4. Ako je moguće, testiraj u periodu kad nitko drugi ne gleda live rezultate (trenutno je izvan sezone, što je dobar trenutak).

---

## 0. Priprema okoline

| # | Korak | Očekivano | Rezultat |
|---|-------|-----------|----------|
| 0.1 | Pokreni `npm install` pa `npm start` | Dev server se pokreće na `http://localhost:4200` bez grešaka u terminalu | ☐ |
| 0.2 | Otvori `http://localhost:4200` u browseru | Prikazuje se header "Sustav za Praćenje Rezultata Međudruštvenog Natjecanja" i tablica pojedinačnog poretka | ☐ |
| 0.3 | Otvori Console (DevTools) | Nema crvenih grešaka pri učitavanju | ☐ |
| 0.4 | Provjeri Firebase Realtime Database konzolu → grana `disciplines` | Postoji 6 zapisa: TRAP (M), ZRAČNA PUŠKA (M), PRAČKA (M), ZRAČNA PUŠKA (Ž), PRAČKA (Ž), PIKADO (Ž) — svaki sa poljem `maxPoints` (redom: 5, 50, 5, 50, 5, 300). Nema UI-a za upravljanje disciplinama — ovo se provjerava direktno u bazi. | ☐ |
| 0.5 | (Opcionalno) `npm run build` | Build prolazi bez grešaka (samo postojeći CommonJS warninzi su OK) | ☐ |
| 0.6 | `npx ng test --watch=false --browsers=ChromeHeadless` | Svi testovi prolaze (178/178 u trenutku pisanja ovog dokumenta) | ☐ |

Formula podsjetnik (izračunava se dinamički iz `maxPoints`, koeficijent = `100 / maxPoints`):

| Kategorija | Disciplina | maxPoints | Koeficijent | Max doprinos |
|---|---|---|---|---|
| M | TRAP | 5 | ×20 | 100 |
| M | ZRAČNA PUŠKA | 50 | ×2 | 100 |
| M | PRAČKA | 5 | ×20 | 100 |
| Ž | ZRAČNA PUŠKA | 50 | ×2 | 100 |
| Ž | PRAČKA | 5 | ×20 | 100 |
| Ž | PIKADO | 300 | ×0,33... | 100 |

Max ukupno po natjecatelju/timu (po disciplini): **300 bodova** (3 discipline × 100).

---

## A. Upravljanje timovima — "Dodaj tim"

| # | Korak | Očekivano | Rezultat |
|---|-------|-----------|----------|
| A1 | Klikni "Dodaj tim". Upiši naziv `TEST_EkipaM1`, kategoriju "Muškarci", 1. člana Ime/Prezime, klikni "Dodaj tim" | Dialog se zatvara, novi tim se pojavljuje u poretku (0 bodova) odmah (bez refresha) | ☐ |
| A2 | Otvori "Dodaj tim" i ostavi naziv prazan | Gumb "Dodaj tim" je disabled | ☐ |
| A3 | Otvori "Dodaj tim", upiši naziv, ne biraj kategoriju | Gumb "Dodaj tim" je disabled | ☐ |
| A4 | Otvori "Dodaj tim", upiši naziv i kategoriju, ostavi 1. člana bez imena ili prezimena | Gumb "Dodaj tim" je disabled | ☐ |
| A5 | Klikni "Dodaj člana" dvaput (ukupno 3 člana), popuni sva 3 | Gumb "Dodaj člana" postaje disabled na 3 člana (max 3 po timu) | ☐ |
| A6 | Pokušaj ukloniti (koš za smeće) prvog člana (index 0) | Gumb za brisanje prvog člana je disabled — ne može se ukloniti obavezni prvi član | ☐ |
| A7 | Dodaj 2. člana, ostavi mu prazno ime i prezime (ne popunjavaj), klikni "Dodaj tim" | Dozvoljeno — prazan opcionalan član se filtrira i NE sprema (samo popunjeni članovi idu u tim) | ☐ |
| A8 | Dodaj 2. člana s upisanim imenom ali praznim prezimenom | Gumb "Dodaj tim" je disabled (nepotpun član nije niti prazan niti kompletan) | ☐ |
| A9 | Klikni "Odustani" nakon popunjavanja forme | Dialog se zatvara, tim se NE sprema | ☐ |
| A10 | Kreiraj `TEST_EkipaŽ1` kategorije "Žene" s 3 člana | Tim se pojavljuje pod filterom "Žene", ne pod "Muškarci" | ☐ |

## B. Upravljanje timovima — "Editiraj tim"

| # | Korak | Očekivano | Rezultat |
|---|-------|-----------|----------|
| B1 | Klikni "Editiraj tim", odaberi `TEST_EkipaM1` iz padajućeg izbornika | Forma se popuni s trenutnim nazivom/kategorijom/članovima | ☐ |
| B2 | Promijeni naziv u `TEST_EkipaM1_izmjena`, klikni "Spremi promjene" | Naziv u poretku se odmah ažurira | ☐ |
| B3 | Otvori "Editiraj tim", NE biraj tim | Gumb "Spremi promjene" i "Obriši tim" su disabled | ☐ |
| B4 | Odaberi tim, obriši ime jednom članu (ostavi prezime) | Gumb "Spremi promjene" je disabled | ☐ |
| B5 | Odaberi tim, klikni "Dodaj člana" 4-5 puta | ⚠️ Provjeri: edit dialog **nema** ograničenje na 3 člana (za razliku od "Dodaj tim" dialoga) — trenutno je moguće dodati 4.+ člana editiranjem. Zabilježi je li ovo poznato/prihvatljivo ponašanje ili nešto što treba ispraviti prije produkcije. | ☐ |
| B6 | Ukloni sve članove tima i pokušaj spremiti | `canSave()` prolazi (nema provjere min. 1 člana u edit dialogu) — provjeri je li tim s 0 članova prihvatljiv (u ekipnom poretku bi imao 0 bodova u svemu) | ☐ |
| B7 | Odaberi tim, klikni "Obriši tim" | Prikazuje se browser `confirm()` dijalog "Jeste li sigurni..." | ☐ |
| B8 | U confirm dijalogu klikni "Cancel/Odustani" | Tim NIJE obrisan | ☐ |
| B9 | Ponovi B7 i potvrdi (OK) | Tim se briše iz poretka ODMAH; svi rezultati svih članova tog tima nestaju iz baze (provjeri "Editiraj rezultat" popis — više ih nema) | ☐ |
| B10 | Klikni "Odustani" nakon odabira tima i izmjene podataka | Promjene se ne spremaju | ☐ |

## C. Unos rezultata — "Unos rezultata"

Za sve TC-ove koristi timove iz sekcije A (`TEST_EkipaM1`, `TEST_EkipaŽ1`).

| # | Korak | Očekivano | Rezultat |
|---|-------|-----------|----------|
| C1 | Otvori "Unos rezultata", upiši dio imena natjecatelja u pretragu | Autocomplete filtrira po imenu/prezimenu/timu (case-insensitive) | ☐ |
| C2 | Upiši naziv tima u pretragu | Autocomplete filtrira sve članove tog tima | ☐ |
| C3 | Klikni chip s nazivom tima ("Brza pretraga po timu") | Pretraga se automatski postavlja na taj tim, prikazuju se samo njegovi članovi | ☐ |
| C4 | Klikni "Očisti" nakon C3 | Filter po timu se uklanja, prikazuju se svi natjecatelji | ☐ |
| C5 | Odaberi natjecatelja iz `TEST_EkipaM1` (M) | Padajući izbornik "Disciplina" se otključava i prikazuje samo M discipline: TRAP, ZRAČNA PUŠKA, PRAČKA | ☐ |
| C6 | Odaberi natjecatelja iz `TEST_EkipaŽ1` (Ž) | Disciplina prikazuje samo: ZRAČNA PUŠKA, PRAČKA, PIKADO | ☐ |
| C7 | Odaberi disciplinu TRAP, upiši bodove `5` | Hint "Maksimalno bodova: 5 (TRAP)" prikazan, nema greške, gumb "Spremi rezultat" enabled | ☐ |
| C8 | Odaberi TRAP, upiši `6` (> maxPoints) | Prikazuje se `mat-error`: "Maksimalan broj bodova za ovu disciplinu je 5"; gumb "Spremi rezultat" je disabled | ☐ |
| C9 | Odaberi TRAP, upiši `-1` | Error "Bodovi ne mogu biti negativni"; gumb disabled | ☐ |
| C10 | Odaberi ZRAČNA PUŠKA, upiši `50` | Prihvaćeno (na granici maxPoints), nema greške | ☐ |
| C11 | Odaberi PIKADO (za natjecateljicu), upiši `300` | Prihvaćeno (max), doprinosi točno 100,00 bodova ukupno (provjeri u tablici poretka) | ☐ |
| C12 | Spremi rezultat za natjecatelja/disciplinu koja VEĆ ima rezultat, s drugom vrijednosti bodova | Ne stvara duplikat — postojeći rezultat se ažurira (provjeri u "Editiraj rezultat" da postoji samo 1 zapis za tu kombinaciju) | ☐ |
| C13 | Klikni "Odustani" | Dialog se zatvara, ništa se ne sprema | ☐ |
| C14 | Promijeni odabranog natjecatelja NAKON što je disciplina već odabrana | `disciplineId` se resetira na `null` (mora se ponovno odabrati disciplina) | ☐ |
| C15 | Upiši bodove za natjecatelja BEZ odabrane discipline | Gumb "Spremi rezultat" ostaje disabled dok disciplina nije odabrana | ☐ |

## D. Uređivanje rezultata — "Editiraj rezultat"

| # | Korak | Očekivano | Rezultat |
|---|-------|-----------|----------|
| D1 | Otvori "Editiraj rezultat", pogledaj padajući popis | Svaki zapis prikazuje: Ime Prezime - Disciplina (X bodova) - Tim, sortirano alfabetski po imenu natjecatelja | ☐ |
| D2 | Odaberi postojeći rezultat | Polje "Broj bodova" se popuni trenutnom vrijednošću; prikazuje se info box s disciplinom/kategorijom/timom/trenutnim rezultatom | ☐ |
| D3 | Promijeni bodove na vrijednost > `discipline.maxPoints` | Prikazuje se crveni `.points-error` blok s porukom; gumb "Spremi promjene" je disabled (ovo je bio prijašnji bug — ranije NIJE bilo validacije u ovom dialogu, provjeri da je fix i dalje na mjestu) | ☐ |
| D4 | Promijeni bodove na negativnu vrijednost | Error "Bodovi ne mogu biti negativni"; gumb disabled | ☐ |
| D5 | Upiši decimalnu vrijednost (npr. `2.5` za ZRAČNU PUŠKU, `step=0.1`) | Prihvaćeno, sprema se decimalna vrijednost, total points je ispravno preračunat s decimalom | ☐ |
| D6 | Promijeni bodove na validnu vrijednost, klikni "Spremi promjene" | Poredak se odmah ažurira s novim total points | ☐ |
| D7 | Klikni "Odustani" nakon izmjene | Promjena se ne sprema | ☐ |
| D8 | Ne biraj rezultat, provjeri gumb | "Spremi promjene" je disabled dok nije odabran rezultat | ☐ |
| D9 | Napomena: u aplikaciji **ne postoji gumb za brisanje pojedinačnog rezultata** (`deleteResult` postoji samo u servisu, nije ožičen na UI). Ako treba obrisati jedan rezultat, jedini način kroz UI je postaviti ga na `0` kroz "Editiraj rezultat". Zabilježi ako ovo treba adresirati prije produkcije. | — | ☐ |

## E. Formula bodovanja — izračun

| # | Korak | Očekivano | Rezultat |
|---|-------|-----------|----------|
| E1 | Natjecatelju (M) unesi TRAP=5, PRAČKA=5, ZRAČNA PUŠKA=50 | Total = 5×20 + 5×20 + 50×2 = **300,00** (maksimum) | ☐ |
| E2 | Natjecatelju (M) unesi TRAP=3, PRAČKA=0, ZRAČNA PUŠKA=25 | Total = 3×20 + 0×20 + 25×2 = **110,00** | ☐ |
| E3 | Natjecateljici (Ž) unesi PIKADO=150, PRAČKA=3, ZRAČNA PUŠKA=30 | Total = 150×(100/300) + 3×20 + 30×2 = 50 + 60 + 60 = **170,00** | ☐ |
| E4 | Natjecatelj bez ičega unesenog | Prikazuje se u tablici s 0 u svim disciplinama i total = 0,00 (ne izbacuje se iz prikaza) | ☐ |
| E5 | Provjeri prikaz decimalnog broja u tablici | Zarez kao decimalni separator (hrvatski format), npr. "170,00" ne "170.00" (vidi `formatPoints()`) | ☐ |
| E6 | Ekipni poredak: tim od 2 člana, oba imaju TRAP=5 | Ekipni TRAP zbroj = 10 (RAW zbroj, prije formule), pa formula: 10×20=200 za tu disciplinu — provjeri da ekipni izračun ZBRAJA raw bodove članova PRIJE primjene koeficijenta, ne zbraja već-preračunate total points pojedinaca | ☐ |
| E7 | Ekipni poredak: tim s 1 članom | Formula radi identično, ekipni total = pojedinačni total tog jedinog člana | ☐ |
| E8 | Promijeni `maxPoints` direktno u Firebase bazi za jednu disciplinu (npr. TRAP 5→10) i refreshaj | Total svih M natjecatelja s TRAP rezultatom > 0 se ODMAH preračuna s novim koeficijentom (100/10=10) bez potrebe za redeployem koda — potvrđuje da formula NIJE hardkodirana. **Vrati vrijednost na 5 nakon testa!** | ☐ |

## F. Poredak i prikaz (Overview)

| # | Korak | Očekivano | Rezultat |
|---|-------|-----------|----------|
| F1 | Promijeni "Prikaz" na "Ekipni poredak" | Tablica se mijenja na ekipni poredak (stupci: Rang, Naziv Ekipe, discipline, Ukupno) | ☐ |
| F2 | Vrati na "Pojedinačni poredak" | Tablica se vraća, sortiranje se čuva | ☐ |
| F3 | Filter "Kategorija" → "Muškarci" | Prikazuju se samo M natjecatelji/timovi; stupci disciplina = samo M discipline (TRAP, ZRAČNA PUŠKA, PRAČKA); iznad tablice prikazan badge "Muškarci" i formula info panel | ☐ |
| F4 | Filter "Kategorija" → "Žene" | Isto za Ž (ZRAČNA PUŠKA, PRAČKA, PIKADO) | ☐ |
| F5 | Filter "Kategorija" → "Sve kategorije" | Prikazuju se SVI natjecatelji/timovi obje kategorije zajedno, stupci disciplina = svih 6 (union M i Ž disciplina) — provjeri da se natjecatelji ispravno prikazuju bez grešaka za discipline koje njihova kategorija nema (prazna/0 ćelija) | ☐ |
| F6 | U "Sve kategorije" prikazu, provjeri redoslijed | Sortirano isključivo po total points, bez obzira na kategoriju — M i Ž natjecatelji su izmiješani u istoj tablici po bodovima | ☐ |
| F7 | Provjeri redak #1 (najviši total) | Ima klasu za rank 1 (zlatna boja/ikona), red ima "row-winner" stil | ☐ |
| F8 | Provjeri redove #2 i #3 | Srebrna i bronzana boja, "row-podium" stil | ☐ |
| F9 | Provjeri redak s bodovima u disciplini ≥50 vs 25-49 vs <25 | Različite CSS klase (`score-high`/`score-medium`/`score-low`) — vizualno provjeri boje | ☐ |
| F10 | Ukloni sve timove jedne kategorije (ili filtriraj na kategoriju bez podataka) | Prikazuje se empty state "Nema dostupnih rezultata/timova za prikaz" s ikonom | ☐ |
| F11 | Dugmad "Izvoz u PDF" / "Kompletan izvještaj" kad `hasData()` === false | Dugmad su disabled | ☐ |

## G. Izjednačeni rezultati — kaskadni tiebreak (najkritičniji dio)

Kreiraj namjenske `TEST_` natjecatelje/timove za svaki scenarij. Kaskada: **M: TRAP → PRAČKA → ZRAČNA PUŠKA**, **Ž: PRAČKA → ZRAČNA PUŠKA → PIKADO**.

> ⚠️ **Strukturna napomena (otkriveno tijekom automatiziranog testiranja 2026-09-08):** i M i Ž kategorija imaju točno 3 discipline koje linearno pridonose totalu (`total = disc1×k1 + disc2×k2 + disc3×k3`). Posljedica: ako su prve DVIJE discipline u kaskadi identične između dva natjecatelja s istim totalom, TREĆA disciplina je matematički PRISILJENA biti identična i ona (nema četvrte komponente koja bi mogla kompenzirati razliku). Zato treća razina kaskade nikad ne može biti stvarni razdjelnik — ako se dođe do usporedbe na toj razini, ishod je uvijek "identično" (pa scenarij prelazi u G4, ne u "riješeno na 3. razini"). Testni primjeri ispod su usklađeni s ovim ograničenjem.

| # | Scenarij (M primjer, isto ponovi za Ž s odgovarajućim redoslijedom u G8) | Očekivano | Rezultat |
|---|---|---|---|
| G1 | A: TRAP=5,PRAČKA=0,ZRAČNA=0 (total 100). B: TRAP=0,PRAČKA=5,ZRAČNA=0 (total 100). Isti total, RAZLIČIT TRAP. | A ispred B (viši TRAP). Oba imaju ikonu ⚖️ kod ranga; tooltip: "...Poredak riješen prema navedenim disciplinama." s napomenom "TRAP 5:0" | ☐ |
| G2 | A: TRAP=5,PRAČKA=0,ZRAČNA=50 (total 200). B: TRAP=5,PRAČKA=5,ZRAČNA=0 (total 200). Isti total, isti TRAP, RAZLIČITA PRAČKA. | A i B se razdvajaju na 2. razini kaskade (PRAČKA) — B ispred (viša PRAČKA). Tooltip navodi "PRAČKA 0:5" (ne TRAP, jer je TRAP identičan) | ☐ |
| G3 | **Strukturno neostvarivo, vidi napomenu iznad** — ne postoji kombinacija bodova gdje su TRAP i PRAČKA identični, total identičan, a ZRAČNA PUŠKA različita (total ih matematički prisiljava biti jednaki). Umjesto pokušaja da se ovo postavi, PROVJERI da se identičan TRAP + identična PRAČKA (npr. oba A i B: TRAP=5,PRAČKA=5) uvijek završi s identičnom ZRAČNOM PUŠKOM ako je total isti, i da aplikacija u tom slučaju ispravno prijavi "proizvoljan poredak" (G4), a NE lažno "riješeno na ZRAČNOJ PUŠKI". | Aplikacija NIKAD ne prikazuje "riješeno prema ZRAČNA PUŠKA" kad su TRAP i PRAČKA već identični — takav slučaj uvijek pada u G4 ponašanje | ☐ |
| G4 | A i B: TRAP=5,PRAČKA=5,ZRAČNA=10 — identično u SVE tri discipline, isti total. | Tooltip: "...Poredak unutar ove skupine je proizvoljan." — NEMA lažnog "riješeno" objašnjenja | ☐ |
| G5 | Tri natjecatelja s istim totalom (200): A: TRAP=5,PRAČKA=3,ZRAČNA=20 (100+60+40=200). B: TRAP=3,PRAČKA=4,ZRAČNA=30 (60+80+60=200). C: TRAP=5,PRAČKA=5,ZRAČNA=0 (100+100+0=200). A-B se razdvajaju na TRAP-u (5:3), A-C se razdvajaju na PRAČKA-i (3:5, jer im je TRAP jednak 5:5), B-C se razdvajaju na TRAP-u (3:5). | Tooltip za SVAKOG od njih navodi **različito objašnjenje po paru** ovisno o tome koja ih disciplina razdvaja (A-ov tooltip spominje TRAP za par s B i PRAČKA za par s C). Pažljivo provjeri da se tekst računa po paru, ne globalno za cijelu grupu | ☐ |
| G6 | Isto kao G1-G5 (koristi ispravljene brojke), ali u EKIPNOM poretku (timovi umjesto pojedinaca) | Identično ponašanje — kaskada i tieNote rade i na `TeamRanking` | ☐ |
| G7 | Postavi da natjecatelj (M) i natjecateljica (Ž) imaju identičan total (npr. oboje 150,00) dok je filter "Sve kategorije" | ⚠️ Rubni slučaj: trenutna implementacija grupira redove PO TOTAL POINTS bez obzira na kategoriju. Provjeri stvarno ponašanje — hoće li se M i Ž natjecatelj prikazati kao "izjednačeni" i pokušati usporediti kroz M kaskadu (TRAP), unatoč tome što Ž natjecateljica nema TRAP rezultat (tretira se kao 0). Zabilježi je li rezultirajući tooltip smislen ili zbunjujuć — ovo je poznato ograničenje, ne nužno blocker, ali treba biti svjestan prije produkcije. | ☐ |
| G8 | Ponovi G1, G2, G4, G5 (ispravljene inačice) za ŽENSKU kategoriju s redoslijedom PRAČKA→ZRAČNA PUŠKA→PIKADO (npr. izjednačen total uz različitu PRAČKU odmah razdvaja na 1. razini; identična PRAČKA + različita ZRAČNA PUŠKA razdvaja na 2. razini; identično u sve 3 → proizvoljno). **Ne pokušavaj G3-analogni scenarij** ("identična PRAČKA+ZRAČNA razdvaja PIKADO") — isto strukturno ograničenje iz napomene iznad vrijedi i za Ž kategoriju (i ona ima točno 3 discipline u formuli), pa treća razina (PIKADO) nikad ne može biti stvaran razdjelnik. | Ista logika, ispravan redoslijed disciplina u tooltipovima | ☐ |
| G9 | Najbolji test na STVARNIM produkcijskim podacima (bez izmjena): otvori "Sve kategorije" → "Pojedinačni poredak" i potraži postojeće izjednačene rezultate iz prošlog natjecanja | Provjeri barem 1 stvaran primjer da tooltip ima smisla (npr. poznati parovi Antun Mustac/Ljubo Poljak, Filip Sulj/Vinko Pongrac ako podaci nisu mijenjani) | ☐ |
| G10 | Hover/tap na ⚖️ ikonu na mobitelu (touch uređaj) | Tooltip se prikazuje i na touch ekranima (tap), ne samo na hover mišem — provjeri na stvarnom telefonu jer je app rađen "mobile friendly" | ☐ |

## H. PDF izvoz

| # | Korak | Očekivano | Rezultat |
|---|-------|-----------|----------|
| H1 | Pojedinačni poredak, kategorija "Muškarci", klikni ikonu za download pored naslova | Otvara se PDF u novom tabu, naziv fajla `pojedinacni-poredak-m-[datum].pdf` (ili slično), plava tema, top 3 pozlaćeni/posrebreni/obronzani redovi | ☐ |
| H2 | Ekipni poredak, klikni download ikonu | PDF `ekipni-poredak-...pdf`, zelena tema, na kraju popis sastava svih ekipa | ☐ |
| H3 | Kontrolna traka → "Izvoz u PDF" u pojedinačnom prikazu | Isti rezultat kao H1 (poziva `exportCurrentViewToPdf` koji delegira prema trenutnom `viewMode`) | ☐ |
| H4 | Kontrolna traka → "Izvoz u PDF" u ekipnom prikazu | Isti rezultat kao H2 | ☐ |
| H5 | "Kompletan izvještaj" | Jedan PDF s oba poretka (sažeto, top 10), na kraju posebna stranica s napomenama o izjednačenim rezultatima za OBA poretka (ako postoje) | ☐ |
| H6 | Izvezi PDF u situaciji BEZ izjednačenih rezultata (npr. filtriraj na kategoriju/podskup gdje su svi totali jedinstveni) | Stranica "Napomene o izjednačenim rezultatima" se NE dodaje (nema prazne/nepotrebne stranice na kraju) | ☐ |
| H7 | Izvezi PDF u situaciji SA izjednačenim rezultatima (koristi setup iz sekcije G) | Na kraju dokumenta dodana nova stranica s naslovom "Napomene o izjednačenim rezultatima" koja nabraja SVAKI zahvaćen red s istim tekstom kao tooltip na ekranu | ☐ |
| H8 | Usporedi tekst napomene na ekranu (tooltip) i u PDF-u za isti par natjecatelja | Tekst mora biti IDENTIČAN (izvor je ista `tieNote` vrijednost) | ☐ |
| H9 | Provjeri hrvatske dijakritike (č, ć, š, ž, đ) u PDF-u (imena, nazivi disciplina) | Tekst je čitljiv — `normalizeText()` strip-a dijakritike radi kompatibilnosti fonta (npr. "Pračka" → "Pracka"), ovo je poznato/namjerno ponašanje, ne bug | ☐ |
| H10 | Otvori PDF na 30+ redova (puno natjecatelja) | Automatsko prelamanje na novu stranicu (autoTable), header/footer se ponavlja na svakoj stranici s brojem stranice i datumom | ☐ |
| H11 | Provjeri da su dugmad za pojedinačni/ekipni brzi export disabled kad je odgovarajuća tablica prazna (`competitorRows.length===0` / `teamRows.length===0`) | Da | ☐ |

## I. Real-time sinkronizacija i konkurentnost

| # | Korak | Očekivano | Rezultat |
|---|-------|-----------|----------|
| I1 | Otvori aplikaciju u 2 taba (ili 2 različita browsera) | Oba prikazuju isto stanje | ☐ |
| I2 | U tabu 1 dodaj rezultat, ne radi ništa u tabu 2 | Tab 2 se automatski ažurira BEZ manualnog refresha (Firebase `onValue` real-time) u par sekundi | ☐ |
| I3 | U tabu 1 obriši tim, gledaj tab 2 | Tim i njegovi rezultati nestaju iz tab 2 prikaza automatski | ☐ |
| I4 | ⚠️ Simuliraj konkurentnu izmjenu: u tabu 1 otvori "Unos rezultata" i NE spremaj još; u tabu 2 dodaj rezultat za DRUGOG natjecatelja i spremi; zatim u tabu 1 spremi svoj rezultat | Provjeri je li rezultat iz tab 2 sačuvan nakon što tab 1 spremi svoje — servis piše **cijelu** `results` kolekciju (`set()`), pa ako tab 1 ima zastarjelu lokalnu kopiju state-a u trenutku spremanja, teoretski može prepisati/izgubiti izmjenu iz tab 2. Ovo je poznati arhitekturalni rizik (nema per-record write) — zabilježi stvarno ponašanje, posebno važno tijekom natjecanja kad više ljudi može istovremeno unositi rezultate. | ☐ |

## J. Regresija specifična za refaktoring (max-points / formula)

| # | Korak | Očekivano | Rezultat |
|---|-------|-----------|----------|
| J1 | Provjeri natjecatelja s PIKADO=300 (max) | Total doprinos discipline = točno **100,00**, NE 99,xx (stari hardkodirani koeficijent ×0,33 je bio approx; novi je exact `100/300`) | ☐ |
| J2 | Provjeri natjecatelja s TRAP=5 (max) | Doprinos = točno 100,00 | ☐ |
| J3 | U "Unos rezultata" i "Editiraj rezultat" provjeri da je max limit povučen iz `discipline.maxPoints` (baza), a NE hardkodiran u kodu | Promjena `maxPoints` u bazi (vidi E8) odmah mijenja i validacijski limit u oba dialoga | ☐ |
| J4 | Provjeri formula-info panel u overview (plavi info blok iznad tablice kad je kategorija odabrana) | Tekst "TRAP × 20 + ZRAČNA PUŠKA × 2 + PRAČKA × 20" (M) / "ZRAČNA PUŠKA × 2 + PRAČKA × 20 + PIKADO × 0,33" (Ž) odgovara STVARNOM izračunu (ovaj tekst je statičan u HTML-u — ako se ikad promijene maxPoints vrijednosti u bazi na nešto drugo, ovaj opis treba ručno ažurirati, on se NE generira dinamički) | ☐ |

## K. Javna stranica za praćenje uživo — `/pracenje` (bez prijave)

Ruta `/pracenje` ponovno koristi isti `OverviewComponent` kao admin sučelje (`/`), ali bez `authGuard`-a i s ulazom `readOnly=true` (proslijeđeno kroz `data: { readOnly: true }` u routingu). Namijenjena je natjecateljima da uživo prate rezultate bez prijave, uz sve akcije za izmjenu podataka uklonjene iz sučelja. Stvarna zaštita od izmjena dolazi iz Firebase pravila (`.write: "auth != null"`), NE iz skrivanja gumba — sekcija K to eksplicitno provjerava.

| # | Korak | Očekivano | Rezultat |
|---|-------|-----------|----------|
| K1 | Otvori `http://localhost:4200/pracenje` (ili produkcijski URL) u privatnom/incognito prozoru (garantirano bez prijave) | Stranica se učitava BEZ preusmjeravanja na `/login`; prikazuje se poredak sa stvarnim, trenutnim podacima (real-time), bez odgode/greške | ☐ |
| K2 | Provjeri header na `/pracenje` u neprijavljenom stanju | NEMA prikaza e-mail adrese niti gumba za odjavu (isti header kao i inače kad `authService.currentUser` nije postavljen) | ☐ |
| K3 | Provjeri kontrolnu traku na `/pracenje` | NEMA gumba "Dodaj tim", "Editiraj tim", "Unos rezultata", "Editiraj rezultat" — vidljivi su samo filteri "Prikaz" i "Kategorija" | ☐ |
| K4 | Provjeri kontrolnu traku na `/pracenje` | NEMA gumba "Izvoz u PDF" ni "Kompletan izvještaj" | ☐ |
| K5 | Provjeri naslove tablica ("Pojedinačni Poredak" / "Ekipni Poredak") na `/pracenje` | NEMA ikone za download (PDF) pored naslova, u oba prikaza | ☐ |
| K6 | Na `/pracenje`, promijeni "Prikaz" (Pojedinačni ↔ Ekipni) i "Kategorija" (Sve/Muškarci/Žene) | Filteri rade identično kao na admin stranici — filtriranje, stupci disciplina i formula-info blok se ispravno prikazuju | ☐ |
| K7 | Otvori `/pracenje` u jednom tabu (neprijavljen) i admin sučelje `/` u drugom tabu (prijavljen); u admin tabu unesi novi rezultat ili dodaj tim | Tab s `/pracenje` se automatski ažurira BEZ ručnog refresha u par sekundi (Firebase `onValue` real-time radi i za neprijavljene korisnike jer je `.read: true`) | ☐ |
| K8 | U istom neprijavljenom prozoru u kojem gledaš `/pracenje`, pokušaj otvoriti `/` (root) | Preusmjerava na `/login` — samo `/pracenje` je javna ruta, admin ruta ostaje zaštićena `authGuard`-om | ☐ |
| K9 | (Sigurnosna provjera) Prijavljen kao admin, otvori `/pracenje` u ISTOM prozoru (dakle s aktivnom admin sesijom) | Gumbi za izmjenu i PDF izvoz i dalje NISU vidljivi — `readOnly` skriva akcije bez obzira na status prijave (nije vezano uz `authGuard`) | ☐ |
| K10 | (Sigurnosna provjera, opcionalno/tehnički) U neprijavljenom prozoru na `/pracenje`, otvori DevTools → Console i pokušaj izvršiti upis u bazu izravno preko Firebase SDK-a (zaobilazeći UI) | Očekuje se `PERMISSION_DENIED` — potvrđuje da `.write: "auth != null"` sprječava izmjene neovisno o tome što UI prikazuje; NE pokušavaj ovo na način koji stvarno mijenja produkcijske podatke | ☐ |
| K11 | Firebase konzola → Realtime Database → Rules | Potvrdi da su deployana pravila `.read: true` / `.write: "auth != null"` (bez zastarjelog `competition-data` bloka) — mora odgovarati `database.rules.json` u repou | ☐ |
| K12 | Otvori `/pracenje` na mobitelu (stvarni uređaj ili responsive mode) | Tablica i filteri su čitljivi/upotrebljivi na malom ekranu, bez admin kontrola | ☐ |

---

## Sažetak / sign-off

| Sekcija | Ukupno TC | Prošlo | Pao | Napomena |
|---|---|---|---|---|
| A — Dodaj tim | 10 | | | |
| B — Editiraj tim | 10 | | | |
| C — Unos rezultata | 15 | | | |
| D — Editiraj rezultat | 9 | | | |
| E — Formula | 8 | | | |
| F — Poredak/prikaz | 11 | | | |
| G — Izjednačeni rezultati | 10 | | | |
| H — PDF izvoz | 11 | | | |
| I — Real-time/konkurentnost | 4 | | | |
| J — Regresija refaktoringa | 4 | | | |
| K — Javna `/pracenje` stranica | 12 | | | |
| **UKUPNO** | **104** | | | |

**Testirao:** ______________  **Datum:** ______________  **Verzija/commit:** ______________

**Zaključak (spremno za produkciju? Da/Ne + otvorena pitanja):**
