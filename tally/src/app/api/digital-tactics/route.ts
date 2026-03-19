import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/digital-tactics
 *
 * Search and filter digital tactics from the seeded inventory.
 *
 * Query params:
 *   search   — fuzzy match on searchKey or displayName
 *   platform — exact match on platformType (e.g. CTV_OTT, YOUTUBE, META)
 *   adLength — exact match on adLength (e.g. ":15", ":30")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const platform = searchParams.get('platform')
    const adLength = searchParams.get('adLength')

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { searchKey: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (platform) {
      where.platformType = platform
    }

    if (adLength) {
      where.adLength = adLength
    }

    const tactics = await prisma.digitalTactic.findMany({
      where,
      orderBy: { displayName: 'asc' },
      take: 100,
    })

    return NextResponse.json(tactics)
  } catch (error) {
    console.error('Error fetching digital tactics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch digital tactics' },
      { status: 500 }
    )
  }
}
