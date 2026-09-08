import { test, expect } from '@playwright/test';
import { resetToBaseline } from '../support/emulator';
import { OverviewPage } from '../pages/overview.page';

// Faza 0 smoke test: potvrđuje da cijela infrastruktura (Firebase emulatori + `ng serve
// --configuration=e2e`) radi zajedno i da se aplikacija spaja na EMULATOR, ne na
// produkcijsku bazu (`resetToBaseline()` piše/čita isključivo preko localhost REST-a).
test.beforeEach(async () => {
  await resetToBaseline();
});

test('00.1 - /pracenje se učitava protiv emulatora bez konzolnih grešaka i prikazuje prazan poredak', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  const pageErrors: string[] = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  const overview = new OverviewPage(page);
  await overview.goto('/pracenje');

  await expect(overview.header).toContainText('Memorijal Dragutin Cenko');
  await expect(overview.individualEmptyState).toBeVisible();

  expect(consoleErrors, `Konzolne greške: ${consoleErrors.join('; ')}`).toEqual([]);
  expect(pageErrors, `Neuhvaćene greške: ${pageErrors.join('; ')}`).toEqual([]);
});

test('00.2 - emulator sadrži točno 6 seed disciplina iz TC 0.4', async ({ page }) => {
  const res = await page.request.get(
    'http://127.0.0.1:9000/disciplines.json?ns=hunting-games-fe57e-default-rtdb'
  );
  expect(res.ok()).toBe(true);
  const disciplines: Array<{ name: string; category: string; maxPoints: number }> = await res.json();
  expect(disciplines).toHaveLength(6);

  const maxPointsByName: Record<string, number> = {};
  for (const d of disciplines) {
    maxPointsByName[`${d.name} (${d.category})`] = d.maxPoints;
  }
  expect(maxPointsByName).toEqual({
    'TRAP (M)': 5,
    'ZRAČNA PUŠKA (M)': 50,
    'PRAČKA (M)': 5,
    'ZRAČNA PUŠKA (Ž)': 50,
    'PRAČKA (Ž)': 5,
    'PIKADO (Ž)': 300
  });
});
