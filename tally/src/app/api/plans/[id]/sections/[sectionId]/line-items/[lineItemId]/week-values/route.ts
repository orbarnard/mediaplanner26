import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string; sectionId: string; lineItemId: string }>
}

interface WeekValueUpdate {
  flightWeekId: string
  plannedPoints?: number | null
  plannedImpressions?: number | null
  plannedCost?: number
  actualPoints?: number | null
  actualImpressions?: number | null
  actualCost?: number | null
}

/**
 * PUT /api/plans/[id]/sections/[sectionId]/line-items/[lineItemId]/week-values
 *
 * Batch update week values for a line item.
 *
 * Body: {
 *   weekValues: Array<{
 *     flightWeekId: string,
 *     plannedPoints?, plannedImpressions?, plannedCost?,
 *     actualPoints?, actualImpressions?, actualCost?
 *   }>
 * }
 *
 * Uses upsert so values are created if they don't exist yet.
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id, sectionId, lineItemId } = await context.params
    const body = await request.json()

    // Verify the line item exists and belongs to the correct section/plan
    const lineItem = await prisma.lineItem.findFirst({
      where: {
        id: lineItemId,
        sectionId,
        section: { planId: id },
      },
    })

    if (!lineItem) {
      return NextResponse.json(
        { error: 'Line item not found in this section/plan' },
        { status: 404 }
      )
    }

    const { weekValues } = body as { weekValues: WeekValueUpdate[] }

    if (!Array.isArray(weekValues) || weekValues.length === 0) {
      return NextResponse.json(
        { error: 'weekValues array is required' },
        { status: 400 }
      )
    }

    // Check that none of the referenced flight weeks are locked
    const flightWeekIds = weekValues.map((wv) => wv.flightWeekId)
    const lockedWeeks = await prisma.flightWeek.findMany({
      where: {
        id: { in: flightWeekIds },
        isLocked: true,
      },
    })

    if (lockedWeeks.length > 0) {
      const lockedLabels = lockedWeeks.map((w) => w.label).join(', ')
      return NextResponse.json(
        { error: `Cannot update locked weeks: ${lockedLabels}` },
        { status: 409 }
      )
    }

    // Batch upsert all week values in a transaction
    const results = await prisma.$transaction(
      weekValues.map((wv) =>
        prisma.lineItemWeekValue.upsert({
          where: {
            lineItemId_flightWeekId: {
              lineItemId,
              flightWeekId: wv.flightWeekId,
            },
          },
          update: {
            ...(wv.plannedPoints !== undefined && { plannedPoints: wv.plannedPoints }),
            ...(wv.plannedImpressions !== undefined && { plannedImpressions: wv.plannedImpressions }),
            ...(wv.plannedCost !== undefined && { plannedCost: wv.plannedCost }),
            ...(wv.actualPoints !== undefined && { actualPoints: wv.actualPoints }),
            ...(wv.actualImpressions !== undefined && { actualImpressions: wv.actualImpressions }),
            ...(wv.actualCost !== undefined && { actualCost: wv.actualCost }),
          },
          create: {
            lineItemId,
            flightWeekId: wv.flightWeekId,
            plannedPoints: wv.plannedPoints ?? null,
            plannedImpressions: wv.plannedImpressions ?? null,
            plannedCost: wv.plannedCost ?? 0,
            actualPoints: wv.actualPoints ?? null,
            actualImpressions: wv.actualImpressions ?? null,
            actualCost: wv.actualCost ?? null,
          },
        })
      )
    )

    return NextResponse.json({ updated: results.length, weekValues: results })
  } catch (error) {
    console.error('Error updating week values:', error)
    return NextResponse.json(
      { error: 'Failed to update week values' },
      { status: 500 }
    )
  }
}
