import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { WELCOME } from "../src/v2/welcome/strings";

// The welcome page (0048-add2, add3) on a preview of next (never the live link), from nothing, as a first run:
// the painting's box, each element at the board's place, the language pill between the moon and the sun in the ten
// languages at three widths, «ابدأ» once, «صفحة الترحيب» in «عن التطبيق», the picker and back, the phone's language.
// 0049: «مسلم» centred on the disc by its ink (±1 px, read from the pixels), «ابدأ» a word alone, and the brief welcome
// of a later launch of the app (the installed web app here, as the iOS app).
//   cd web && BASE_URL=… npx playwright test e2e/v2-0048-welcome.spec.ts --project=mobile --workers=2
// SHOTS=dir saves the page at 440, 393 and 375 wide in Arabic and English, and the approved board beside it.
test.skip(
  !process.env.BASE_URL || /workers\.dev/.test(process.env.BASE_URL ?? ""),
  "previews only, never the live link",
);
test.use({
  serviceWorkers: "block",
  storageState: { cookies: [], origins: [] },
});

const SHOTS = process.env.SHOTS;
const LANGS = [
  "ar",
  "en",
  "ur",
  "id",
  "ms",
  "tr",
  "fr",
  "es",
  "bn",
  "hi",
] as const;
const SIZES = [
  [440, 956],
  [393, 852],
  [375, 667],
] as const;
// The moon and the sun with its rays, in the painting (measured from welcome-B4's gold, scripts in the report).
const MOON = { x0: 0.239, x1: 0.327, y0: 0.153, y1: 0.203 };
const SUN = { x0: 0.631, x1: 0.765, y0: 0.149, y1: 0.211 };

type Box = { x: number; y: number; width: number; height: number };
const art = (page: Page) =>
  page.locator(".wl-art").boundingBox() as Promise<Box>;
/** The painting loaded (3.3 MB on the web's first visit; in the app's bundle it is local). */
const painted = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((r) => {
        const i = new Image();
        i.onload = () => r();
        i.onerror = () => r();
        i.src = "/art/welcome-B4.webp";
      }),
  );
const rel = (b: Box, a: Box) => ({
  x0: (b.x - a.x) / a.width,
  x1: (b.x + b.width - a.x) / a.width,
  y0: (b.y - a.y) / a.height,
  y1: (b.y + b.height - a.y) / a.height,
});
const apart = (p: ReturnType<typeof rel>, q: typeof MOON) =>
  p.x1 <= q.x0 || p.x0 >= q.x1 || p.y1 <= q.y0 || p.y0 >= q.y1;

test("the first run: the painting, and each element at the board's place", async ({
  page,
}) => {
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/?lang=ar");
    await expect(page.getByTestId("welcome")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await painted(page);
    const a = await art(page);
    if (w / h > 0.47) {
      // A shorter screen: whole at its height, centred, the sky's colour beside it.
      expect(Math.round(a.height)).toBe(h);
      expect(Math.abs(a.x + a.width / 2 - w / 2)).toBeLessThan(1);
    } else expect([Math.round(a.width), Math.round(a.height)]).toEqual([w, h]);
    const at = async (sel: string) =>
      rel((await page.locator(sel).boundingBox())!, a);
    const name = await at(".wl-name");
    expect(Math.abs((name.x0 + name.x1) / 2 - 0.499)).toBeLessThan(0.01);
    expect(Math.abs((name.y0 + name.y1) / 2 - 0.359)).toBeLessThan(0.01);
    expect(Math.abs((await at(".wl-tagline")).y0 - 0.51)).toBeLessThan(0.005);
    const start = await at(".wl-start");
    expect(Math.abs((start.x0 + start.x1) / 2 - 0.477)).toBeLessThan(0.005);
    expect(Math.abs(start.y0 - 0.9)).toBeLessThan(0.005);
    const pill = await at(".wl-lang-pill");
    expect(Math.abs((pill.x0 + pill.x1) / 2 - 0.5)).toBeLessThan(0.005);
    expect(Math.abs((pill.y0 + pill.y1) / 2 - 0.178)).toBeLessThan(0.005);
    const i = await at(".wl-mark-i");
    const palm = await at(".wl-mark-palm");
    expect(
      [i.x0, i.x1, palm.x0, palm.x1, i.y0, i.y1].map(
        (x) => Math.round(x * 1000) / 10,
      ),
    ).toEqual([25.8, 30.9, 64.6, 76.2, 89, 95.4]);
    // «ابدأ» between the marks, apart from both.
    expect(start.x0).toBeGreaterThan(i.x1);
    expect(start.x1).toBeLessThan(palm.x0);
    expect(
      (await page.locator(".wl-start").boundingBox())!.height,
    ).toBeGreaterThanOrEqual(44);
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.screenshot({ path: path.join(SHOTS, `welcome-ar-${w}.png`) });
    }
  }
});

