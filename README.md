
# Međudruštveno natjecanje — Angular 18 + Angular Material starter

Ovo je minimalni skeleton aplikacije za natjecanje (Angular 18 + Angular Material).
Sadrži Overview stranicu s rang listom i dugmad koja otvaraju Material dijaloge za dodavanje timova, disciplina i rezultata.

## Pokretanje (lokalno)
1. Raspakiraj zip u prazan folder.
2. Instaliraj dependencies:
   ```bash
   npm install
   ```
3. Ako nemaš Angular CLI instaliran:
   ```bash
   npm i -g @angular/cli
   ```
4. Pokreni aplikaciju:
   ```bash
   ng serve --open
   ```

## Napomene
- Angular Material teme i ikone možete dodati naredbom `ng add @angular/material` ili instalirati pakete ručno:
  ```bash
  npm install @angular/material @angular/cdk @angular/animations
  ```
- Projekt koristi `localStorage` za pohranu stanja pod ključem `medjudrustveno_v1`.
- Ako treba, mogu proširiti funkcionalnosti (PDF export, import iz Excela, napredna pravila bodovanja).
