# Hunting Games - Deployment Guide

## GitHub Pages Deployment

Ova aplikacija je konfigurirana za automatski deployment na GitHub Pages pomoću GitHub Actions.

### Automatski Deployment

1. **Push kod na GitHub** - kada gurnete promjene na `main` ili `master` branch, GitHub Actions će automatski:
   - Instalirati dependencies
   - Buildati aplikaciju za produkciju
   - Deployati na GitHub Pages

2. **Aplikacija će biti dostupna na**: `https://[your-username].github.io/hunting-games/`

### Ručni Deployment

Možete također deployati ručno pomoću:

```bash
# Build za produkciju i deploy
npm run deploy

# Ili samo build za produkciju
npm run build:prod
```

### Konfiguracija

- **Base href**: `/hunting-games/` (postavljen za GitHub Pages)
- **Output dir**: `dist/app`
- **Produkcijske optimizacije**: uključene (minifikacija, tree-shaking, itd.)

### GitHub Pages Setup

1. Idite na GitHub repository Settings
2. Scroll do "Pages" sekcije
3. Odaberite Source: "GitHub Actions"
4. Workflow će se automatski pokrenuti nakon prvog push-a

### Firebase Configuration

Za rad aplikacije potrebno je:
1. Imati Firebase projekt
2. Konfigurirati environment varijable u `src/environments/environment.prod.ts`
3. Firebase config se automatski koristi u produkciji

## Lokalni Development

```bash
# Install dependencies
npm install

# Start dev server
npm start

# Build for production
npm run build:prod
```
