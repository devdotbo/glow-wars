import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Run tests sequentially to ensure isolation when using real backend
    maxWorkers: 1,
    globals: true,
  },
})
