import { test as setup, expect } from '@playwright/test';

const ADMIN_AUTH_FILE = 'tests/.auth/admin.json';

/**
 * Logs in through the real /login UI (NextAuth credentials flow — regression
 * surface on its own) and persists the session for every spec.
 * The admin user comes from seedTestData() in global-setup.
 */
setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');

  await page.getByPlaceholder(/correo|email/i).fill('admin@hestiaplp.com.mx');
  await page.getByPlaceholder(/contraseña|password/i).fill('password123');
  await page.getByRole('button', { name: /iniciar|login/i }).click();

  await expect(page).toHaveURL(/dashboard/, { timeout: 20_000 });

  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});
