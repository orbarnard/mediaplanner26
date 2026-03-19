import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  calculateWindowDate,
  calculateFlightLength,
  generateFlightWeeks,
} from '@/lib/calculations'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/plans/[id] — Get a single plan with all relations
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        markets: { orderBy: { sortOrder: 'asc' } },
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lineItems: {
              orderBy: { sortOrder: 'asc' },
              include: {
                weekValues: {
                  include: { flightWeek: true },
                },
                market: true,
              },
            },
          },
        },
        flightWeeks: { orderBy: { weekNumber: 'desc' } },
        shareTokens: true,
      },
    })

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error fetching plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch plan' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/plans/[id] — Update a plan
 *
 * If startDate or endDate change, recalculates windowDate,
 * flightLengthDays, flightLengthWeeks, and regenerates flight weeks.
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    const existing = await prisma.plan.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    // Copy simple updatable fields
    const simpleFields = [
      'clientName', 'clientType', 'electionType',
      'isElectionWeek', 'commissionPct', 'status',
    ] as const
    for (const field of simpleFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // If dates changed, recalculate derived fields and regenerate flight weeks
    const startDate = body.startDate ? new Date(body.startDate) : existing.startDate
    const endDate = body.endDate ? new Date(body.endDate) : existing.endDate
    const datesChanged = body.startDate || body.endDate

    if (datesChanged) {
      const windowDate = calculateWindowDate(endDate)
      const flightLength = calculateFlightLength(startDate, endDate)

      updateData.startDate = startDate
      updateData.endDate = endDate
      updateData.windowDate = windowDate
      updateData.flightLengthDays = flightLength.days
      updateData.flightLengthWeeks = flightLength.weeks
    }

    const plan = await prisma.$transaction(async (tx) => {
      // If dates changed, delete old flight weeks and recreate
      if (datesChanged) {
        await tx.flightWeek.deleteMany({ where: { planId: id } })

        const newWeeks = generateFlightWeeks(startDate, endDate)
        await tx.flightWeek.createMany({
          data: newWeeks.map((fw) => ({
            planId: id,
            weekNumber: fw.weekNumber,
            startDate: fw.startDate,
            endDate: fw.endDate,
            label: fw.label,
          })),
        })
      }

      const updated = await tx.plan.update({
        where: { id },
        data: updateData,
        include: {
          markets: { orderBy: { sortOrder: 'asc' } },
          sections: {
            orderBy: { sortOrder: 'asc' },
            include: {
              lineItems: {
                orderBy: { sortOrder: 'asc' },
                include: { weekValues: true },
              },
            },
          },
          flightWeeks: { orderBy: { weekNumber: 'desc' } },
        },
      })

      return updated
    })

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error updating plan:', error)
    return NextResponse.json(
      { error: 'Failed to update plan' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/plans/[id] — Delete a plan and all related records
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const existing = await prisma.plan.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      )
    }

    await prisma.plan.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting plan:', error)
    return NextResponse.json(
      { error: 'Failed to delete plan' },
      { status: 500 }
    )
  }
}
