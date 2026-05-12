import { expect, test } from '@playwright/test';

test('loads the editor and opens primary sidebar panels', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'PhotoBook' })).toBeVisible();
  await expect(page.getByRole('button', { name: '전체 보기' })).toBeVisible();
  await expect(page.getByText(/Page 1/)).toBeVisible();

  await page.getByRole('button', { name: /레이아웃/ }).click();
  await expect(page.getByText('페이지 레이아웃')).toBeVisible();

  await page.getByRole('button', { name: /스탬프/ }).click();
  await expect(page.getByRole('heading', { name: '스탬프' })).toBeVisible();
  const firstStamp = page.locator('[draggable="true"]').first();
  await expect(firstStamp).toBeVisible();
  await page.evaluate(() => {
    const stampButton = document.querySelector('[draggable="true"]');
    const pageElement = document.querySelector('[data-a4-page]');
    if (!stampButton || !pageElement) {
      throw new Error('Stamp source or page target was not found');
    }

    const pageRect = pageElement.getBoundingClientRect();
    const dataTransfer = new DataTransfer();
    stampButton.dispatchEvent(new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }));
    pageElement.dispatchEvent(new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer,
      clientX: pageRect.left + pageRect.width / 2,
      clientY: pageRect.top + pageRect.height / 2,
    }));
    pageElement.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer,
      clientX: pageRect.left + pageRect.width / 2,
      clientY: pageRect.top + pageRect.height / 2,
    }));
  });
  await expect(page.locator('[data-stamp-instance-id]')).toHaveCount(1);

  await page.getByRole('button', { name: /저장/ }).click();
  await expect(page.getByRole('button', { name: 'PNG로 저장' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'JPEG로 저장' })).toBeVisible();
});

test('opens and closes settings and overview modals', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: '앱 설정' }).click();
  const settingsDialog = page.getByRole('dialog', { name: '앱 설정' });
  await expect(settingsDialog.getByRole('heading', { name: '앱 설정' })).toBeVisible();
  await settingsDialog.getByRole('button', { name: '닫기' }).first().click();
  await expect(page.getByRole('heading', { name: '앱 설정' })).toBeHidden();

  await page.getByRole('button', { name: '전체 보기' }).click();
  await expect(page.getByRole('heading', { name: '전체 페이지 보기' })).toBeVisible();
  await page.getByRole('button', { name: '전체 페이지 보기 닫기' }).click();
  await expect(page.getByRole('heading', { name: '전체 페이지 보기' })).toBeHidden();
});
