import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { requireAdminEmail } from '../../../../../lib/adminAuth'

const dataDir = path.join(process.cwd(), 'data')
const filePath = path.join(dataDir, 'pending_signups.json')

export async function POST(req: Request) {
  try {
    const auth = await requireAdminEmail(req)
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    const { email } = await req.json()
    if (!email) return NextResponse.json({ ok: false, error: 'email required' }, { status: 400 })

    if (fs.existsSync(filePath)) {
      const arr = JSON.parse(fs.readFileSync(filePath, 'utf-8') || '[]')
      const updated = arr.map((item: any) => {
        if (String(item.email).toLowerCase() !== String(email).toLowerCase()) return item
        return { ...item, status: 'declined' }
      })
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2))
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
