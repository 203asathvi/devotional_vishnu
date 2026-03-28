// ─────────────────────────────────────────────────────────────────────────────
// Devotional Pages — Playwright Test Suite
// ─────────────────────────────────────────────────────────────────────────────

const { test, expect } = require('@playwright/test');

const PAGES = [
  { name: 'Vishnu Sahasranamam', path: '/html/vishnu_sahasranamam.html',  audio: 'vishnu_sahasranamam.mp3'  },
  { name: 'Aditya Hridayam',     path: '/html/aditya_hridayam.html',      audio: 'aditya_hridayam.mp3'      },
  { name: 'Gayatri Mantra',      path: '/html/gayatri_mantra.html',        audio: 'gayatri_mantra.mp3'        },
  { name: 'Hanuman Chalisa',     path: '/html/hanuman_chalisa.html',       audio: 'hanuman_chalisa.mp3'       },
  { name: 'Lakshmi Sahasranamam',path: '/html/lakshmi_sahasranamam.html', audio: 'lakshmi_sahasranamam.mp3'  },
  { name: 'Lalitha Sahasranamam',path: '/html/lalitha_sahasranamam.html', audio: 'lalitha_sahasranamam.mp3'  },
];

const COMMENTS_API = 'https://devotional-comments.203asathvi.workers.dev';
const AUDIO_PROXY  = 'https://audio-proxy.203asathvi.workers.dev';

// ── Helper: open page and disable auto-hide so pills stay visible ─────────────
async function openPage(page, path) {
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 20000 });
  // Disable auto-hide timer so pills don't vanish mid-test
  await page.evaluate(() => { window.PILL_AUTO_HIDE_MS = 0; });
}

// ── Helper: open audio pill ───────────────────────────────────────────────────
async function openAudioPill(page) {
  const pill = page.locator('#audioPill');
  const isHidden = await pill.evaluate(el => el.classList.contains('hidden'));
  if (isHidden) await page.locator('#audioTab').click();
  await expect(pill).toBeVisible({ timeout: 5000 });
}

