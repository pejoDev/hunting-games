import { defineConfig, devices } from '@playwright/test';

// Aplikacija se u E2E testovima servira na drugom portu od `npm start` (4200) da se
// nikad ne pomiješa sa stvarnim dev serverom koji netko možda ima pokrenut usporedno,
// niti dijeli podatke s njim (E2E koristi `environment.e2e.ts` -> Firebase emulatore).
const APP_PORT = 4300;

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  webServer: [
    {
      // Firebase Local Emulator Suite (Auth + Realtime Database) - vidi e2e/support/emulator.ts.
      // Testovi NIKAD ne diraju produkcijsku bazu.
      command: 'npm run emulators',
      url: 'http://127.0.0.1:9000',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe'
    },
    {
      command: `npx ng serve --configuration=e2e --port=${APP_PORT}`,
      url: `http://127.0.0.1:${APP_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
