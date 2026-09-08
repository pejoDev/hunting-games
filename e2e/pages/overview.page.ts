import { Locator, Page } from '@playwright/test';

/**
 * Page Object za `OverviewComponent` (`/` i `/pracenje`).
 * Skeleton iz Faze 0 - proširuje se u kasnijim fazama (filteri, dijalozi, PDF izvoz...).
 */
export class OverviewPage {
  readonly page: Page;
  readonly header: Locator;
  readonly controlPanel: Locator;
  readonly addTeamButton: Locator;
  readonly editTeamButton: Locator;
  readonly addResultButton: Locator;
  readonly editResultButton: Locator;
  readonly individualEmptyState: Locator;
  readonly individualTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('.header h1');
    this.controlPanel = page.locator('.control-panel');
    this.addTeamButton = this.controlPanel.getByRole('button', { name: 'Dodaj tim' });
    this.editTeamButton = this.controlPanel.getByRole('button', { name: 'Editiraj tim' });
    this.addResultButton = this.controlPanel.getByRole('button', { name: 'Unos rezultata' });
    this.editResultButton = this.controlPanel.getByRole('button', { name: 'Editiraj rezultat' });
    this.individualEmptyState = page.locator('.card', { hasText: 'Pojedinačni Poredak' }).locator('.empty-state');
    this.individualTable = page.locator('.card', { hasText: 'Pojedinačni Poredak' }).locator('table.modern-table');
  }

  async goto(path: '/' | '/pracenje' = '/'): Promise<void> {
    await this.page.goto(path);
  }
}
