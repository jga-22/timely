import type { Activity, Dimension, Habit, HabitPeriod, PlannerState, WeekTemplate } from '~/types/planner'

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Editorial muted palette used by the design system */
export const DESIGN_COLORS: Array<{ id: string; bg: string; fg: string }> = [
  { id: 'terracotta', bg: '#d97757', fg: '#ffffff' },
  { id: 'ochre',      bg: '#c19a3e', fg: '#ffffff' },
  { id: 'sage',       bg: '#7a9471', fg: '#ffffff' },
  { id: 'teal',       bg: '#4a8683', fg: '#ffffff' },
  { id: 'plum',       bg: '#8a5a7a', fg: '#ffffff' },
  { id: 'slate',      bg: '#5d6b7a', fg: '#ffffff' },
  { id: 'rose',       bg: '#c4767f', fg: '#ffffff' },
  { id: 'moss',       bg: '#5c7248', fg: '#ffffff' },
  { id: 'navy',       bg: '#3c4b63', fg: '#ffffff' },
  { id: 'cream',      bg: '#d4c19a', fg: '#3a3429' },
  { id: 'brick',      bg: '#a04e3e', fg: '#ffffff' },
  { id: 'pine',       bg: '#2d5a3f', fg: '#ffffff' },
  { id: 'dusk',       bg: '#6e5c7c', fg: '#ffffff' },
  { id: 'stone',      bg: '#9a9288', fg: '#ffffff' },
  { id: 'coral',      bg: '#e09070', fg: '#ffffff' },
  { id: 'ink',        bg: '#2a2a2a', fg: '#faf9f6' },
]

/** 52 ISO week Monday start-dates for 2026 (week 1 = Dec 29 2025) */
export const WEEK_DATES_2026: string[] = (() => {
  const start = new Date(Date.UTC(2025, 11, 29))
  return Array.from({ length: 52 }, (_, i) => {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i * 7)
    return d.toISOString().slice(0, 10)
  })
})()

export const CURRENT_WEEK_INDEX = 15 // Week 16 (0-indexed 15) = Apr 13 2026

export interface TimeBlock {
  start: number
  end: number
  activityId: string
}

/** Convert a template's flat slot array to contiguous blocks for one day */
export function slotsToBlocks(slots: string[], dayIndex: number): TimeBlock[] {
  const blocks: TimeBlock[] = []
  let i = 0
  while (i < 24) {
    const actId = slots[dayIndex * 24 + i]
    if (!actId) { i++; continue }
    let j = i + 1
    while (j < 24 && slots[dayIndex * 24 + j] === actId) j++
    blocks.push({ start: i, end: j, activityId: actId })
    i = j
  }
  return blocks
}

export const formatHour = (h: number): string => {
  if (h === 0 || h === 24) return '12AM'
  if (h === 12) return '12PM'
  if (h < 12) return `${h}AM`
  return `${h - 12}PM`
}

export const PALETTE = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80',
  '#34d399', '#2dd4bf', '#38bdf8', '#60a5fa', '#818cf8',
  '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'
]

export const projectionInsight = (hours: number): string => {
  if (hours > 8000) return 'Mastery-level repetition.'
  if (hours > 4000) return 'Enough time to become highly proficient.'
  if (hours > 1000) return 'A meaningful long-term investment.'
  if (hours > 500) return 'A habit with visible compounding.'
  return 'Small, but it still adds up.'
}

export const HOURS = Array.from({ length: 24 }, (_, hour) =>
  `${String(hour).padStart(2, '0')}:00`
)

export const COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80',
  '#34d399', '#2dd4bf', '#38bdf8', '#60a5fa', '#818cf8',
  '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'
]

export const TOTAL_WEEK_HOURS = 168

