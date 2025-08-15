# PDF Export Funkcionalnost

## Pregled

Dodao sam kompletnu PDF export funkcionalnost u vašu aplikaciju za lovačko natjecanje. Sada možete generirati profesionalne PDF izvještaje rezultata.

## Nove Funkcionalnosti

### 1. PDF Export Dugmad u Control Panel-u

- **"Izvoz u PDF"** - Izvozi trenutno prikazane podatke (pojedinačni ili ekipni poredak)
- **"Kompletan izvještaj"** - Generiše sveobuhvatni PDF sa oba poretka

### 2. Brzi Export Dugmad

- Dugme sa download ikonom pored naslova svakog poretka
- Omogućava brz izvoz trenutne tabele

### 3. Tipovi PDF Izvještaja

#### Pojedinačni Poredak PDF
- Profesionalno formatiran header sa nazivom natjecanja
- Prikazuje kategoriju (Muškarci/Žene) ako je odabrana
- Formula bodovanja objašnjena na vrhu
- Tabela sa:
  - Rang (zlatno/srebrno/bronzano bojenje za top 3)
  - Ime i prezime takmičara
  - Tim
  - Rezultati po disciplinama
  - Ukupni bodovi
- Footer sa datumom generiranja i brojem stranice

#### Ekipni Poredak PDF
- Slična struktura kao pojedinačni poredak
- Dodatno prikazuje sastav svih ekipa na kraju
- Zelena tema za razlikovanje od pojedinačnog

#### Kompletan Izvještaj PDF
- Kombinuje oba poretka u jedan dokument
- Sažete tabele (top 10) za bolji pregled
- Idealno za prezentacije i arhiviranje

### 4. Karakteristike PDF-a

- **Responsive dizajn** - Automatski se prilagođava sadržaju
- **Profesionalno formatiranje** - Boje, font-ovi i layout
- **Inteligentno paginiranje** - Automatski prelazi na novu stranicu
- **Highlighting top 3** - Vizuelno izdvajanje pobednika
- **Datum i vreme** - Automatski dodaje kada je izvještaj generiran
- **Lokalizovani nazivi** - Svi nazivi su na hrvatskom jeziku

## Kako Koristiti

### Osnovni Export
1. Odaberite prikaz (Pojedinačni/Ekipni poredak)
2. Odaberite kategoriju (opciono)
3. Kliknite "Izvoz u PDF"
4. PDF se automatski preuzima

### Brzi Export
- Kliknite dugme sa download ikonom pored naslova tabele

### Kompletan Izvještaj  
- Kliknite "Kompletan izvještaj" za sveobuhvatni PDF

## Tehnički Detalji

### Biblioteke
- **jsPDF** - Generiranje PDF dokumenata
- **jsPDF-AutoTable** - Napredne tabele u PDF-u

### Nazivi Fajlova
- `pojedinacni-poredak-[kategorija]-[datum].pdf`
- `ekipni-poredak-[kategorija]-[datum].pdf`  
- `kompletan-izvjestaj-[kategorija]-[datum].pdf`

### Stilovi i Boje
- **Pojedinačni poredak**: Plava tema (#2980b9)
- **Ekipni poredak**: Zelena tema (#4CAF50)
- **Top 3 highlighting**: Zlatna/Srebrna/Bronzana boja
- **Font**: Helvetica za čitljivost

## Primjeri Korišćenja

### Za Natjecanje
1. Tokom natjecanja - koristite brze export dugmad za trenutne rezultate
2. Na kraju dana - generirajte kompletan izvještaj
3. Za pobednike - izvozite finalne poretke sa highlighting-om

### Za Organizatore
- Kompletan izvještaj za arhiviranje
- Pojedinačni izvozi za objavu rezultata
- Ekipni poredak za nagrađivanje timova

## Napomene

- Dugmad se automatski onemogućavaju ako nema podataka za prikaz
- PDF se otvara u novom tab-u/prozoru browsera
- Svi PDF-ovi su optimizovani za štampanje na A4 formatu
- Podržava neograničen broj takmičara i disciplina

Ova funkcionalnost je potpuno integrirana u postojeću aplikaciju i ne utiče na postojeće funkcionalnosti.
