import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { requireAdminEmail } from '../../../../../lib/adminAuth'

const dataDir = path.join(process.cwd(), 'data')
const filePath = path.join(dataDir, 'pending_signups.json')

export async function GET(req: Request) {
  try {
    const auth = await requireAdminEmail(req)
    if (!auth.ok) {
      return NextResponse.json({ pending: [], error: auth.error }, { status: auth.status })
    }

    if (!fs.existsSync(filePath)) return NextResponse.json({ pending: [] })
    const raw = fs.readFileSync(filePath, 'utf-8')
    const arr = JSON.parse(raw || '[]')
    const pending = arr.filter((item: any) => (item.status || 'pending') === 'pending')
    return NextResponse.json({ pending })
  } catch (err) {
    return NextResponse.json({ pending: [], error: (err as Error).message }, { status: 500 })
  }
}