export const getMondayDate = (date: Date): string => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export const addWeeks = (startDate: string, weeks: number): string => {
  const d = new Date(startDate + 'T00:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

export const formatWeekRange = (startDate: string): string => {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

export const generateWeekDates = (fromDate: string, count: number): string[] =>
  Array.from({ length: count }, (_, i) => addWeeks(fromDate, i))

export const slotCount = (granularityMinutes: 60 | 30) => (7 * 24 * 60) / granularityMinutes

export const slotDurationHours = (granularityMinutes: 60 | 30) => granularityMinutes / 60

export const createEmptySlots = (granularityMinutes: 60 | 30) =>
  Array.from({ length: slotCount(granularityMinutes) }, () => '')

export const createSeedTemplate = (): WeekTemplate => {
  const granularityMinutes = 60
  const slots = createEmptySlots(granularityMinutes)

  const fill = (day: number, startHour: number, endHour: number, activityId: string) => {
    for (let hour = startHour; hour < endHour; hour += 1) {
      const index = day * 24 + hour
      slots[index] = activityId
    }
  }

  for (let day = 0; day < 5; day += 1) {
    fill(day, 0, 7, 'sleep')
    fill(day, 8, 12, 'deep-work')
    fill(day, 13, 17, 'deep-work')
    fill(day, 18, 19, 'training')
    fill(day, 20, 22, 'family')
    fill(day, 22, 24, 'sleep')
  }

  fill(5, 0, 8, 'sleep')
  fill(5, 9, 11, 'errands')
  fill(5, 11, 13, 'family')
  fill(5, 14, 16, 'learning')
  fill(5, 17, 19, 'projects')
  fill(5, 22, 24, 'sleep')

  fill(6, 0, 8, 'sleep')
  fill(6, 9, 11, 'reading')
  fill(6, 11, 14, 'family')
  fill(6, 15, 17, 'planning')
  fill(6, 17, 19, 'projects')
  fill(6, 22, 24, 'sleep')

  return {
    id: 'standard-week',
    name: 'Standard Week',
    description: 'Balanced week: deep work, health, family, learning.',
    granularityMinutes,
    color: '#5d6b7a',
    slots
  }
}

const createDeepWorkTemplate = (): WeekTemplate => {
  const granularityMinutes = 60
  const slots = createEmptySlots(granularityMinutes)
  const fill = (day: number, s: number, e: number, id: string) => {
    for (let h = s; h < e; h++) slots[day * 24 + h] = id
  }
  for (let d = 0; d < 5; d++) {
    fill(d, 0, 7, 'sleep'); fill(d, 7, 8, 'training')
    fill(d, 8, 12, 'deep-work'); fill(d, 12, 13, 'family')
    fill(d, 13, 17, 'deep-work'); fill(d, 18, 19, 'training')
    fill(d, 19, 22, 'family'); fill(d, 23, 24, 'sleep')
  }
  fill(5, 0, 8, 'sleep'); fill(5, 8, 12, 'deep-work')
  fill(5, 12, 23, 'family'); fill(6, 0, 8, 'sleep')
  fill(6, 8, 23, 'family')
  return { id: 'deep-work-week', name: 'Deep Work Week', granularityMinutes, color: '#2a2a2a', slots }
}

const createVacationTemplate = (): WeekTemplate => {
  const granularityMinutes = 60
  const slots = createEmptySlots(granularityMinutes)
  const fill = (day: number, s: number, e: number, id: string) => {
    for (let h = s; h < e; h++) slots[day * 24 + h] = id
  }
  for (let d = 0; d < 7; d++) {
    fill(d, 0, 8, 'sleep'); fill(d, 8, 10, 'errands')
    fill(d, 10, 12, 'training'); fill(d, 12, 23, 'family')
  }
  return { id: 'vacation-week', name: 'Vacation', granularityMinutes, color: '#c19a3e', slots }
}

// Seed 52 applied weeks for 2026 (similar to the design's year assignment)
const createSeedAppliedWeeks = () => {
  const assignment = new Array(52).fill('standard-week')
  ;[5, 6, 7, 14, 15, 24, 25, 26, 37, 38, 46, 47].forEach(i => { assignment[i] = 'deep-work-week' })
  ;[12, 30, 31, 51].forEach(i => { assignment[i] = 'vacation-week' })
  ;[9, 19, 40].forEach(i => { assignment[i] = null })

  const start = new Date(Date.UTC(2025, 11, 29))
  return assignment
    .map((templateId, i) => {
      if (!templateId) return null
      const d = new Date(start)
      d.setUTCDate(start.getUTCDate() + i * 7)
      const startDate = d.toISOString().slice(0, 10)
      return { id: `seed-${i}`, startDate, templateId, status: 'normal' as const }
    })
    .filter(Boolean) as import('~/types/planner').AppliedWeek[]
}

/** Bump when the persisted shape changes; older saves are normalised on load */
export const PLANNER_STATE_VERSION = 3

const HARADA_AMBITION_ID = 'ambition-harada'

/** Seed Harada grid from the prototype: [id, name, categoryIds, goal5y, target1y, targetTbd, habits] */
const HARADA_DIMENSIONS: Array<[string, string, string[], string, string, boolean, Array<[string, number, HabitPeriod, string?, number?]>]> = [
  ['physique', 'Physique', ['health'],
    'Forme optimale, énergie stable, zéro dette de sommeil.',
    "À définir — ex. 3 séances de sport par semaine tenues sur l'année, bilan santé complet réalisé.", true, [
      ['Sport régulier (fréquence et type à fixer)', 3, 'week', 'training', 60],
      ["Alimentation structurée, pas d'improvisation", 1, 'day'],
      ['Sommeil et récupération organisés', 1, 'day'],
      ["Suivi d'indicateurs simples (poids, forme)", 1, 'week'],
      ['Check-up médical annuel', 1, 'month'],
      ['Limiter les écrans avant le coucher', 1, 'day'],
      ['Hydratation quotidienne', 1, 'day'],
      ['Étirements et mobilité', 3, 'week']
    ]],
  ['spirituelle', 'Spirituelle', [],
    'Clarté intérieure, sérénité face à la pression professionnelle.',
    'À définir — ex. 10 minutes de méditation quotidienne tenues, journal hebdomadaire régulier.', true, [
      ['Méditation régulière', 1, 'day'],
      ['Temps de réflexion / journal', 3, 'week'],
      ['Lecture inspirante', 3, 'week', 'reading', 30],
      ['Moments de silence sans écran', 1, 'day'],
      ['Clarifier ses valeurs personnelles', 1, 'month'],
      ['Gratitude quotidienne', 1, 'day'],
      ['Retraite ou temps long une fois par an', 1, 'month'],
      ['Aligner ses actions sur ses valeurs', 1, 'week']
    ]],
  ['relationnelle', 'Relationnelle & émotionnelle', ['family'],
    "Être reconnu par ma famille comme un père, un époux, un fils et un frère présent et fiable.",
    "Rituel hebdomadaire avec mon épouse et rituel mensuel individuel avec chaque enfant, tenus à 90 % sur l'année.", false, [
      ['Temps dédié à mon épouse (rituel de couple)', 1, 'week'],
      ['Temps dédié à mes enfants, individualisé', 1, 'month'],
      ['Appels et visites réguliers à mes parents', 1, 'week'],
      ['Lien actif avec mon frère / ma sœur', 1, 'week'],
      ['Rituel familial (ex. dimanche en famille)', 1, 'week'],
      ['Cercle d\'amis proches entretenu', 1, 'month'],
      ['Reconnaître, exprimer et réguler mes émotions', 1, 'day'],
      ["Résoudre les tensions rapidement, ne rien laisser traîner", 1, 'day']
    ]],
  ['economique', 'Économique', [],
    'Indépendance financière, patrimoine cible.',
    "À définir — ex. taux d'épargne cible atteint, montant précis investi sur l'année.", true, [
      ['Suivi budgétaire mensuel', 1, 'month'],
      ['Plan d\'épargne / investissement structuré', 1, 'month'],
      ['Revue patrimoniale annuelle', 1, 'month'],
      ['Diversification des revenus', 1, 'month'],
      ['Protection de la famille (assurances, prévoyance)', 1, 'month'],
      ['Objectifs chiffrés par échéance', 1, 'month'],
      ['Réduire les dépenses non alignées avec mes valeurs', 1, 'week'],
      ['Formation continue en finance personnelle', 1, 'month']
    ]],
  ['cognitive', 'Cognitive', ['learning'],
    "Rester à la pointe sur l'IA et l'architecture d'entreprise, capable de porter un projet propre.",
    "Certification IA / architecture d'entreprise obtenue et un projet personnel lancé — app de dev perso ou app d'architecture d'entreprise (arbitrage à trancher).", false, [
      ["Veille active IA / architecture d'entreprise", 3, 'week'],
      ['Trancher puis lancer le projet perso (app dev perso ou app EA)', 2, 'week'],
      ['Lecture technique régulière', 3, 'week', 'learning', 45],
      ['Formation certifiante ciblée', 2, 'week'],
      ['Expérimentation concrète (prototypes, POC perso)', 1, 'week'],
      ['Partager ses connaissances (articles, talks)', 1, 'month'],
      ['Apprendre un nouveau domaine chaque année', 1, 'month'],
      ['Remettre en question ses acquis régulièrement', 1, 'month']
    ]],
  ['sociale', 'Sociale', [],
    'Rôle actif dans une communauté professionnelle ou entrepreneuriale.',
    "À définir — ex. rejoindre une communauté active, démarrer un mentorat sur l'année.", true, [
      ['Participation active à une ou plusieurs communautés', 1, 'week'],
      ['Mentorat, aide à d\'autres', 1, 'week'],
      ['Engagement associatif ou entrepreneurial', 1, 'month'],
      ['Contribution à un collectif ou réseau', 1, 'month'],
      ['Organisation d\'événements ou de rencontres', 1, 'month'],
      ['Visibilité (contenu, prises de parole)', 1, 'week'],
      ['Entretenir le réseau existant', 1, 'week'],
      ['Nouvelles connexions qualifiées chaque trimestre', 1, 'month']
    ]],
  ['professionnelle', 'Professionnelle', ['work'],
    "Décrocher un poste de CDO ou CIO d'ici cinq ans.",
    'Occuper un rôle élargi (ex. Lead Enterprise Architect) couvrant IT et data, avec 3 initiatives stratégiques livrées et visibles du comité de direction.', false, [
      ['Networking ciblé auprès de dirigeants IT / data', 1, 'week'],
      ['Développer une posture et une communication exécutive', 1, 'week'],
      ['Missions à impact visible sur la roadmap digitale', 1, 'day'],
      ['Executive education / certification stratégique', 1, 'month'],
      ['Identifier un mentor ou un sponsor interne', 1, 'month'],
      ["Élargir le périmètre : de l'EA vers la gouvernance IT/data globale", 1, 'month'],
      ['Valoriser la valeur créée avec des résultats chiffrés', 1, 'month'],
      ['Publier des articles professionnels pour construire ma marque perso', 1, 'month']
    ]],
  ['environnement', 'Environnement', [],
    'Mode de vie durable, cohérent avec mes valeurs.',
    "À définir — ex. rituel dominical fixe tenu toute l'année, empreinte réduite sur un poste identifié.", true, [
      ['Réduire mon empreinte au quotidien', 1, 'day'],
      ['Rituels du dimanche : repos, nature, famille', 1, 'week'],
      ['Choix de consommation alignés', 1, 'day'],
      ['Optimiser le cadre de vie et de travail', 1, 'month'],
      ['Point à définir', 1, 'week'],
      ['Sensibiliser mon entourage', 1, 'month'],
      ['Bilan annuel simple de mes choix', 1, 'month'],
      ['Cohérence entre discours pro (transformation durable) et vie perso', 1, 'month']
    ]]
]

/** Harada grid seed: one 5-year ambition, 8 dimensions and their daily/weekly/monthly habits */
export const createHaradaSeed = (): Pick<PlannerState, 'ambition' | 'dimensions' | 'habits'> => {
  const habits: Habit[] = []

  const dimensions = HARADA_DIMENSIONS.map(([id, name, categoryIds, goal5y, target1y, targetTbd, items], index) => {
    items.forEach(([habitName, count, period, activityId, minutesPerOccurrence], habitIndex) => {
      habits.push({
        id: `${id}-${habitIndex + 1}`,
        dimensionId: id,
        name: habitName,
        frequency: { count, period },
        ...(activityId ? { activityId } : {}),
        ...(minutesPerOccurrence ? { minutesPerOccurrence } : {})
      })
    })

    return { id, name, ambitionId: HARADA_AMBITION_ID, order: index + 1, goal5y, target1y, targetTbd, categoryIds }
  })

  return {
    ambition: {
      id: HARADA_AMBITION_ID,
      statement: "Meilleur père, époux, fils et frère — CDO / CIO d'ici 5 ans",
      horizonYears: 5
    },
    dimensions,
    habits
  }
}

/** Categories the v2 seed wrongly linked to a dimension (v3 unlinks them) */
const V2_SEEDED_CATEGORY_IDS: Record<string, string[]> = {
  spirituelle: ['rest'],
  economique: ['work'],
  environnement: ['rest']
}

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, index) => id === b[index])

/** Only dimensions still holding the exact v2 seed are corrected; customised links are kept */
const migrateDimensionCategoryIds = (dimensions: Dimension[]): Dimension[] => {
  const seeded = new Map(createHaradaSeed().dimensions.map(dimension => [dimension.id, dimension.categoryIds]))

  return dimensions.map(dimension => {
    const legacy = V2_SEEDED_CATEGORY_IDS[dimension.id]

    if (!legacy || !sameIds(dimension.categoryIds, legacy)) {
      return dimension
    }

    return { ...dimension, categoryIds: seeded.get(dimension.id) ?? [] }
  })
}

/** Default-merge a persisted state so saves written before Harada goals still load */
export const normalizePlannerState = (raw: Partial<PlannerState>): PlannerState => {
  const isLegacy = (raw.version ?? 0) < 3
  const dimensions = raw.dimensions ?? []

  return {
    ...raw,
    version: PLANNER_STATE_VERSION,
    ambition: raw.ambition ?? null,
    dimensions: isLegacy ? migrateDimensionCategoryIds(dimensions) : dimensions,
    habits: raw.habits ?? []
  } as PlannerState
}

export const createInitialState = (): PlannerState => ({
  version: PLANNER_STATE_VERSION,
  ...createHaradaSeed(),
  settings: {
    timeGranularity: 60,
    activeTemplateId: 'standard-week',
    projectionDefaults: {
      years: 5,
      excludedWeekStatuses: ['vacation', 'off']
    }
  },
  categories: [
    { id: 'work',     name: 'Work',     color: '#3c4b63' },
    { id: 'health',   name: 'Health',   color: '#7a9471' },
    { id: 'family',   name: 'Family',   color: '#c19a3e' },
    { id: 'learning', name: 'Learning', color: '#8a5a7a' },
    { id: 'projects', name: 'Projects', color: '#a04e3e' },
    { id: 'rest',     name: 'Rest',     color: '#6e5c7c' }
  ],
  activities: [
    { id: 'deep-work', name: 'Deep Work',      shortCode: 'WRK', categoryId: 'work',     color: '#3c4b63' },
    { id: 'training',  name: 'Training',        shortCode: 'TRN', categoryId: 'health',   color: '#7a9471' },
    { id: 'family',    name: 'Family Time',     shortCode: 'FAM', categoryId: 'family',   color: '#c19a3e' },
    { id: 'learning',  name: 'Learning',        shortCode: 'LRN', categoryId: 'learning', color: '#8a5a7a' },
    { id: 'projects',  name: 'Projects',        shortCode: 'PRJ', categoryId: 'projects', color: '#a04e3e' },
    { id: 'reading',   name: 'Reading',         shortCode: 'RDG', categoryId: 'learning', color: '#6e5c7c' },
    { id: 'planning',  name: 'Weekly Planning', shortCode: 'PLN', categoryId: 'projects', color: '#c19a3e' },
    { id: 'errands',   name: 'Errands',         shortCode: 'ERR', categoryId: 'family',   color: '#d97757' },
    { id: 'sleep',     name: 'Sleep',           shortCode: 'SLP', categoryId: 'rest',     color: '#6e5c7c' }
  ],
  templates: [createSeedTemplate(), createDeepWorkTemplate(), createVacationTemplate()],
  appliedWeeks: createSeedAppliedWeeks()
})

export const getTemplateById = (state: PlannerState, templateId: string) =>
  state.templates.find(template => template.id === templateId)

export const getActiveTemplate = (state: PlannerState) =>
  state.templates.find(template => template.id === state.settings.activeTemplateId) ?? state.templates[0]

export const getActivityMap = (activities: Activity[]) =>
  new Map(activities.map(activity => [activity.id, activity]))

export const aggregateTemplate = (template: WeekTemplate, activities: Activity[]) => {
  const totals = new Map<string, number>()
  const activityMap = getActivityMap(activities)

  for (const activityId of template.slots) {
    if (!activityId) {
      continue
    }

    const activity = activityMap.get(activityId)

    if (!activity) {
      continue
    }

    totals.set(activity.id, (totals.get(activity.id) ?? 0) + slotDurationHours(template.granularityMinutes))
  }

  return totals
}

export const aggregateTemplateByCategory = (template: WeekTemplate, state: PlannerState) => {
  const activityTotals = aggregateTemplate(template, state.activities)
  const activityMap = getActivityMap(state.activities)
  const categoryTotals = new Map<string, number>()

  for (const [activityId, hours] of activityTotals) {
    const activity = activityMap.get(activityId)

    if (!activity) {
      continue
    }

    categoryTotals.set(activity.categoryId, (categoryTotals.get(activity.categoryId) ?? 0) + hours)
  }

  return categoryTotals
}

/** Habit occurrences normalised to a weekly rate (a year is approximated as 52 weeks) */
export const habitWeeklyOccurrences = (habit: Habit): number => {
  const { count, period } = habit.frequency

  if (period === 'day') return count * 7
  if (period === 'week') return count

  return (count * 12) / 52
}

/** Scheduled minutes per week for one activity, from the active template */
export const scheduledWeeklyMinutesForActivity = (state: PlannerState, activityId: string): number => {
  const template = getActiveTemplate(state)

  if (!template) {
    return 0
  }

  return (aggregateTemplate(template, state.activities).get(activityId) ?? 0) * 60
}

/** Scheduled minutes per week for one category, from the active template */
export const scheduledWeeklyMinutesForCategory = (state: PlannerState, categoryId: string): number => {
  const template = getActiveTemplate(state)

  if (!template) {
    return 0
  }

  return (aggregateTemplateByCategory(template, state).get(categoryId) ?? 0) * 60
}

export interface DimensionAlignment {
  plannedMinutesPerWeek: number
  targetMinutesPerWeek: number
  unlinkedHabits: number
  coverage: number | null
}

/** A category's minutes count once: the first dimension by order that lists it keeps it */
export const countedCategoryIdsByDimension = (dimensions: Dimension[]): Map<string, string[]> => {
  const claimed = new Set<string>()
  const counted = new Map<string, string[]>()

  for (const dimension of [...dimensions].sort((a, b) => a.order - b.order)) {
    const categoryIds = [...new Set(dimension.categoryIds)].filter(categoryId => !claimed.has(categoryId))
    categoryIds.forEach(categoryId => claimed.add(categoryId))
    counted.set(dimension.id, categoryIds)
  }

  return counted
}

/** Compares scheduled time (its counted categories) against the measurable target (its habits) */
export const dimensionAlignment = (
  dimension: Dimension,
  state: PlannerState,
  countedCategoryIds: string[]
): DimensionAlignment => {
  const habits = state.habits.filter(habit => habit.dimensionId === dimension.id)

  const plannedMinutesPerWeek = countedCategoryIds.reduce(
    (total, categoryId) => total + scheduledWeeklyMinutesForCategory(state, categoryId),
    0
  )

  const targetMinutesPerWeek = habits.reduce(
    (total, habit) => total + (habit.minutesPerOccurrence ? habitWeeklyOccurrences(habit) * habit.minutesPerOccurrence : 0),
    0
  )

  return {
    plannedMinutesPerWeek,
    targetMinutesPerWeek,
    unlinkedHabits: habits.filter(habit => !habit.activityId).length,
    coverage: targetMinutesPerWeek > 0 ? plannedMinutesPerWeek / targetMinutesPerWeek : null
  }
}

export const dimensionAlignments = (state: PlannerState): Map<string, DimensionAlignment> => {
  const counted = countedCategoryIdsByDimension(state.dimensions)

  return new Map(state.dimensions.map(dimension => [
    dimension.id,
    dimensionAlignment(dimension, state, counted.get(dimension.id) ?? [])
  ]))
}