test("the language pill sits between the moon and the sun, whole, in the ten languages at three widths (add3)", async ({
  page,
}) => {
  for (const lang of LANGS)
    for (const [w, h] of SIZES) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(`/?lang=${lang}`);
      await page.evaluate(() => document.fonts.ready);
      const a = await art(page);
      const pill = page.locator(".wl-lang-pill");
      const p = rel((await pill.boundingBox())!, a);
      expect(apart(p, MOON), `${lang} ${w}: the moon`).toBe(true);
      expect(apart(p, SUN), `${lang} ${w}: the sun`).toBe(true);
      expect(p.x1 - p.x0, `${lang} ${w}: at most 104/440`).toBeLessThanOrEqual(
        104 / 440 + 0.001,
      );
      // Whole: nothing of its name cut, and «ابدأ» and the tagline not cut either.
      for (const sel of [".wl-lang-pill", ".wl-start", ".wl-tagline"])
        expect(
          await page
            .locator(sel)
            .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
          `${lang} ${w} ${sel}`,
        ).toBe(true);
      await expect(page.locator(".wl-start")).toHaveText(WELCOME[lang].start);
      // «ابدأ», however long its word, stays between the two marks.
      const start = rel((await page.locator(".wl-start").boundingBox())!, a);
      expect(start.x0, `${lang} ${w}: the «i» mark`).toBeGreaterThan(0.309);
      expect(start.x1, `${lang} ${w}: the palm`).toBeLessThan(0.646);
      if (SHOTS && lang === "en") {
        await painted(page);
        await page.screenshot({
          path: path.join(SHOTS, `welcome-en-${w}.png`),
        });
      }
    }
});

// The disc's centre, measured from the painting's pixels (Welcome.tsx).
const DISC = { x: 0.4992, y: 0.3592 };
/** The drawn letters of «مسلم» alone (everything else hidden, the word in black on white), read from a screenshot. */
async function inkCentre(page: Page) {
  await page.evaluate(() => {
    const wl = document.querySelector<HTMLElement>(".wl")!;
    wl.style.background = "#fff";
    const art = document.querySelector<HTMLElement>(".wl-art")!;
    art.style.background = "none";
    for (const el of Array.from(art.children) as HTMLElement[])
      if (!el.classList.contains("wl-name")) el.style.visibility = "hidden";
    document.querySelector<HTMLElement>(".wl-name")!.style.color = "#000";
  });
  const n = (await page.locator(".wl-name").boundingBox())!;
  const clip = {
    x: Math.max(0, n.x - 40),
    y: Math.max(0, n.y - 40),
    width: n.width + 80,
    height: n.height + 80,
  };
  const png = await page.screenshot({ clip });
  const box = await page.evaluate(async (b64) => {
    const bmp = await createImageBitmap(
      await (await fetch(`data:image/png;base64,${b64}`)).blob(),
    );
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const g = c.getContext("2d")!;
    g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        if ((d[i] + d[i + 1] + d[i + 2]) / 3 < 128) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
      }
    return { w: c.width, x0, x1: x1 + 1, y0, y1: y1 + 1 };
  }, png.toString("base64"));
  const k = box.w / clip.width;
  return {
    x: clip.x + (box.x0 + box.x1) / 2 / k,
    y: clip.y + (box.y0 + box.y1) / 2 / k,
    ink: box,
  };
}

test.describe("the ink", () => {
  // The screenshot is read back in the page from a data: URL, which the app's content security policy refuses.
  test.use({ bypassCSP: true });
  test("«مسلم» by its ink on the disc's centre, within a pixel, in the ten languages at three widths (0049 أ)", async ({
    page,
  }) => {
    for (const lang of LANGS)
      for (const [w, h] of SIZES) {
        await page.setViewportSize({ width: w, height: h });
        await page.goto(`/?lang=${lang}`);
        await page.evaluate(() => document.fonts.ready);
        await painted(page);
        const a = await art(page);
        const c = await inkCentre(page);
        expect(
          Math.abs(c.x - (a.x + DISC.x * a.width)),
          `${lang} ${w}: across`,
        ).toBeLessThanOrEqual(1);
        expect(
          Math.abs(c.y - (a.y + DISC.y * a.height)),
          `${lang} ${w}: down`,
        ).toBeLessThanOrEqual(1);
      }
  });
});

test("«ابدأ» a word alone: no frame, no ground, Amiri 26/440 in gold, its box at least 44 × 44 (0049 ج)", async ({
  page,
}) => {
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/?lang=ar");
    await page.evaluate(() => document.fonts.ready);
    const a = await art(page);
    const st = await page.locator(".wl-start").evaluate((el) => {
      const c = getComputedStyle(el);
      const after = getComputedStyle(el, "::after");
      return {
        border: c.borderTopWidth,
        bg: c.backgroundColor,
        img: c.backgroundImage,
        color: c.color,
        size: parseFloat(c.fontSize),
        family: c.fontFamily,
        weight: c.fontWeight,
        after: after.content,
      };
    });
    expect(st.border).toBe("0px");
    expect(st.bg).toBe("rgba(0, 0, 0, 0)");
    expect(st.img).toBe("none");
    expect(["none", "normal"]).toContain(st.after);
    expect(st.color).toBe("rgb(241, 211, 145)");
    expect(st.family).toMatch(/Amiri/);
    expect(Number(st.weight)).toBeGreaterThanOrEqual(700);
    expect(Math.abs(st.size - (a.width * 26) / 440)).toBeLessThan(0.05);
    const b = (await page.locator(".wl-start").boundingBox())!;
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
});

