import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      // Only measure coverage for files that are actively tested
      include: [
        'src/services/api.js',
        'src/services/authService.js',
        'src/services/notificationService.js',
        'src/services/potService.js',
        'src/context/UserContext.jsx',
        'src/context/SettingsContext.jsx',
        'src/components/common/Toast.jsx',
        'src/components/common/ProtectedRoute.jsx',
        'src/components/common/NotificationMonitor.jsx',
        'src/pages/LoginPage.jsx',
        'src/pages/SignUpPage.jsx',
        'src/pages/NotificationPage.jsx',
      ],
      exclude: [
        'node_modules/**',
        'src/**/*.test.{js,jsx}',
        'src/**/__tests__/**',
        'src/setupTests.js',
        'src/services/setupTests.js',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 55,
        statements: 60,
      },
    },
  },
})


