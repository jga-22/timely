/**
 * Operator details for the Terms of Use (app/pages/terms.vue) and the Privacy Policy (app/pages/privacy.vue).
 *
 * OWNER: replace every value in [brackets] before sharing Timely more widely. The brackets are printed
 * on the pages on purpose, so an unfilled detail cannot pass unnoticed. Then check the wording itself.
 */
export const legal = {
  /** Who runs Timely (an individual, not a company) */
  operatorName: '[your name]',
  /** Where data requests, deletion requests and complaints go */
  contactEmail: '[your contact email]',
  /** Country the operator lives in; shown in the Terms */
  country: '[your country]',
  /** Region of the Supabase project that stores accounts and planner rows */
  supabaseRegion: '[Supabase project region, e.g. Frankfurt (eu-central-1)]',
  /** Law that governs the Terms, and where disputes go */
  governingLaw: '[the law of your country, and its courts]',
  /** ISO date of the last change to either document */
  lastUpdated: '2026-10-27'
} as const

/** Routes that render outside the signed-in app, so they also work from the sign-in gate (Supabase mode) */
export const LEGAL_ROUTES: readonly string[] = ['/terms', '/privacy']

/** "27 October 2026", formatted in UTC so server and browser print the same date */
export const formatLegalDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
