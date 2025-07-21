import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const frontend = process.env.FRONTEND || 'minimal'
const baseURL = frontend === 'minimal' ? 'http://localhost:3001' : 'http://localhost:3000'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run sequentially for now
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  
  timeout: 30000,
  
  expect: {
    timeout: 10000,
  },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Custom test attributes
    testIdAttribute: 'data-testid',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer config - we're using existing servers
})