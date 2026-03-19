import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/audience-profiles
 *
 * Search audience profiles from the seeded library.
 *
 * Query params:
 *   search — fuzzy match on searchKey, audienceName, or geography
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { searchKey: { contains: search, mode: 'insensitive' } },
        { audienceName: { contains: search, mode: 'insensitive' } },
        { geography: { contains: search, mode: 'insensitive' } },
      ]
    }

    const profiles = await prisma.audienceProfile.findMany({
      where,
      orderBy: { audienceName: 'asc' },
      take: 100,
    })

    return NextResponse.json(profiles)
  } catch (error) {
    console.error('Error fetching audience profiles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audience profiles' },
      { status: 500 }
    )
  }
}
