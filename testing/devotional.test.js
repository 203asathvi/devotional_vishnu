// ─────────────────────────────────────────────────────────────────────────────
// Devotional Pages — Playwright Test Suite
// Run: npx playwright test devotional.test.js
// Config: set BASE_URL below to your deployment URL
// ─────────────────────────────────────────────────────────────────────────────

const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://devotional-vishnu.pages.dev';
const PAGES = [
  { name: 'Vishnu Sahasranamam', path: '/vishnu_sahasranamam.html',  audio: 'vishnu_sahasranamam.mp3'  },
  { name: 'Aditya Hridayam',     path: '/aditya_hridayam.html',      audio: 'aditya_hridayam.mp3'      },
  { name: 'Gayatri Mantra',      path: '/gayatri_mantra.html',        audio: 'gayatri_mantra.mp3'        },
  { name: 'Hanuman Chalisa',     path: '/hanuman_chalisa.html',       audio: 'hanuman_chalisa.mp3'       },
  { name: 'Lakshmi Sahasranamam',path: '/lakshmi_sahasranamam.html', audio: 'lakshmi_sahasranamam.mp3'  },
  { name: 'Lalitha Sahasranamam',path: '/lalitha_sahasranamam.html', audio: 'lalitha_sahasranamam.mp3'  },
];
const COMMENTS_API = 'https://devotional-comments.203asathvi.workers.dev';
const AUDIO_PROXY  = 'https://audio-proxy.203asathvi.workers.dev';

