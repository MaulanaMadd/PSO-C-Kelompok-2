import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['my-app-service-190501588992.asia-southeast2.run.app']
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Only measure coverage for files that are actually tested
      include: [
        'src/services/**/*.{js,jsx}',
        'src/context/**/*.{js,jsx}',
        'src/components/common/**/*.{js,jsx}',
        'src/pages/LoginPage.jsx',
        'src/pages/SignUpPage.jsx',
        'src/pages/NotificationPage.jsx',
      ],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/**/__tests__/**',
        'src/setupTests.js',
        'src/services/setupTests.js',
        'src/data/**',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 55,
        statements: 60,
      }
    }
  }
})