// ── Helper: open scroll pill ──────────────────────────────────────────────────
async function openScrollPill(page) {
  const pill = page.locator('#scrollPill');
  const isHidden = await pill.evaluate(el => el.classList.contains('hidden'));
  if (isHidden) await page.locator('#scrollTab').click();
  await expect(pill).toBeVisible({ timeout: 5000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. INDEX PAGE
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Index Page', () => {

  test('loads without errors and shows 6 cards', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
    expect(await page.locator('.card').count()).toBe(6);
  });

  test('grid is 3 columns on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    const cols = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.cards')).gridTemplateColumns.split(' ').length
    );
    expect(cols).toBe(3);
  });

  test('grid is 2 columns at 860px', async ({ page }) => {
    await page.setViewportSize({ width: 860, height: 800 });
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    const cols = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.cards')).gridTemplateColumns.split(' ').length
    );
    expect(cols).toBe(2);
  });

  test('each card links to correct html/ path', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    const hrefs = await page.locator('.card').evaluateAll(els => els.map(e => e.getAttribute('href')));
    PAGES.forEach(p => expect(hrefs).toContain(p.path.replace('/', '')));
  });

  test('light mode toggle works', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#modeBtn').click();
    expect(await page.evaluate(() => document.body.classList.contains('light-mode'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. AUDIO TESTS
// Focus: controls UI and speed stepping only — no actual playback/content tests
// Audio files can be 30+ mins so we never wait for them to play
// ─────────────────────────────────────────────────────────────────────────────
for (const p of PAGES) {
  test.describe(`Audio — ${p.name}`, () => {

    test('audio element exists with correct src', async ({ page }) => {
      await openPage(page, p.path);
      const src = await page.locator('#pageAudio').getAttribute('src');
      expect(src).toContain(p.audio);
      // Verify src URL format only — do not load or play audio
    });

    test('audio proxy URL returns valid response', async ({ request }) => {
      // HEAD request only — no audio data downloaded
      const res = await request.head(`${AUDIO_PROXY}/${p.audio}`);
      expect([200, 206, 302, 308]).toContain(res.status());
    });

    test('audio tab opens pill with all controls', async ({ page }) => {
      await openPage(page, p.path);
      await page.locator('#audioTab').click();
      await expect(page.locator('#audioPill')).toBeVisible();
      // All controls exist
      await expect(page.locator('#audioPlayBtn')).toBeVisible();
      await expect(page.locator('#audioSeek')).toBeVisible();
      await expect(page.locator('#audioSpeedVal')).toBeVisible();
      await expect(page.locator('#audioSpeedDown')).toBeVisible();
      await expect(page.locator('#audioSpeedUp')).toBeVisible();
      await expect(page.locator('#audioStopBtn')).toBeVisible();
    });

    test('speed − button decreases displayed speed value', async ({ page }) => {
      await openPage(page, p.path);
      await openAudioPill(page);
      const before = parseFloat(await page.locator('#audioSpeedVal').textContent());
      await page.locator('#audioSpeedDown').click();
      const after  = parseFloat(await page.locator('#audioSpeedVal').textContent());
      // Value must decrease — no audio loaded, purely UI state change
      expect(after).toBeLessThan(before);
    });

    test('speed + button increases displayed speed value', async ({ page }) => {
      await openPage(page, p.path);
      await openAudioPill(page);
      const before = parseFloat(await page.locator('#audioSpeedVal').textContent());
      await page.locator('#audioSpeedUp').click();
      const after  = parseFloat(await page.locator('#audioSpeedVal').textContent());
      expect(after).toBeGreaterThan(before);
    });

    test('speed steps through all AUDIO_SPEED_STEPS correctly', async ({ page }) => {
      await openPage(page, p.path);
      await openAudioPill(page);
      const steps = await page.evaluate(() => window.AUDIO_SPEED_STEPS);
      // Must have steps defined
      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBeGreaterThan(0);
      // Each step must be a valid positive number
      steps.forEach(s => expect(s).toBeGreaterThan(0));
      // Steps must be ascending
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i]).toBeGreaterThan(steps[i - 1]);
      }
    });

    test('speed resets correctly after multiple clicks', async ({ page }) => {
      await openPage(page, p.path);
      await openAudioPill(page);
      // Click up 3 times then down 3 times — should return near original
      const original = parseFloat(await page.locator('#audioSpeedVal').textContent());
      await page.locator('#audioSpeedUp').click();
      await page.locator('#audioSpeedUp').click();
      await page.locator('#audioSpeedUp').click();
      await page.locator('#audioSpeedDown').click();
      await page.locator('#audioSpeedDown').click();
      await page.locator('#audioSpeedDown').click();
      const restored = parseFloat(await page.locator('#audioSpeedVal').textContent());
      expect(restored).toBe(original);
    });

    test('play button toggles icon without waiting for audio', async ({ page }) => {
      await openPage(page, p.path);
      await openAudioPill(page);
      // Intercept audio network requests so nothing actually loads
      await page.route('**/*.mp3', route => route.abort());
      await page.locator('#audioPlayBtn').click();
      // Icon should change to pause immediately (UI state, not audio state)
      await expect(page.locator('#audioPlayBtn')).toHaveText('⏸', { timeout: 3000 });
    });

    test('stop button resets seek slider to 0', async ({ page }) => {
      await openPage(page, p.path);
      await openAudioPill(page);
      await page.locator('#audioStopBtn').click();
      const val = await page.locator('#audioSeek').inputValue();
      expect(parseFloat(val)).toBe(0);
    });

    test('close button hides audio pill', async ({ page }) => {
      await openPage(page, p.path);
      await openAudioPill(page);
      await page.locator('#audioPill .pill-close').click();
      await expect(page.locator('#audioPill')).toBeHidden();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SCROLL PILL TESTS — each test gets a fresh page
// ─────────────────────────────────────────────────────────────────────────────
for (const p of PAGES) {
  test.describe(`Scroll Pill — ${p.name}`, () => {

    test('scroll tab opens pill', async ({ page }) => {
      await openPage(page, p.path);
      await page.locator('#scrollTab').click();
      await expect(page.locator('#scrollPill')).toBeVisible();
    });

    test('default speed is 1.65×', async ({ page }) => {
      await openPage(page, p.path);
      await openScrollPill(page);
      const val = await page.locator('#speedVal').textContent();
      expect(val.trim()).toBe('1.65×');
    });

    test('speed − decreases by 0.05', async ({ page }) => {
      await openPage(page, p.path);
      await openScrollPill(page);
      const before = parseFloat(await page.locator('#speedVal').textContent());
      await page.locator('#speedDown').click();
      const after  = parseFloat(await page.locator('#speedVal').textContent());
      expect(Math.round((before - after) * 100) / 100).toBe(0.05);
    });

    test('speed + increases by 0.05', async ({ page }) => {
      await openPage(page, p.path);
      await openScrollPill(page);
      const before = parseFloat(await page.locator('#speedVal').textContent());
      await page.locator('#speedUp').click();
      const after  = parseFloat(await page.locator('#speedVal').textContent());
      expect(Math.round((after - before) * 100) / 100).toBe(0.05);
    });

    test('speed steps are 0.05 increments from 0.05 to 3.00', async ({ page }) => {
      await openPage(page, p.path);
      const steps = await page.evaluate(() => window.SPEED_STEPS);
      expect(steps[0]).toBe(0.05);
      expect(steps[steps.length - 1]).toBe(3.0);
      for (let i = 1; i < steps.length; i++) {
        const diff = Math.round((steps[i] - steps[i-1]) * 100) / 100;
        expect(diff).toBe(0.05);
      }
    });

    test('play button starts auto-scroll and icon changes to pause', async ({ page }) => {
      await openPage(page, p.path);
      await openScrollPill(page);
      await page.locator('#scrollPlayBtn').click();
      await expect(page.locator('#scrollPlayBtn')).toHaveText('⏸');
      // Stop it
      await page.locator('#scrollPlayBtn').click();
    });

    test('close button hides scroll pill', async ({ page }) => {
      await openPage(page, p.path);
      await openScrollPill(page);
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

    test('no hardcoded font-size in body CSS', async ({ page }) => {
      await page.addInitScript(() => localStorage.removeItem('devFontSize'));
      await openPage(page, p.path);
      const cssFs = await page.evaluate(() => {
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) {
              if (rule.selectorText === 'body' && rule.style.fontSize)
                return rule.style.fontSize;
            }
          } catch(e) {}
        }
        return null;
      });
      expect(cssFs).toBeNull();
    });

    test('mobile default is 20px at 360px', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.addInitScript(() => localStorage.removeItem('devFontSize'));
      await openPage(page, p.path);
      const fs = await page.evaluate(() => document.body.style.fontSize);
      expect(fs).toBe('20px');
    });

    test('A+ increases font size', async ({ page }) => {
      await openPage(page, p.path);
      const before = parseInt(await page.evaluate(() => document.body.style.fontSize));
      await page.locator('button[onclick*="changeFontSize(1)"]').click();
      const after  = parseInt(await page.evaluate(() => document.body.style.fontSize));
      expect(after).toBe(before + 1);
    });

    test('A- decreases font size', async ({ page }) => {
      await openPage(page, p.path);
      const before = parseInt(await page.evaluate(() => document.body.style.fontSize));
      await page.locator('button[onclick*="changeFontSize(-1)"]').click();
      const after  = parseInt(await page.evaluate(() => document.body.style.fontSize));
      expect(after).toBe(before - 1);
    });

    test('font size persists to localStorage', async ({ page }) => {
      await openPage(page, p.path);
      await page.locator('button[onclick*="changeFontSize(1)"]').click();
      const stored = await page.evaluate(() => localStorage.getItem('devFontSize'));
      expect(stored).not.toBeNull();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. COMMENTS TESTS
// ─────────────────────────────────────────────────────────────────────────────
for (const p of PAGES) {
  test.describe(`Comments — ${p.name}`, () => {

    test('comments API is reachable', async ({ request }) => {
      const key = p.path.replace('/html/', '').replace('.html', '');
      const res = await request.get(`${COMMENTS_API}/api/comments?page=${key}`);
      expect([200, 201]).toContain(res.status());
    });

    test('FAB opens menu with comment option', async ({ page }) => {
      await openPage(page, p.path);
      await page.locator('#spFabBtn').click();
      await expect(page.locator('#spBtnComment')).toBeVisible();
    });

    test('comment option opens panel on comment tab', async ({ page }) => {
      await openPage(page, p.path);
      await page.locator('#spFabBtn').click();
      await page.locator('#spBtnComment').click();
      await expect(page.locator('#spPanel')).toHaveClass(/open/);
      await expect(page.locator('.sp-tab[data-t="comment"]')).toHaveClass(/on/);
    });

    test('empty submit shows error', async ({ page }) => {
      await openPage(page, p.path);
      await page.locator('#spFabBtn').click();
      await page.locator('#spBtnComment').click();
      await page.locator('#spSubmit').click();
      await expect(page.locator('#spErr .sp-err')).toBeVisible();
    });

    test('close button dismisses panel', async ({ page }) => {
      await openPage(page, p.path);
      await page.locator('#spFabBtn').click();
      await page.locator('#spBtnComment').click();
      await page.locator('#spCloseBtn').click();
      await expect(page.locator('#spPanel')).not.toHaveClass(/open/);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DONATE TESTS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Donate Panel', () => {

  test('opens on donate tab with preset amounts', async ({ page }) => {
    await openPage(page, PAGES[0].path);
    await page.locator('#spFabBtn').click();
    await page.locator('#spBtnDonate').click();
    await expect(page.locator('#spPanel')).toHaveClass(/open/);
    await expect(page.locator('.sp-tab[data-t="donate"]')).toHaveClass(/on/);
    expect(await page.locator('.sp-amt').count()).toBeGreaterThanOrEqual(4);
  });

  test('selecting preset highlights it', async ({ page }) => {
    await openPage(page, PAGES[0].path);
    await page.locator('#spFabBtn').click();
    await page.locator('#spBtnDonate').click();
    await page.locator('.sp-amt[data-v="5"]').click();
    await expect(page.locator('.sp-amt[data-v="5"]')).toHaveClass(/on/);
  });

  test('PayPal button exists', async ({ page }) => {
    await openPage(page, PAGES[0].path);
    await page.locator('#spFabBtn').click();
    await page.locator('#spBtnDonate').click();
    await expect(page.locator('#spPP')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. NAV & SEARCH TESTS
// ─────────────────────────────────────────────────────────────────────────────
for (const p of PAGES) {
  test.describe(`Nav & Search — ${p.name}`, () => {

    test('home link points to ../index.html', async ({ page }) => {
      await openPage(page, p.path);
      const href = await page.locator('a.nav-home, a[href="../index.html"]').getAttribute('href');
      expect(href).toBe('../index.html');
    });

    test('search toggles and filters', async ({ page }) => {
      await openPage(page, p.path);
      await page.locator('#searchBtn').click();
      await expect(page.locator('#searchBar')).toHaveClass(/active/);
      await page.locator('#searchInput').fill('om');
      await page.waitForTimeout(300);
      const visible = await page.locator('tbody tr:visible, .shloka:visible').count();
      expect(visible).toBeGreaterThan(0);
    });

    test('mode toggle switches theme', async ({ page }) => {
      await openPage(page, p.path);
      await page.locator('#modeBtn').click();
      expect(await page.evaluate(() => document.body.classList.contains('light-mode'))).toBe(true);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. MOBILE VIEWPORT — Samsung Flip 5 (360px)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Mobile — 360px viewport', () => {

  test('no horizontal scroll on index', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 820 });
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('font size is 20px on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 820 });
    await page.addInitScript(() => localStorage.removeItem('devFontSize'));
    await openPage(page, PAGES[0].path);
    expect(await page.evaluate(() => document.body.style.fontSize)).toBe('20px');
  });

  test('pills fit within 360px and do not overlap', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 820 });
    await openPage(page, PAGES[0].path);
    await page.locator('#audioTab').click();
    await page.locator('#scrollTab').click();
    const aBox = await page.locator('#audioPill').boundingBox();
    const sBox = await page.locator('#scrollPill').boundingBox();
    if (aBox) expect(aBox.x + aBox.width).toBeLessThanOrEqual(360);
    if (sBox) expect(sBox.x + sBox.width).toBeLessThanOrEqual(360);
    if (aBox && sBox) expect(aBox.x + aBox.width).toBeLessThanOrEqual(sBox.x + 2);
  });

  test('no horizontal scroll on content pages', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 820 });
    for (const p of PAGES) {
      await openPage(page, p.path);
      const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
    }
  });
});
