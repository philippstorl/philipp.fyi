import { test, expect, type Page } from '@playwright/test'

// Gating regressed twice (#115, the `@theme --animate-*` token) with every
// check green. Each case runs under both preferences, so the `reduce`
// assertions can't pass just because nothing was there to observe.
const REDUCE = {
    reducedMotion: 'reduce',
    scrollBehavior: 'auto',
    jsScrollBehavior: 'instant',
    animationsRun: false,
} as const
const NO_PREFERENCE = {
    reducedMotion: 'no-preference',
    scrollBehavior: 'smooth',
    jsScrollBehavior: 'smooth',
    animationsRun: true,
} as const

// CSS can't gate a JS scroll's explicit `behavior`, so record each call's.
async function recordScrollCalls(page: Page) {
    await page.addInitScript(() => {
        const calls: { id: string; behavior: unknown }[] = []
        Object.assign(window, { scrollCalls: calls })
        for (const method of ['scrollTo', 'scrollIntoView'] as const) {
            const original = Element.prototype[method]
            Element.prototype[method] = function (
                this: Element,
                ...args: unknown[]
            ) {
                const options = args[0]
                if (options && typeof options === 'object')
                    calls.push({
                        id: this.id,
                        behavior: (options as ScrollOptions).behavior,
                    })
                Reflect.apply(original, this, args)
            }
        }
    })
}

function scrollBehaviorsFor(page: Page, id: string) {
    return page.evaluate(
        (targetId) =>
            (
                window as unknown as {
                    scrollCalls: { id: string; behavior: unknown }[]
                }
            ).scrollCalls
                .filter((call) => call.id === targetId)
                .map((call) => call.behavior),
        id,
    )
}

for (const [preference, other] of [
    [REDUCE, NO_PREFERENCE],
    [NO_PREFERENCE, REDUCE],
] as const) {
    test.describe(`prefers-reduced-motion: ${preference.reducedMotion}`, () => {
        test.beforeEach(async ({ page }) => {
            // Config-level `reducedMotion` doesn't reach matchMedia here.
            await page.emulateMedia({
                reducedMotion: preference.reducedMotion,
            })
        })

        test('homepage CSS animations and scroll-behavior follow the preference', async ({
            page,
        }) => {
            await page.setViewportSize({ width: 393, height: 800 })
            await page.goto('/')
            await page.locator('#nav-toggle').click()
            await expect(page.locator('#mobile-nav')).toBeVisible()

            const { scrollBehavior, animationClasses, animations } =
                await page.evaluate(() => ({
                    scrollBehavior: getComputedStyle(document.documentElement)
                        .scrollBehavior,
                    // `.animate-foo` plays `@keyframes foo` by convention.
                    animationClasses: [
                        ...new Set(
                            [
                                ...document.querySelectorAll(
                                    '[class*="animate-"]',
                                ),
                            ]
                                .flatMap((el) => [...el.classList])
                                .filter((c) => c.startsWith('animate-'))
                                .map((c) => c.slice('animate-'.length)),
                        ),
                    ].sort(),
                    // Finished one-shots stay listed (their fill keeps them in
                    // effect). Shadow trees (the dev toolbar) aren't ours.
                    animations: [
                        ...new Set(
                            document
                                .getAnimations()
                                .filter(
                                    (a): a is CSSAnimation =>
                                        a instanceof CSSAnimation &&
                                        a.effect instanceof KeyframeEffect &&
                                        !!a.effect.target &&
                                        document.contains(a.effect.target),
                                )
                                .map((a) => a.animationName),
                        ),
                    ].sort(),
                }))
            expect(scrollBehavior).toBe(preference.scrollBehavior)
            expect(animationClasses.length).toBeGreaterThan(0)
            expect(animations).toEqual(
                preference.animationsRun ? animationClasses : [],
            )
        })

        // Each second step flips the preference mid-session: the check must
        // run per call, not once at startup.
        test('lightbox prev/next scroll follows the preference', async ({
            page,
        }) => {
            await recordScrollCalls(page)
            await page.goto('/work/voices-conference-website/')
            await page.locator('.prose figure img').first().click()
            await expect(page.locator('#lightbox')).toBeVisible()

            await page.locator('#lightbox-next').click()
            await page.emulateMedia({ reducedMotion: other.reducedMotion })
            await page.locator('#lightbox-next').click()

            // First call is the always-instant open jump.
            await expect
                .poll(() => scrollBehaviorsFor(page, 'lightbox-track'))
                .toEqual([
                    'instant',
                    preference.jsScrollBehavior,
                    other.jsScrollBehavior,
                ])
        })

        test('contact form error-focus scroll follows the preference', async ({
            page,
        }) => {
            await recordScrollCalls(page)
            await page.goto('/contact/')
            // A pre-hydration click would fall through to a native submit.
            await page.waitForFunction(() => {
                const button = document.querySelector(
                    'form[name="contact"] button[type="submit"]',
                )
                return (
                    !!button &&
                    Object.keys(button).some((key) =>
                        key.startsWith('__reactProps'),
                    )
                )
            })
            const submit = page.locator(
                'form[name="contact"] button[type="submit"]',
            )

            await submit.click()
            await expect(page.locator('#contact-name')).toBeFocused()
            await page.emulateMedia({ reducedMotion: other.reducedMotion })
            await submit.click()
            await expect(page.locator('#contact-name')).toBeFocused()

            await expect
                .poll(() => scrollBehaviorsFor(page, 'contact-name'))
                .toEqual([preference.jsScrollBehavior, other.jsScrollBehavior])
        })
    })
}
