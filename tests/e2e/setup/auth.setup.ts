import { test as setup, expect } from '@playwright/test';

const ADMIN_AUTH_FILE = 'tests/.auth/admin.json';

/**
 * Logs in through the real /login UI (NextAuth credentials flow — regression
 * surface on its own) and persists the session for every spec.
 * The admin user comes from seedTestData() in global-setup.
 */
setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');

  // Generous first-visit timeout: dev-server cold compile of the route.
  await expect(page.getByLabel('Correo Electrónico')).toBeVisible({ timeout: 60_000 });
  await page.getByLabel('Correo Electrónico').fill('admin@hestiaplp.com.mx');
  await page.getByLabel('Contraseña').fill('password123');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

  await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });

  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});
