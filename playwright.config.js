import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    timeout: 30000,
    expect: { timeout: 10000 },
    fullyParallel: false,
    reporter: [['html', { open: 'never' }], ['list']],
    use: {
        baseURL: 'http://localhost:53658',
        viewport: { width: 1440, height: 900 },
        screenshot: 'only-on-failure',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
});
