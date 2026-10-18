import { test, expect, type Page } from '@playwright/test';

const sections = ['sobre-mi', 'experiencia', 'proyectos', 'contacto'];

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

async function targetReached(page: Page, id: string) {
  await expect(page.locator(`#${id}`)).toBeInViewport();
  let lastMetrics: unknown;
  try {
    await expect.poll(async () => {
      const metrics = await page.evaluate((target) => {
    const top = document.getElementById(target)!.getBoundingClientRect().top;
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const requestedScroll = scrollY + top - padding;
    const expectedScroll = Math.max(0, Math.min(maxScroll, requestedScroll));
    const content = document.getElementById(target)!;
    const heading = content.querySelector('h1, h2') ?? content.querySelector('a')!;
    const rect = heading.getBoundingClientRect();
    const headerBottom = document.querySelector('header')!.getBoundingClientRect().bottom;
    return { target, url: location.href, top, padding, scroll: scrollY, maxScroll, requestedScroll, expectedScroll,
      headingTop: rect.top, headingBottom: rect.bottom, headerBottom,
      aligned: Math.abs(scrollY - expectedScroll) < 3,
      readable: innerWidth < 1024 || (rect.top >= headerBottom - 1 && rect.bottom <= innerHeight) };
      }, id);
      lastMetrics = metrics;
      return metrics.aligned && metrics.readable;
    }, { message: `Anchor #${id} must reach its document-bounded scroll destination with readable content` }).toBe(true);
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : error}\nLast anchor geometry: ${JSON.stringify(lastMetrics)}`);
  }
}

async function progressMatchesGeometry(page: Page, reduced = false) {
  await expect.poll(() => page.evaluate((reduce) => {
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    const bar = document.querySelector('[data-page-progress]')!.getBoundingClientRect();
    const rail = document.querySelector('page-scroll-progress')!.getBoundingClientRect();
    const expected = clamp(scrollY / (document.documentElement.scrollHeight - innerHeight));
    const markers = [...document.querySelectorAll('[data-timeline-marker]')].map(el => {
      const rect = el.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
    const track = document.querySelector('.timeline-track')!.getBoundingClientRect();
    const fill = document.querySelector('[data-timeline-progress]')!.getBoundingClientRect();
    const timeline = reduce ? 1 : clamp((innerHeight * .65 - markers[0]) / (markers.at(-1)! - markers[0]));
    return Math.abs(bar.width / rail.width - expected) < .015
      && Math.abs(fill.height / track.height - timeline) < .015
      && Math.abs(track.top - markers[0]) < 2
      && Math.abs(track.bottom - markers.at(-1)!) < 2;
  }, reduced)).toBe(true);
}

// Browser errors and failed same-origin resources fail every scenario, not just initial load.
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => {
    if (response.url().startsWith('http://127.0.0.1:4173') && response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', request => {
    if (request.url().startsWith('http://127.0.0.1:4173')) errors.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  (page as Page & { browserErrors: string[] }).browserErrors = errors;
});
test.afterEach(async ({ page }) => {
  expect((page as Page & { browserErrors: string[] }).browserErrors).toEqual([]);
});

test('essential content and local assets load without overflow', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alexis Varela Muñoz');
  await expect(page.getByRole('heading', { name: 'Desarrollador de Software | Backend Python y Full Stack', exact: true })).toBeVisible();
  for (const id of sections) await expect(page.locator(`#${id}`)).toBeAttached();
  await expect(page.locator('#experiencia')).toContainText('Signum-BI');
  await expect(page.locator('#proyectos')).toContainText('Nexus Gym');
  await expect(page.locator('#contacto')).toContainText('alexisfabian1230@gmail.com');
  await expect.poll(() => page.locator('img').evaluateAll(images => images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  const theme = await page.evaluate(() => {
    const luminance = (rgb: number[]) => rgb.reduce((sum, channel, index) => {
      const value = channel / 255;
      return sum + [.2126, .7152, .0722][index] * (value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    }, 0);
    // Conservative brighter bound includes the surface, static grid and green glow.
    const background = luminance([24, 44, 32]);
    const contrast = [...document.querySelectorAll('p, time, h1, h2, h3, a, button, article li span')]
      .filter(element => element.getClientRects().length)
      .map(element => {
        const color = getComputedStyle(element).color;
        const channels = color.match(/[\d.]+/g)?.map(Number) ?? [];
        return { text: element.textContent?.trim(), color,
          ratio: channels.length === 3 ? (luminance(channels) + .05) / (background + .05) : 0 };
      });
    return {
      canvas: getComputedStyle(document.documentElement).backgroundColor,
      grid: getComputedStyle(document.body).backgroundImage,
      bodyFont: getComputedStyle(document.body).fontFamily,
      headingFont: getComputedStyle(document.querySelector('h1')!).fontFamily,
      contrast,
    };
  });
  expect(theme.canvas).toBe('rgb(8, 13, 10)');
  expect(theme.grid).toContain('linear-gradient');
  expect(theme.grid).toContain('radial-gradient');
  expect(theme.bodyFont).toContain('Onest');
  expect(theme.headingFont).toContain('monospace');
  expect(theme.contrast.length).toBeGreaterThan(0);
  expect(theme.contrast.filter(sample => sample.ratio < 4.5), 'Normal text contrast against the conservative background bound').toEqual([]);
  await noOverflow(page);
});

test('navigation works repeatedly, by keyboard, and through direct anchors and reloads', async ({ page }, info) => {
  await page.goto('/');
  const mobile = info.project.name === 'mobile';
  const toggle = page.getByRole('button', { name: 'Menú principal' });
  if (mobile) {
    for (let repeat = 0; repeat < 2; repeat++) {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await toggle.focus();
      await page.keyboard.press('Space');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('#mobile-menu')).toBeHidden();
    }
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#mobile-menu')).toBeVisible();
  }
  const nav = mobile ? page.locator('#mobile-menu') : page.locator('header nav');
  for (const id of [...sections, ...sections.slice().reverse()]) {
    if (mobile && !(await page.locator('#mobile-menu').isVisible())) await toggle.click();
    const link = nav.locator(`a[href="/#${id}"]`);
    // Focus is test setup, not a second competing smooth-scroll request from the sticky header.
    await link.evaluate(element => (element as HTMLElement).focus({ preventScroll: true }));
    await expect(link).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await targetReached(page, id);
    await noOverflow(page);
  }
  await nav.locator('a[href="/"]').click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  for (const id of sections) {
    await page.goto(`/#${id}`);
    await targetReached(page, id);
    await page.reload();
    await targetReached(page, id);
  }
});

test('both progress lines follow actual geometry in both directions, after reload, resize and reduced motion', async ({ page }) => {
  await page.goto('/');
  await progressMatchesGeometry(page);
  // Exercise the timeline itself, not only fractions of the much longer page.
  for (const fraction of [0, .5, 1, .5, 0]) {
    await page.evaluate(f => {
      const markers = [...document.querySelectorAll('[data-timeline-marker]')].map(el => {
        const rect = el.getBoundingClientRect();
        return scrollY + rect.top + rect.height / 2;
      });
      scrollTo({ top: markers[0] + (markers.at(-1)! - markers[0]) * f - innerHeight * .65, behavior: 'instant' });
    }, fraction);
    await progressMatchesGeometry(page);
  }
  for (const fraction of [1, .5, 0]) {
    await page.evaluate(f => scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * f, behavior: 'instant' }), fraction);
    await progressMatchesGeometry(page);
  }
  await page.goto('/#experiencia');
  await progressMatchesGeometry(page);
  await page.reload();
  await progressMatchesGeometry(page); // No assumption about browser scroll restoration.
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: viewport.width, height: viewport.height - 180 });
  await progressMatchesGeometry(page);
  await noOverflow(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await progressMatchesGeometry(page, true);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await progressMatchesGeometry(page, true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await progressMatchesGeometry(page);
});

