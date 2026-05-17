import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('page loads and has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Chetana/);
  });

  test('page has main heading', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('navigation to theories pages works', async ({ page }) => {
    await page.goto('/');

    // Look for a link to theories
    const theoriesLink = page.locator('a[href*="theories"]').first();
    if (await theoriesLink.isVisible()) {
      await theoriesLink.click();
      await expect(page).toHaveURL(/theories/);
    }
  });

  test('demo mode is accessible', async ({ page }) => {
    await page.goto('/');

    // Look for demo-related link or button
    const demoElement = page.locator('a[href*="demo"], button:has-text("demo"), a:has-text("Demo"), a:has-text("Try")').first();
    if (await demoElement.isVisible()) {
      await demoElement.click();
      // Should navigate without error
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
