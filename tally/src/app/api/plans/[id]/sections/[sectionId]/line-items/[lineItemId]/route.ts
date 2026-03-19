import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sectionId: string; lineItemId: string }> }
) {
  try {
    const { lineItemId } = await params
    await prisma.lineItem.delete({ where: { id: lineItemId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting line item:', error)
    return NextResponse.json({ error: 'Failed to delete line item' }, { status: 500 })
  }
}
