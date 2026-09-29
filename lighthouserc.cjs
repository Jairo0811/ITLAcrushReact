module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview -- --host 0.0.0.0 --port 4173',
      startServerReadyPattern: 'Local:',
      numberOfRuns: 1,
      url: [
        'http://127.0.0.1:4173/home',
        'http://127.0.0.1:4173/demo',
        'http://127.0.0.1:4173/login',
      ],
      settings: {
        preset: 'desktop',
        chromeFlags: '--headless --no-sandbox',
      },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:performance': ['warn', { minScore: 0.65 }],
        'categories:seo': ['warn', { minScore: 0.85 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
}
