import type { StorageStatusState } from '~/utils/storage/types'

/** The first letter of a word (any alphabet), or '' when the word has none */
const initialOf = (word: string): string => Array.from(word).find((char) => /\p{L}/u.test(char)) ?? ''

/**
 * Initials for the account avatar (topbar). From the name: the first letter of the first and the last word (one word
 * gives one letter). Without a name, from the email's local part: the first letter of its first two parts, split on
 * dots, underscores or dashes. Two letters at most, uppercase. Returns '' when neither gives a letter; the avatar then
 * shows a person glyph instead.
 */
export const accountInitials = (name: string, email: string): string => {
  const words = name.split(/\s+/).map(initialOf).filter(Boolean)
  const parts = (email.split('@')[0] ?? '').split(/[._-]+/).map(initialOf).filter(Boolean)
  const letters = words.length > 1 ? [words[0], words[words.length - 1]!] : words.length ? words : parts.slice(0, 2)
  return Array.from(letters.join('').toLocaleUpperCase()).slice(0, 2).join('')
}

/** The words of the save status line in the Account menu; the local mode shows no status line */
const SAVE_LABELS: Partial<Record<StorageStatusState, string>> = { loading: 'Loading...', saving: 'Saving...', saved: 'Saved', error: 'Not saved' }

/** The save status line text, '' for the local mode (the menu shows no line then) */
export const saveLabel = (state: StorageStatusState): string => SAVE_LABELS[state] ?? ''

/** Saving and not saved get a dot on the avatar; saved, loading and local show none (the menu says it in text) */
export const needsSaveAttention = (state: StorageStatusState): boolean => state === 'saving' || state === 'error'

/** The avatar's accessible name: the account (when signed in) and the save state when it needs attention */
export const avatarLabel = (who: string | undefined, state: StorageStatusState): string => {
  const save = state === 'error' ? ', not saved' : state === 'saving' ? ', saving' : ''
  return `Account menu${who ? `, ${who}` : ''}${save}`
}