// ── Helpers ───────────────────────────────────────────────────────────────────
async function openPage(browser, path) {
  const page = await browser.newPage();
  await page.goto(BASE_URL + path, { waitUntil: 'domcontentloaded', timeout: 20000 });
  return page;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. INDEX PAGE
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Index Page', () => {
  let page;
  test.beforeAll(async ({ browser }) => { page = await openPage(browser, '/index.html'); });
  test.afterAll(async () => await page.close());

  test('loads without JS errors', async () => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });

  test('shows 6 cards', async () => {
    const cards = await page.locator('.card').count();
    expect(cards).toBe(6);
  });

  test('grid is 3 columns on desktop', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const cols = await page.evaluate(() => {
      const grid = document.querySelector('.cards');
      return getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    });
    expect(cols).toBe(3);
  });

  test('grid is 2 columns at 860px', async () => {
    await page.setViewportSize({ width: 860, height: 800 });
    const cols = await page.evaluate(() => {
      const grid = document.querySelector('.cards');
      return getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    });
    expect(cols).toBe(2);
  });

  test('grid is 1 column on mobile', async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    const cols = await page.evaluate(() => {
      const grid = document.querySelector('.cards');
      return getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    });
    expect(cols).toBe(1);
  });

  test('card tags are not in top-right corner', async () => {
    const tag = page.locator('.card-tag').first();
    const style = await tag.evaluate(el => getComputedStyle(el).position);
    // Should be absolute + centred, not right-aligned
    const right = await tag.evaluate(el => getComputedStyle(el).right);
    expect(right).not.toBe('14px');
  });

  test('each card links to correct page', async () => {
    const hrefs = await page.locator('.card').evaluateAll(els => els.map(e => e.getAttribute('href')));
    const expected = PAGES.map(p => p.path.replace('/', ''));
    expected.forEach(e => expect(hrefs).toContain(e));
  });

  test('light mode toggle works', async () => {
    await page.locator('#modeBtn, button:has-text("Light Mode"), button:has-text("☀️")').first().click();
    const hasLight = await page.evaluate(() => document.body.classList.contains('light-mode'));
    expect(hasLight).toBe(true);
    // Toggle back
    await page.locator('#modeBtn, button:has-text("Dark Mode"), button:has-text("🌙")').first().click();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. AUDIO TESTS (run on all pages)
// ─────────────────────────────────────────────────────────────────────────────
for (const p of PAGES) {
  test.describe(`Audio — ${p.name}`, () => {
    let page;
    test.beforeAll(async ({ browser }) => { page = await openPage(browser, p.path); });
    test.afterAll(async () => await page.close());

    test('audio element exists with correct src', async () => {
      const src = await page.locator('#pageAudio').getAttribute('src');
      expect(src).toContain(p.audio);
    });

    test('audio proxy URL is reachable', async () => {
      const response = await page.request.head(`${AUDIO_PROXY}/${p.audio}`);
      expect([200, 206, 302]).toContain(response.status());
    });

    test('audio pill tab exists and is visible', async () => {
      await expect(page.locator('#audioTab')).toBeVisible();
    });

    test('clicking audio tab shows audio pill', async () => {
      await page.locator('#audioTab').click();
      await expect(page.locator('#audioPill')).toBeVisible();
    });

    test('play button exists in audio pill', async () => {
      await expect(page.locator('#audioPlayBtn')).toBeVisible();
    });

    test('seek slider exists', async () => {
      await expect(page.locator('#audioSeek')).toBeVisible();
    });

    test('time display shows 0:00 initially', async () => {
      const cur = await page.locator('#audioTimeCur').textContent();
      expect(cur.trim()).toBe('0:00');
    });

    test('audio speed − button decreases speed', async () => {
      const before = await page.locator('#audioSpeedVal').textContent();
      await page.locator('#audioSpeedDown').click();
      const after = await page.locator('#audioSpeedVal').textContent();
      const bVal = parseFloat(before);
      const aVal = parseFloat(after);
      expect(aVal).toBeLessThan(bVal);
    });

    test('audio speed + button increases speed', async () => {
      const before = await page.locator('#audioSpeedVal').textContent();
      await page.locator('#audioSpeedUp').click();
      const after = await page.locator('#audioSpeedVal').textContent();
      const bVal = parseFloat(before);
      const aVal = parseFloat(after);
      expect(aVal).toBeGreaterThan(bVal);
    });

    test('stop button resets seek to 0', async () => {
      await page.locator('#audioStopBtn').click();
      const val = await page.locator('#audioSeek').inputValue();
      expect(parseFloat(val)).toBe(0);
    });

    test('close button hides audio pill', async () => {
      await page.locator('#audioPill .pill-close').click();
      await expect(page.locator('#audioPill')).toBeHidden();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SCROLL PILL TESTS
// ─────────────────────────────────────────────────────────────────────────────
for (const p of PAGES) {
  test.describe(`Scroll Pill — ${p.name}`, () => {
    let page;
    test.beforeAll(async ({ browser }) => { page = await openPage(browser, p.path); });
    test.afterAll(async () => await page.close());

    test('scroll tab exists and is visible', async () => {
      await expect(page.locator('#scrollTab')).toBeVisible();
    });

    test('clicking scroll tab shows scroll pill', async () => {
      await page.locator('#scrollTab').click();
      await expect(page.locator('#scrollPill')).toBeVisible();
    });

    test('default speed is 1.65×', async () => {
      const val = await page.locator('#speedVal').textContent();
      expect(val.trim()).toBe('1.65×');
    });

    test('speed − decreases by 0.05', async () => {
      const before = parseFloat(await page.locator('#speedVal').textContent());
      await page.locator('#speedDown').click();
      const after  = parseFloat(await page.locator('#speedVal').textContent());
      expect(Math.abs(before - after - 0.05)).toBeLessThan(0.001);
    });

    test('speed + increases by 0.05', async () => {
      await page.locator('#speedDown').click(); // reset down first
      const before = parseFloat(await page.locator('#speedVal').textContent());
      await page.locator('#speedUp').click();
      const after  = parseFloat(await page.locator('#speedVal').textContent());
      expect(Math.abs(after - before - 0.05)).toBeLessThan(0.001);
    });

    test('speed steps are uniform 0.05 increments', async () => {
      const steps = await page.evaluate(() => window.SPEED_STEPS);
      for (let i = 1; i < steps.length; i++) {
        const diff = Math.round((steps[i] - steps[i-1]) * 100) / 100;
        expect(diff).toBe(0.05);
      }
    });

    test('speed min is 0.05', async () => {
      const steps = await page.evaluate(() => window.SPEED_STEPS);
      expect(steps[0]).toBe(0.05);
    });

    test('speed max is 3.00', async () => {
      const steps = await page.evaluate(() => window.SPEED_STEPS);
      expect(steps[steps.length - 1]).toBe(3.0);
    });

    test('play button starts auto-scroll', async () => {
      const scrollBefore = await page.evaluate(() => window.scrollY);
      await page.locator('#scrollPlayBtn').click();
      await page.waitForTimeout(800);
      const scrollAfter = await page.evaluate(() => window.scrollY);
      expect(scrollAfter).toBeGreaterThan(scrollBefore);
      // Stop it
      await page.locator('#scrollPlayBtn').click();
    });

    test('play button icon changes to pause when active', async () => {
      await page.locator('#scrollPlayBtn').click();
      const text = await page.locator('#scrollPlayBtn').textContent();
      expect(text.trim()).toBe('⏸');
      await page.locator('#scrollPlayBtn').click();
    });

    test('close button hides scroll pill', async () => {
      await page.locator('#scrollPill .pill-close').click();
      await expect(page.locator('#scrollPill')).toBeHidden();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FONT SIZE TESTS
// ─────────────────────────────────────────────────────────────────────────────
for (const p of PAGES) {
  test.describe(`Font Size — ${p.name}`, () => {
    let page;
    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage();
      // Clear localStorage so we get fresh default
      await page.addInitScript(() => localStorage.removeItem('devFontSize'));
      await page.goto(BASE_URL + p.path, { waitUntil: 'domcontentloaded' });
    });
    test.afterAll(async () => await page.close());

    test('body has no hardcoded font-size in CSS', async () => {
      const cssFs = await page.evaluate(() => {
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) {
              if (rule.selectorText === 'body' && rule.style.fontSize) {
                return rule.style.fontSize;
              }
            }
          } catch(e) {}
        }
        return null;
      });
      expect(cssFs).toBeNull();
    });

    test('mobile default is 20px at 360px viewport', async () => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      const fs = await page.evaluate(() => document.body.style.fontSize);
      expect(fs).toBe('20px');
    });

    test('desktop default is 17px at 1280px viewport', async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      const fs = await page.evaluate(() => document.body.style.fontSize);
      expect(fs).toBe('17px');
    });

    test('A+ increases font size', async () => {
      const before = parseInt(await page.evaluate(() => document.body.style.fontSize));
      await page.locator('button[onclick*="changeFontSize(1)"]').click();
      const after = parseInt(await page.evaluate(() => document.body.style.fontSize));
      expect(after).toBe(before + 1);
    });

    test('A- decreases font size', async () => {
      const before = parseInt(await page.evaluate(() => document.body.style.fontSize));
      await page.locator('button[onclick*="changeFontSize(-1)"]').click();
      const after = parseInt(await page.evaluate(() => document.body.style.fontSize));
      expect(after).toBe(before - 1);
    });

    test('font size persists in localStorage', async () => {
      await page.locator('button[onclick*="changeFontSize(1)"]').click();
      const stored = await page.evaluate(() => localStorage.getItem('devFontSize'));
      expect(stored).not.toBeNull();
    });

    test('verse text scales with body font size', async () => {
      // em-based elements should scale
      const bodyFs = parseInt(await page.evaluate(() => document.body.style.fontSize));
      const verseEl = await page.$('td.verse, .shloka-line');
      if (verseEl) {
        const verseFs = parseInt(await page.evaluate(el => getComputedStyle(el).fontSize, verseEl));
        expect(verseFs).toBeGreaterThanOrEqual(bodyFs - 1);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. COMMENTS PANEL TESTS
// ─────────────────────────────────────────────────────────────────────────────
for (const p of PAGES) {
  test.describe(`Comments — ${p.name}`, () => {
    let page;
    test.beforeAll(async ({ browser }) => { page = await openPage(browser, p.path); });
    test.afterAll(async () => await page.close());

    test('support FAB button exists', async () => {
      await expect(page.locator('#spFabBtn')).toBeVisible();
    });

    test('clicking FAB opens menu', async () => {
      await page.locator('#spFabBtn').click();
      await expect(page.locator('#spFabMenu')).toHaveClass(/open/);
    });

    test('Comment menu item opens panel', async () => {
      await page.locator('#spBtnComment').click();
      await expect(page.locator('#spPanel')).toHaveClass(/open/);
    });

    test('comment tab is active', async () => {
      await expect(page.locator('.sp-tab[data-t="comment"]')).toHaveClass(/on/);
    });

    test('comments API is reachable', async () => {
      const pageKey = p.path.replace('/', '').replace('.html', '');
      const response = await page.request.get(`${COMMENTS_API}/api/comments?page=${pageKey}`);
      expect([200, 201]).toContain(response.status());
    });

    test('comment form has name and text fields', async () => {
      await expect(page.locator('#spName')).toBeVisible();
      await expect(page.locator('#spText')).toBeVisible();
    });

    test('submit with empty text shows error', async () => {
      await page.locator('#spSubmit').click();
      await expect(page.locator('#spErr .sp-err')).toBeVisible();
    });

    test('close button dismisses panel', async () => {
      await page.locator('#spCloseBtn').click();
      await expect(page.locator('#spPanel')).not.toHaveClass(/open/);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DONATE PANEL TESTS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Donate Panel — Vishnu (representative)', () => {
  let page;
  test.beforeAll(async ({ browser }) => { page = await openPage(browser, '/vishnu_sahasranamam.html'); });
  test.afterAll(async () => await page.close());

  test('clicking FAB → Donate opens donate tab', async () => {
    await page.locator('#spFabBtn').click();
    await page.locator('#spBtnDonate').click();
    await expect(page.locator('#spPanel')).toHaveClass(/open/);
    await expect(page.locator('.sp-tab[data-t="donate"]')).toHaveClass(/on/);
  });

  test('preset amount buttons exist', async () => {
    const amts = await page.locator('.sp-amt').count();
    expect(amts).toBeGreaterThanOrEqual(4);
  });

  test('clicking preset selects it', async () => {
    await page.locator('.sp-amt[data-v="5"]').click();
    await expect(page.locator('.sp-amt[data-v="5"]')).toHaveClass(/on/);
  });

  test('custom amount input accepts numbers', async () => {
    await page.locator('#spAmt').fill('15');
    const val = await page.locator('#spAmt').inputValue();
    expect(val).toBe('15');
  });

  test('PayPal button is present', async () => {
    await expect(page.locator('#spPP')).toBeVisible();
  });

  test('close button dismisses panel', async () => {
    await page.locator('#spCloseBtn').click();
    await expect(page.locator('#spPanel')).not.toHaveClass(/open/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. NAVIGATION & SEARCH TESTS
// ─────────────────────────────────────────────────────────────────────────────
for (const p of PAGES) {
  test.describe(`Nav & Search — ${p.name}`, () => {
    let page;
    test.beforeAll(async ({ browser }) => { page = await openPage(browser, p.path); });
    test.afterAll(async () => await page.close());

    test('home link exists', async () => {
      await expect(page.locator('a.nav-home, a[href="index.html"]')).toBeVisible();
    });

    test('search button toggles search bar', async () => {
      await page.locator('#searchBtn').click();
      await expect(page.locator('#searchBar')).toHaveClass(/active/);
      await page.locator('#searchBtn').click();
    });

    test('search filters content', async () => {
      await page.locator('#searchBtn').click();
      await page.locator('#searchInput').fill('om');
      await page.waitForTimeout(300);
      // At least some rows should still be visible
      const visible = await page.locator('tbody tr:not([style*="display: none"])').count();
      expect(visible).toBeGreaterThan(0);
      await page.locator('#searchInput').fill('');
    });

    test('light/dark mode toggle exists', async () => {
      await expect(page.locator('#modeBtn')).toBeVisible();
    });

    test('progress bar element exists', async () => {
      await expect(page.locator('#progress')).toBeAttached();
    });

    test('back to top button exists', async () => {
      await expect(page.locator('#backTop')).toBeAttached();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. MOBILE VIEWPORT TESTS (Flip 5 — 360px)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Mobile — Samsung Flip 5 (360px)', () => {
  let page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.setViewportSize({ width: 360, height: 820 });
    await page.goto(BASE_URL + '/vishnu_sahasranamam.html', { waitUntil: 'domcontentloaded' });
  });
  test.afterAll(async () => await page.close());

  test('no horizontal scroll', async () => {
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('pills do not overlap each other', async () => {
    await page.locator('#audioTab').click();
    await page.locator('#scrollTab').click();
    const audioBox  = await page.locator('#audioPill').boundingBox();
    const scrollBox = await page.locator('#scrollPill').boundingBox();
    if (audioBox && scrollBox) {
      const overlap = audioBox.x + audioBox.width > scrollBox.x;
      expect(overlap).toBe(false);
    }
  });

  test('audio pill fits within 360px viewport', async () => {
    const box = await page.locator('#audioPill').boundingBox();
    if (box) expect(box.x + box.width).toBeLessThanOrEqual(360);
  });

  test('nav bar does not overflow', async () => {
    const navW   = await page.locator('nav').evaluate(el => el.scrollWidth);
    const viewW  = 360;
    expect(navW).toBeLessThanOrEqual(viewW + 2); // 2px tolerance
  });

  test('font size is 20px on mobile', async () => {
    const fs = await page.evaluate(() => document.body.style.fontSize);
    expect(fs).toBe('20px');
  });
});
