import { describe, expect, it } from 'vitest'
import { accountInitials, avatarLabel, needsSaveAttention, saveLabel } from '~/utils/account'

describe('accountInitials', () => {
  it('takes the first and the last word of the name', () => {
    expect(accountInitials('Juan Carlos Galvis', 'x@y.z')).toBe('JG')
    expect(accountInitials('ada lovelace', 'x@y.z')).toBe('AL')
  })

  it('takes one letter for a one-word name, uppercase', () => {
    expect(accountInitials('ada', 'x@y.z')).toBe('A')
  })

  it('falls back to the first two parts of the email when there is no name', () => {
    expect(accountInitials('', 'js.galvis22@gmail.com')).toBe('JG')
    expect(accountInitials('', 'jsgal@gmail.com')).toBe('J')
  })

  it('gives nothing when neither the name nor the email has a letter', () => {
    expect(accountInitials('', '12@x.y')).toBe('')
  })
})

describe('save status', () => {
  it('words the status line, and nothing for the local mode', () => {
    expect(saveLabel('loading')).toBe('Loading...')
    expect(saveLabel('saving')).toBe('Saving...')
    expect(saveLabel('saved')).toBe('Saved')
    expect(saveLabel('error')).toBe('Not saved')
    expect(saveLabel('local')).toBe('')
  })

  it('shows the avatar dot only while saving or not saved', () => {
    expect(needsSaveAttention('saving')).toBe(true)
    expect(needsSaveAttention('error')).toBe(true)
    expect(needsSaveAttention('saved')).toBe(false)
    expect(needsSaveAttention('loading')).toBe(false)
    expect(needsSaveAttention('local')).toBe(false)
  })
})

describe('avatarLabel', () => {
  it('names the account and the save state that needs attention', () => {
    expect(avatarLabel(undefined, 'local')).toBe('Account menu')
    expect(avatarLabel('Juan Galvis', 'saved')).toBe('Account menu, Juan Galvis')
    expect(avatarLabel('Juan Galvis', 'saving')).toBe('Account menu, Juan Galvis, saving')
    expect(avatarLabel('', 'error')).toBe('Account menu, not saved')
  })
})