test.describe("a later launch of the app (0049 ب)", () => {
  // The installed web app, as the iOS app: «ابدأ» pressed before, opened on its home.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("muslim.welcome.v1", "1");
      const mm = window.matchMedia.bind(window);
      window.matchMedia = (q: string) =>
        q === "(display-mode: standalone)"
          ? ({
              matches: true,
              media: q,
              addEventListener() {},
              removeEventListener() {},
              addListener() {},
              removeListener() {},
              onchange: null,
              dispatchEvent: () => false,
            } as MediaQueryList)
          : mm(q);
    });
  });
  test("the welcome a second and a half, without its buttons, then the home by itself", async ({
    page,
  }) => {
    await page.goto("/?lang=ar");
    const wl = page.getByTestId("welcome");
    await expect(wl).toHaveAttribute("data-mode", "brief");
    await expect(page.locator(".wl-start")).toHaveCount(0);
    await expect(page.locator(".wl-lang")).toHaveCount(0);
    await expect(page.locator(".wl-name")).toBeVisible();
    const t0 = Date.now();
    await expect(wl).toHaveCount(0, { timeout: 5000 });
    const shown = Date.now() - t0;
    expect(shown).toBeGreaterThan(1200);
    expect(shown).toBeLessThan(3000);
    await expect(page.locator("#q")).toBeVisible();
    if (SHOTS)
      await page.screenshot({
        path: path.join(SHOTS, "home-after-brief-ar.png"),
      });
  });
  test("a touch cuts it short", async ({ page }) => {
    await page.goto("/?lang=ar");
    const wl = page.getByTestId("welcome");
    await expect(wl).toHaveAttribute("data-mode", "brief");
    const t0 = Date.now();
    await wl.click({ position: { x: 30, y: 300 } });
    await expect(wl).toHaveCount(0);
    expect(Date.now() - t0).toBeLessThan(1000);
  });
  test("with reduced motion, no fade", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?lang=ar");
    await page.evaluate(() => {
      const w = window as unknown as { faded?: boolean };
      new MutationObserver(() => {
        if (document.querySelector(".wl-leaving")) w.faded = true;
      }).observe(document.body, {
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    });
    await expect(page.getByTestId("welcome")).toHaveCount(0, { timeout: 5000 });
    expect(
      await page.evaluate(
        () => (window as unknown as { faded?: boolean }).faded ?? false,
      ),
    ).toBe(false);
  });
  test("opened on another page (a widget's or a link's): that page at once, no welcome", async ({
    page,
  }) => {
    await page.goto("/today/adhkar?lang=ar&part=morning");
    await expect(page.locator(".tool-chip").first()).toBeVisible();
    await expect(page.getByTestId("welcome")).toHaveCount(0);
  });
});
test("in a browser tab, not as the app: no brief welcome after «ابدأ»", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("muslim.welcome.v1", "1"),
  );
  await page.goto("/?lang=ar");
  await expect(page.locator("#q")).toBeVisible();
  await expect(page.getByTestId("welcome")).toHaveCount(0);
});

test("«ابدأ» once: the home, and no welcome on the next run; «صفحة الترحيب» in «عن التطبيق» shows it again", async ({
  page,
}) => {
  await page.goto("/?lang=ar");
  await page.getByTestId("welcome-start").click();
  await expect(page.getByTestId("welcome")).toHaveCount(0);
  await expect(page).toHaveURL(/\/(\?lang=ar)?$/);
  await page.reload();
  await expect(page.locator("#q")).toBeVisible();
  await expect(page.getByTestId("welcome")).toHaveCount(0);
  await page.goto("/?lang=ar#about");
  await page.getByTestId("about-welcome").click();
  await expect(page.getByTestId("welcome")).toBeVisible();
  await page.getByTestId("welcome-start").click();
  await expect(page.getByTestId("welcome")).toHaveCount(0);
});

test("the pill opens the language picker, and the welcome comes back in the language chosen", async ({
  page,
}) => {
  await page.goto("/?lang=ar");
  await page.getByTestId("welcome-lang").click();
  await expect(page).toHaveURL(/\/language/);
  await expect(page.getByTestId("welcome")).toHaveCount(0);
  await page
    .getByRole("button", { name: /English/ })
    .first()
    .click();
  await expect(page.getByTestId("welcome")).toBeVisible();
  await expect(page.locator(".wl-start")).toHaveText(WELCOME.en.start);
});

test.describe("a Persian phone", () => {
  test.use({ locale: "fa-IR" });
  test("the first run: Persian content with the English interface", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("welcome")).toBeVisible();
    await expect(page.locator(".wl-start")).toHaveText(WELCOME.en.start);
    await expect(page.locator(".wl-lang-pill bdi")).toHaveAttribute(
      "lang",
      "fa",
    );
  });
});
