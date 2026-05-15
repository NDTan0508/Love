import { NextResponse } from 'next/server'
import { requireAdminEmail } from '../../../../../lib/adminAuth'

export async function GET(req: Request) {
  try {
    const auth = await requireAdminEmail(req)
    if (!auth.ok) {
      return NextResponse.json({ isAdmin: false, error: auth.error }, { status: auth.status })
    }

    return NextResponse.json({ isAdmin: true, email: auth.email })
  } catch (err) {
    return NextResponse.json({ isAdmin: false, error: (err as Error).message }, { status: 500 })
  }
}