test('every non-navigation link activates its owned destination without live third parties', async ({ page, context }) => {
  const external = [
    'https://linkedin.com/in/alexisfabianvarela',
    'https://github.com/AlexisVarela2811',
    'https://www.linkedin.com/in/alexisfabianvarela/details/experience/',
    'https://www.linkedin.com/in/alexisfabianvarela/details/experience/',
    'https://github.com/AlexisVarela2811/Portafolio-De-Titulo',
    'https://github.com/AlexisVarela2811/CloudLocal',
  ];
  await context.route(/^https?:\/\/(?!127\.0\.0\.1:4173(?:\/|$))/, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Intercepted destination</title><p>Local test response</p>' }));
  await page.goto('/');
  const links = page.locator('a[href^="https://"]');
  expect(await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))).toEqual(external);
  for (let index = 0; index < external.length; index++) {
    await expect(links.nth(index)).toHaveAttribute('target', '_blank');
    const popupPromise = page.waitForEvent('popup');
    await links.nth(index).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(external[index]);
    await expect(popup).toHaveTitle('Intercepted destination');
    await popup.close();
  }
  // Observe the real trusted click's uncancelled intended action, then prevent OS app launch.
  await page.evaluate(() => {
    document.addEventListener('click', event => {
      const link = (event.target as Element).closest('a');
      if (link && /^(mailto:|tel:)/.test(link.getAttribute('href') ?? '')) {
        link.dataset.intendedAction = `${event.isTrusted}:${!event.defaultPrevented}:${link.getAttribute('href')}`;
        event.preventDefault();
      }
    });
  });
  for (const [scheme, destination, count] of [
    ['mailto:', 'mailto:alexisfabian1230@gmail.com', 2],
    ['tel:', 'tel:+56961505796', 1],
  ] as const) {
    const contacts = page.locator(`a[href^="${scheme}"]`);
    await expect(contacts).toHaveCount(count);
    for (const contact of await contacts.all()) {
      await expect(contact).toHaveAttribute('href', destination);
      await contact.click();
      await expect(contact).toHaveAttribute('data-intended-action', `true:true:${destination}`);
    }
  }
  await page.locator('footer a[href="#"]').click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  // Pin the control inventory so new untested interactive elements cannot silently slip in.
  await expect(page.locator('button')).toHaveCount(1);
  await expect(page.locator('a')).toHaveCount(20);
});
