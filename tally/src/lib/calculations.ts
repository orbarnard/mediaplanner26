/**
 * Core business logic calculations for Tally media planning.
 * All formulas match the existing Excel template exactly.
 */

/**
 * Calculate the window date (endDate - 45 days).
 * The window date marks the start of the political advertising window.
 */
export function calculateWindowDate(endDate: Date): Date {
  const windowDate = new Date(endDate)
  windowDate.setDate(windowDate.getDate() - 45)
  return windowDate
}

/**
 * Calculate flight length in days and weeks.
 * Returns both raw numbers and a formatted label like "63 D / 9 W".
 */
export function calculateFlightLength(
  startDate: Date,
  endDate: Date
): { days: number; weeks: number; label: string } {
  const msPerDay = 1000 * 60 * 60 * 24
  const days = Math.round(
    (endDate.getTime() - startDate.getTime()) / msPerDay
  )
  const weeks = Math.ceil(days / 7)
  return {
    days,
    weeks,
    label: `${days} D / ${weeks} W`,
  }
}

/**
 * Generate flight week records for a plan.
 *
 * Week numbering counts backwards from election day:
 *   Week 1 = the final week before (and including) election day
 *   Week 2 = one week before that, etc.
 *
 * Each week runs Monday through Sunday.
 * The last week's endDate is the Sunday on or after the plan endDate.
 */
export function generateFlightWeeks(
  startDate: Date,
  endDate: Date
): Array<{
  weekNumber: number
  startDate: Date
  endDate: Date
  label: string
}> {
  const weeks: Array<{
    weekNumber: number
    startDate: Date
    endDate: Date
    label: string
  }> = []

  // Find the Monday on or before endDate to anchor Week 1
  const electionDate = new Date(endDate)
  const electionDay = electionDate.getDay() // 0=Sun, 1=Mon, ...
  // Find the Monday of the week containing electionDate
  const lastMonday = new Date(electionDate)
  const daysToSubtract = electionDay === 0 ? 6 : electionDay - 1
  lastMonday.setDate(lastMonday.getDate() - daysToSubtract)

  // Find the Monday on or before startDate
  const planStart = new Date(startDate)
  const startDay = planStart.getDay()
  const startDaysToSubtract = startDay === 0 ? 6 : startDay - 1
  const firstMonday = new Date(planStart)
  firstMonday.setDate(firstMonday.getDate() - startDaysToSubtract)

  // Generate weeks from lastMonday backwards to firstMonday
  const currentMonday = new Date(lastMonday)

  // Collect all week start dates first, going backwards
  const mondayDates: Date[] = []
  while (currentMonday >= firstMonday) {
    mondayDates.push(new Date(currentMonday))
    currentMonday.setDate(currentMonday.getDate() - 7)
  }

  // Build weeks in chronological order but with week numbers counting backwards
  for (let i = 0; i < mondayDates.length; i++) {
    const monday = mondayDates[i]
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)

    weeks.push({
      weekNumber: i + 1, // Week 1 = last week (closest to election)
      startDate: monday,
      endDate: sunday,
      label: formatWeekLabel(monday, sunday),
    })
  }

  // Sort chronologically for display (earliest first), but weekNumber 1 = last week
  weeks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  return weeks
}

/**
 * Format a week label like "Oct 27 - Nov 3".
 */
function formatWeekLabel(start: Date, end: Date): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  const startMonth = months[start.getMonth()]
  const endMonth = months[end.getMonth()]

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}`
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`
}

/**
 * Determine the CPP tier for a given flight week based on its date.
 *
 * Tiers:
 *   Q3_OOW    = before the 45-day window (windowDate)
 *   Q3_IW     = within the window but before Q4 (Oct 1)
 *   EARLY_Q4  = Oct 1 through ~2 weeks before election
 *   LATE_Q4   = final 2 weeks before election
 */
export function getCppTier(
  weekStartDate: Date,
  windowDate: Date,
  endDate: Date
): 'Q3_OOW' | 'Q3_IW' | 'EARLY_Q4' | 'LATE_Q4' {
  // Late Q4: final 2 weeks before election (14 days before endDate)
  const lateQ4Start = new Date(endDate)
  lateQ4Start.setDate(lateQ4Start.getDate() - 14)

  // Q4 starts October 1 of the election year
  const q4Start = new Date(endDate.getFullYear(), 9, 1) // October 1

  if (weekStartDate >= lateQ4Start) {
    return 'LATE_Q4'
  }
  if (weekStartDate >= q4Start) {
    return 'EARLY_Q4'
  }
  if (weekStartDate >= windowDate) {
    return 'Q3_IW'
  }
  return 'Q3_OOW'
}

/**
 * Calculate broadcast/cable cost from GRP points and CPP.
 * Formula: points * CPP
 */
export function calculateCppCost(points: number, cpp: number): number {
  return points * cpp
}

/**
 * Calculate digital cost from impressions and CPM.
 * Formula: (impressions / 1000) * CPM
 */
export function calculateDigitalCost(
  impressions: number,
  cpm: number
): number {
  return (impressions / 1000) * cpm
}

/**
 * Calculate the gross-to-cut amount when ad serving is enabled.
 * This determines the media spend portion after removing ad serving costs.
 * Formula: budget / (1 + servingCpm / mediaCpm)
 */
export function calculateGrossToCut(
  budget: number,
  servingCpm: number,
  mediaCpm: number
): number {
  if (mediaCpm === 0) return 0
  return budget / (1 + servingCpm / mediaCpm)
}

/**
 * Calculate the client-facing gross cost including commission.
 * Formula: netCost / (1 - commissionPct)
 * Default commission is 15% (0.15).
 */
export function calculateClientGross(
  netCost: number,
  commissionPct: number = 0.15
): number {
  if (commissionPct >= 1) return 0
  return netCost / (1 - commissionPct)
}
