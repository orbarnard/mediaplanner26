import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  calculateWindowDate,
  calculateFlightLength,
  generateFlightWeeks,
} from '@/lib/calculations'
import { SectionType } from '@prisma/client'

const DEFAULT_SECTIONS: Array<{ name: string; type: SectionType; sortOrder: number }> = [
  { name: 'Broadcast TV English', type: 'BROADCAST_TV', sortOrder: 0 },
  { name: 'Spanish-Language TV', type: 'SPANISH_TV', sortOrder: 1 },
  { name: 'Cable', type: 'CABLE', sortOrder: 2 },
  { name: 'Radio', type: 'RADIO', sortOrder: 3 },
  { name: 'Digital/OTT', type: 'DIGITAL_OTT', sortOrder: 4 },
  { name: 'Display', type: 'DISPLAY', sortOrder: 5 },
  { name: 'Streaming', type: 'STREAMING', sortOrder: 6 },
]

/**
 * GET /api/plans — List all plans
 */
export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      include: {
        markets: true,
        sections: true,
        flightWeeks: {
          orderBy: { weekNumber: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(plans)
  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/plans — Create a new plan
 *
 * Body: {
 *   clientName, clientType, electionType,
 *   startDate, endDate, commissionPct?,
 *   markets?: Array<{ name: string }>
 * }
 *
 * Auto-generates: windowDate, flightLengthDays, flightLengthWeeks,
 * FlightWeek records, and default MediaSection records.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      clientName,
      clientType,
      electionType,
      startDate: startDateStr,
      endDate: endDateStr,
      commissionPct = 0.15,
      markets = [],
    } = body

    // Validate required fields
    if (!clientName || !clientType || !electionType || !startDateStr || !endDateStr) {
      return NextResponse.json(
        { error: 'Missing required fields: clientName, clientType, electionType, startDate, endDate' },
        { status: 400 }
      )
    }

    const startDate = new Date(startDateStr)
    const endDate = new Date(endDateStr)

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'endDate must be after startDate' },
        { status: 400 }
      )
    }

    // Auto-calculate derived fields
    const windowDate = calculateWindowDate(endDate)
    const flightLength = calculateFlightLength(startDate, endDate)
    const flightWeeks = generateFlightWeeks(startDate, endDate)

    // Create plan with all related records in a transaction
    const plan = await prisma.$transaction(async (tx) => {
      const newPlan = await tx.plan.create({
        data: {
          clientName,
          clientType,
          electionType,
          startDate,
          endDate,
          windowDate,
          flightLengthDays: flightLength.days,
          flightLengthWeeks: flightLength.weeks,
          commissionPct,
          // Create markets
          markets: {
            create: markets.map((m: { name: string }, index: number) => ({
              name: m.name,
              sortOrder: index,
            })),
          },
          // Create default media sections
          sections: {
            create: DEFAULT_SECTIONS.map((s) => ({
              name: s.name,
              type: s.type,
              sortOrder: s.sortOrder,
            })),
          },
          // Create flight weeks
          flightWeeks: {
            create: flightWeeks.map((fw) => ({
              weekNumber: fw.weekNumber,
              startDate: fw.startDate,
              endDate: fw.endDate,
              label: fw.label,
            })),
          },
        },
        include: {
          markets: { orderBy: { sortOrder: 'asc' } },
          sections: { orderBy: { sortOrder: 'asc' } },
          flightWeeks: { orderBy: { weekNumber: 'desc' } },
        },
      })

      return newPlan
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    console.error('Error creating plan:', error)
    return NextResponse.json(
      { error: 'Failed to create plan' },
      { status: 500 }
    )
  }
}
