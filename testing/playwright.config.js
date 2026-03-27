const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testMatch: 'devotional.test.js',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,

  reporter: [
    ['list'],
    ['html',  { outputFolder: 'test-report', open: 'never' }],
    ['json',  { outputFile: 'test-results.json' }],
  ],

  use: {
    baseURL:           process.env.BASE_URL || 'https://dev.devotional-vishnu.pages.dev',
    headless:          true,
    viewport:          { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    screenshot:        'only-on-failure',
    video:             'retain-on-failure',
    trace:             'retain-on-failure',
  },

  projects: [
    {
      name: 'desktop',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile-flip5',
      use: { browserName: 'chromium', viewport: { width: 360, height: 820 } },
      grep: /Mobile/,
    },
  ],
});
