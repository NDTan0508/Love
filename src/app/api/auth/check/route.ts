import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const dataDir = path.join(process.cwd(), 'data')
const filePath = path.join(dataDir, 'pending_signups.json')

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ allowed: false }, { status: 400 })

    const admin = createClient(supabaseUrl, serviceKey)

    // list users (server-side admin) and check email exists
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (error) return NextResponse.json({ allowed: false, error: error.message }, { status: 500 })

    const exists = (data?.users || []).some((u: any) => u.email?.toLowerCase() === String(email).toLowerCase())
    if (exists) return NextResponse.json({ state: 'approved', allowed: true })

    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const arr = JSON.parse(raw || '[]')
      const record = arr.find((item: any) => String(item.email).toLowerCase() === String(email).toLowerCase())
      if (record) {
        const status = record.status || 'pending'
        return NextResponse.json({ state: status, allowed: false })
      }
    }

    return NextResponse.json({ state: 'unknown', allowed: false })
  } catch (err) {
    return NextResponse.json({ allowed: false, error: (err as Error).message }, { status: 500 })
  }
}
