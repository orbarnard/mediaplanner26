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
 * Quick creation: only clientName required. Everything else has sensible defaults.
 * Dates default to a 12-week general election flight ending Nov 3, 2026.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      clientName,
      clientType = 'CANDIDATE',
      electionType = 'GENERAL',
      startDate: startDateStr,
      endDate: endDateStr,
      commissionPct = 0.15,
      markets = [],
    } = body

    if (!clientName) {
      return NextResponse.json(
        { error: 'clientName is required' },
        { status: 400 }
      )
    }

    // Default to 12-week flight ending Nov 3, 2026 if no dates provided
    const endDate = endDateStr ? new Date(endDateStr) : new Date('2026-11-03')
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(new Date(endDate).setDate(endDate.getDate() - 84)) // 12 weeks back

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'endDate must be after startDate' },
        { status: 400 }
      )
    }

    const windowDate = calculateWindowDate(endDate)
    const flightLength = calculateFlightLength(startDate, endDate)
    const flightWeeks = generateFlightWeeks(startDate, endDate)

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
          markets: {
            create: markets.map((m: { name: string }, index: number) => ({
              name: m.name,
              sortOrder: index,
            })),
          },
          sections: {
            create: DEFAULT_SECTIONS.map((s) => ({
              name: s.name,
              type: s.type,
              sortOrder: s.sortOrder,
            })),
          },
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
