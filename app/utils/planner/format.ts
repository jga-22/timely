export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const formatHour = (h: number): string => {
  if (h === 0 || h === 24) return '12AM'
  if (h === 12) return '12PM'
  if (h < 12) return `${h}AM`
  return `${h - 12}PM`
}

/** "1 habit", "2 habits" */
export const countLabel = (count: number, singular: string, pluralForm: string) => `${count} ${count === 1 ? singular : pluralForm}`

/** Hours for display: one decimal at most, no trailing zero (2.5 h, 3 h) */
export const hoursLabel = (minutes: number): string => `${Math.round((minutes / 60) * 10) / 10} h`
