/**
 * The inline script in the head (nuxt.config.ts) that sets the theme, motion and part of the day on <html> before the
 * first paint, so a dark or calm user never sees a flash. The text is built from PREF_KEYS and PART_START_HOUR, so it
 * cannot drift from them; tests/unit/prepaint.test.ts runs it against a fake storage, media query, document and clock.
 * It runs once, with the nonce that server/plugins/security.ts gives every <script> (no new script, no CSP change).
 */
import { PART_START_HOUR } from './motion'
import { PREF_KEYS } from './prefs'

export const PREPAINT_SCRIPT = [
  '(function(){try{',
  'var d=document.documentElement,s=localStorage;',
  `if(s.getItem(${JSON.stringify(PREF_KEYS.dark)})==='true')d.setAttribute('data-theme','dark');`,
  `var choice=s.getItem(${JSON.stringify(PREF_KEYS.motion)})==='calm'?'calm':'lively';`,
  `var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;`,
  `d.setAttribute('data-choice',choice);`,
  `d.setAttribute('data-motion',reduce||choice==='calm'?'calm':'lively');`,
  `var h=new Date().getHours();`,
  `d.setAttribute('data-part',h>=${PART_START_HOUR.evening}||h<${PART_START_HOUR.morning}?'evening':h>=${PART_START_HOUR.afternoon}?'afternoon':'morning');`,
  '}catch(e){}})();',
].join('')
