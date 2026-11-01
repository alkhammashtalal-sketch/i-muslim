import type { Page } from '@playwright/test'

// The app shows the welcome page on every launch on its home (Talal, 1 November 12:31, add-on 0072-add62 §1). The specs
// that run the build as the iOS/Android app (a faked Capacitor platform) are about what lies behind it: whenever the
// page is up, «ابدأ» is pressed, as the reader does, before the test's next action or assertion.
export const pastWelcome = (page: Page) => page.addLocatorHandler(page.getByTestId('welcome-start'), (start) => start.click())
