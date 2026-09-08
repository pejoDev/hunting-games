# Firebase Konfiguracija

## Koraci za postavljanje Firebase Realtime Database

1. **Kreiraj Firebase projekt:**
   - Idite na https://console.firebase.google.com/
   - Kliknite "Add project" i slijedite korake
   - Zabilježite Project ID

2. **Omogućite Realtime Database:**
   - U Firebase konzoli odaberite vaš projekt
   - Idite na "Build" > "Realtime Database"
   - Kliknite "Create Database"
   - Odaberite lokaciju (Europe-west1 za Europu)
   - Počnite u "test mode" (privremeno)

3. **Dodajte web aplikaciju:**
   - U Firebase konzoli kliknite na "Web" ikonu (</>)
   - Registrirajte aplikaciju s nazivom (npr. "Hunting Games")
   - Kopirajte Firebase config objekt

4. **Ažurirajte environment.ts datoteke:**
   - Zamijenite vrijednosti u `src/environments/environment.ts` i `environment.prod.ts`
   - Primjer:
   ```typescript
   export const environment = {
     production: false,
     firebase: {
       apiKey: "AIzaSyCXXXXXXXXXXXXXXXXXXXXXXXX",
       authDomain: "hunting-games-12345.firebaseapp.com",
       databaseURL: "https://hunting-games-12345-default-rtdb.europe-west1.firebasedatabase.app/",
       projectId: "hunting-games-12345",
       storageBucket: "hunting-games-12345.appspot.com",
       messagingSenderId: "123456789012",
       appId: "1:123456789012:web:abcdefghijklmnop"
     }
   };
   ```

5. **Postavite sigurnosna pravila** (vidi `database.rules.json` u repou — ovo je trenutno stanje):
   ```json
   {
     "rules": {
       ".read": true,
       ".write": "auth != null"
     }
   }
   ```
   *Čitanje je javno (potrebno za `/pracenje`, read-only stranicu za praćenje uživo bez prijave). Pisanje smije samo prijavljeni Firebase korisnik — nema dodatnih rola, pa svaki prijavljeni račun ima puna prava nad podacima. Kreirajte korisničke račune organizatora u Firebase Console > Authentication > Users (Email/Password provider).*

6. **Pokrenite aplikaciju:**
   - `ng serve` (ili `npm start`)
   - Prijavite se na `/login` s računom kreiranim u koraku 5
   - Podaci (momčadi, discipline, rezultati) unose se kroz sučelje i odmah se spremaju u Firebase — nema posebnog uvoza JSON datoteke.

## Prednosti Firebase implementacije

- **Perzistencija**: Svi podaci se čuvaju u Firebase bazi
- **Real-time sinkronizacija**: Promjene se odmah prikazuju svim korisnicima
- **Skalabilnost**: Firebase automatski skalira prema potrebi
- **Offline podrška**: Firebase ima ugrađenu offline podršku
- **Backup**: Podaci su sigurni u Google infrastrukturi

## Struktura podataka u Firebase

`teams`, `disciplines` i `results` su top-level ključevi na korijenu baze (nema `competition-data/` sloja):

```
/
├── teams/
├── disciplines/
└── results/
```

Svaka CRUD operacija u `CompetitionService` čita cijelu kolekciju, mijenja je u memoriji i piše je natrag u cijelosti (`set()` na `/teams`, `/disciplines` ili `/results`) — nema per-record zapisa.
