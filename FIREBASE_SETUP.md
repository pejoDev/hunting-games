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

5. **Postavite sigurnosna pravila:**
   - U Realtime Database > Rules postavite:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
   *Napomena: Ova pravila omogućavaju svima čitanje/pisanje. Za produkciju postavite stroža pravila.*

6. **Uploadajte početne podatke:**
   - Pokrenite aplikaciju (`ng serve`)
   - Kliknite gumb "Upload JSON u Firebase"
   - Podaci će se uploadati u Firebase

## Prednosti Firebase implementacije

- **Perzistencija**: Svi podaci se čuvaju u Firebase bazi
- **Real-time sinkronizacija**: Promjene se odmah prikazuju svim korisnicima
- **Skalabilnost**: Firebase automatski skalira prema potrebi
- **Offline podrška**: Firebase ima ugrađenu offline podršku
- **Backup**: Podaci su sigurni u Google infrastrukturi

## Struktura podataka u Firebase

```
hunting-games-db/
└── competition-data/
    ├── teams/
    ├── disciplines/
    └── results/
```

Sve CRUD operacije sada rade direktno s Firebase bazom umjesto s lokalnim JSON datotekama.
