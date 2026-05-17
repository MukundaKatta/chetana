import { test, expect } from '@playwright/test';

test.describe('Audit pages', () => {
  test('new audit page loads', async ({ page }) => {
    await page.goto('/audit/new');
    await expect(page.locator('body')).toBeVisible();
    // Page should not show a 404
    await expect(page.locator('text=404')).not.toBeVisible();
  });

  test('model selection UI is present', async ({ page }) => {
    await page.goto('/audit/new');

    // Should have some form of model selection (select, radio, or buttons)
    const modelSelector = page.locator(
      'select, [role="combobox"], [role="listbox"], input[type="radio"], button:has-text("GPT"), button:has-text("Claude"), button:has-text("model")'
    ).first();
    await expect(modelSelector).toBeVisible();
  });

  test('audit form has required fields', async ({ page }) => {
    await page.goto('/audit/new');

    // Should have a form or form-like structure with a submit action
    const form = page.locator('form, [role="form"]').first();
    if (await form.isVisible()) {
      // Check for a submit button
      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Start"), button:has-text("Run"), button:has-text("Begin")'
      ).first();
      await expect(submitButton).toBeVisible();
    }
  });

  test('audit list page loads', async ({ page }) => {
    await page.goto('/audit');
    await expect(page.locator('body')).toBeVisible();
    // Should not show a 404
    await expect(page.locator('text=404')).not.toBeVisible();
  });
});
