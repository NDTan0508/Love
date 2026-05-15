import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { requireAdminEmail } from '../../../../../lib/adminAuth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const dataDir = path.join(process.cwd(), 'data')
const filePath = path.join(dataDir, 'pending_signups.json')

export async function POST(req: Request) {
  try {
    const auth = await requireAdminEmail(req)
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    }

    const { email, password, name } = await req.json()
    if (!email) return NextResponse.json({ ok: false, error: 'email required' }, { status: 400 })

    let finalPassword = password
    let finalName = name
    let signups: any[] = []
    if (fs.existsSync(filePath)) {
      signups = JSON.parse(fs.readFileSync(filePath, 'utf-8') || '[]')
      const found = signups.find((r: any) => String(r.email).toLowerCase() === String(email).toLowerCase())
      if (found && !finalName) finalName = found.name
    }

    if (!finalPassword || String(finalPassword).length < 6) {
      return NextResponse.json({ ok: false, error: 'password must be supplied by admin and be at least 6 characters' }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, serviceKey)
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: finalPassword,
      user_metadata: { name: finalName || '' },
      email_confirm: true
    })
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    if (!data.user?.id) {
      return NextResponse.json({ ok: false, error: 'created user id is missing' }, { status: 500 })
    }

    const { error: userRowError } = await admin
      .from('users')
      .upsert(
        [{ id: data.user.id, email, name: finalName || '' }],
        { onConflict: 'id' }
      )
    if (userRowError) return NextResponse.json({ ok: false, error: userRowError.message }, { status: 500 })

    // mark signup as approved if the record exists
    if (fs.existsSync(filePath)) {
      const updated = signups.map((item: any) => {
        if (String(item.email).toLowerCase() !== String(email).toLowerCase()) return item
        return { ...item, status: 'approved' }
      })
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2))
    }

    return NextResponse.json({ ok: true, user: data?.user })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
