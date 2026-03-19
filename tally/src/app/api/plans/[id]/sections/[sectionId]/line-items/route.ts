import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string; sectionId: string }>
}

/**
 * GET /api/plans/[id]/sections/[sectionId]/line-items
 * List all line items for a section, including week values.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id, sectionId } = await context.params

    // Verify the section belongs to this plan
    const section = await prisma.mediaSection.findFirst({
      where: { id: sectionId, planId: id },
    })

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found in this plan' },
        { status: 404 }
      )
    }

    const lineItems = await prisma.lineItem.findMany({
      where: { sectionId },
      orderBy: { sortOrder: 'asc' },
      include: {
        weekValues: {
          include: { flightWeek: true },
          orderBy: { flightWeek: { weekNumber: 'desc' } },
        },
        market: true,
      },
    })

    return NextResponse.json(lineItems)
  } catch (error) {
    console.error('Error fetching line items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch line items' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/plans/[id]/sections/[sectionId]/line-items
 * Create a new line item.
 *
 * Body: {
 *   tacticName, marketId?, audienceDemo?, adServingEnabled?,
 *   reachEstimate?, frequency?, notes?, sortOrder?
 * }
 *
 * Automatically creates empty LineItemWeekValue records for every
 * flight week in the plan so the grid is pre-populated.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id, sectionId } = await context.params
    const body = await request.json()

    // Verify section belongs to plan
    const section = await prisma.mediaSection.findFirst({
      where: { id: sectionId, planId: id },
    })

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found in this plan' },
        { status: 404 }
      )
    }

    const {
      tacticName,
      marketId,
      audienceDemo,
      adServingEnabled = false,
      reachEstimate,
      frequency,
      notes,
      sortOrder,
    } = body

    if (!tacticName) {
      return NextResponse.json(
        { error: 'tacticName is required' },
        { status: 400 }
      )
    }

    // Get the count of existing line items for default sortOrder
    const existingCount = await prisma.lineItem.count({
      where: { sectionId },
    })

    // Get all flight weeks for this plan to pre-create week values
    const flightWeeks = await prisma.flightWeek.findMany({
      where: { planId: id },
    })

    const lineItem = await prisma.lineItem.create({
      data: {
        sectionId,
        tacticName,
        marketId: marketId || null,
        audienceDemo: audienceDemo || null,
        adServingEnabled,
        reachEstimate: reachEstimate || null,
        frequency: frequency || null,
        notes: notes || null,
        sortOrder: sortOrder ?? existingCount,
        // Pre-create empty week values for every flight week
        weekValues: {
          create: flightWeeks.map((fw) => ({
            flightWeekId: fw.id,
            plannedPoints: null,
            plannedImpressions: null,
            plannedCost: 0,
          })),
        },
      },
      include: {
        weekValues: {
          include: { flightWeek: true },
          orderBy: { flightWeek: { weekNumber: 'desc' } },
        },
        market: true,
      },
    })

    return NextResponse.json(lineItem, { status: 201 })
  } catch (error) {
    console.error('Error creating line item:', error)
    return NextResponse.json(
      { error: 'Failed to create line item' },
      { status: 500 }
    )
  }
}
