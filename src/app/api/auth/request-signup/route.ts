import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const dataDir = path.join(process.cwd(), 'data')
const filePath = path.join(dataDir, 'pending_signups.json')

async function ensureFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir)
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]')
}

export async function POST(req: Request) {
  try {
    const { name, email, password, inviteCode: joinInviteCode } = await req.json()
    if (!email) return NextResponse.json({ ok: false, error: 'email required' }, { status: 400 })
    if (!password || String(password).length < 6) {
      return NextResponse.json({ ok: false, error: 'password must be at least 6 characters' }, { status: 400 })
    }

    const emailLower = String(email).toLowerCase()

    // If DEV_AUTO_APPROVE is set, create the Supabase user directly.
    // Do this before writing pending state so plaintext passwords never touch disk.
    if (process.env.DEV_AUTO_APPROVE === '1') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      if (supabaseUrl && serviceKey) {
        try {
          const admin = createClient(supabaseUrl, serviceKey)
          // create user via admin
          const { data: userData, error: userError } = await admin.auth.admin.createUser({
            email,
            password,
            user_metadata: { name: name || '' },
            email_confirm: true
          })
          if (userError) throw userError

          if (!userData.user?.id) {
            throw new Error('created user id is missing')
          }

          const { error: userRowError } = await admin
            .from('users')
            .upsert(
              [{ id: userData.user.id, email, name: name || '' }],
              { onConflict: 'id' }
            )
          if (userRowError) throw userRowError

          let coupleId: string
          let newInviteCode: string | null = null

          if (joinInviteCode && String(joinInviteCode).trim()) {
            // Join existing couple via invite code
            const { data: invite, error: inviteFetchError } = await admin
              .from('pair_invites')
              .select('couple_id')
              .eq('invite_code', String(joinInviteCode).toUpperCase())
              .single()

            if (inviteFetchError || !invite) {
              throw new Error('Invite code không hợp lệ')
            }

            coupleId = invite.couple_id

            // Add user as partner to the couple
            const { error: partnerError } = await admin
              .from('couple_members')
              .insert([{ couple_id: coupleId, user_id: userData.user.id, role: 'partner' }])
            if (partnerError) throw partnerError

            // Mark invite as accepted
            const { error: acceptError } = await admin
              .from('pair_invites')
              .update({ accepted_by: userData.user.id, accepted_at: new Date().toISOString() })
              .eq('invite_code', String(joinInviteCode).toUpperCase())
            if (acceptError) throw acceptError
          } else {
            // Create new couple for this user
            const { data: couple, error: coupleError } = await admin
              .from('couples')
              .insert([{ name: `Couple of ${email}` }])
              .select()
              .single()
            if (coupleError) throw coupleError

            coupleId = couple.id

            // Add user as creator
            const { error: memberError } = await admin
              .from('couple_members')
              .insert([{ couple_id: coupleId, user_id: userData.user.id, role: 'creator' }])
            if (memberError) throw memberError

            // Generate and create invite code
            newInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()
            const { error: inviteError } = await admin
              .from('pair_invites')
              .insert([{ couple_id: coupleId, invite_code: newInviteCode, created_by: userData.user.id }])
            if (inviteError) throw inviteError
          }

          return NextResponse.json({
            ok: true,
            inviteCode: newInviteCode || undefined,
            coupleId,
            joined: !newInviteCode
          })
        } catch (err) {
          // fallthrough to normal ok response but include error message
          return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
        }
      }
    }

    await ensureFile()
    const raw = fs.readFileSync(filePath, 'utf-8')
    const arr = JSON.parse(raw || '[]')
    const filtered = arr.filter((r: any) => String(r.email).toLowerCase() !== emailLower)
    filtered.push({
      name: name || '',
      email,
      status: 'pending',
      requested_at: new Date().toISOString()
    })
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2))

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
