import { NextResponse } from 'next/server'
import { createAdminClient, jsonError } from '../../../../lib/aiServerUtils'
import { runDailyMissionReset } from '../../../../lib/dailyMissionServer'

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization') || ''
  const headerSecret = req.headers.get('x-cron-secret') || ''
  return auth === `Bearer ${secret}` || headerSecret === secret
}

async function handleReset(req: Request) {
  if (!isAuthorized(req)) return jsonError('Unauthorized cron request.', 401, 'unauthorized_cron')

  try {
    const admin = createAdminClient()
    const result = await runDailyMissionReset(admin)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'daily_mission_reset_failed'
    return jsonError('Daily mission reset failed.', 500, code)
  }
}

export async function GET(req: Request) {
  return handleReset(req)
}

export async function POST(req: Request) {
  return handleReset(req)
}
