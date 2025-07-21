import { test, expect } from '@playwright/test'

test('debug guest player creation', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => console.log('Browser console:', msg.text()))
  page.on('pageerror', err => console.log('Page error:', err))
  
  // Navigate to the app
  await page.goto('/')
  
  // Wait a bit to see what happens
  await page.waitForTimeout(5000)
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-screenshot.png' })
  
  // Try to check what's in the page
  const pageContent = await page.content()
  console.log('Page has main-menu element:', pageContent.includes('data-testid="main-menu"'))
  
  // Check if there are any network errors
  const failed = []
  page.on('requestfailed', request => {
    failed.push({
      url: request.url(),
      error: request.failure()?.errorText
    })
  })
  
  await page.waitForTimeout(2000)
  console.log('Failed requests:', failed)
})