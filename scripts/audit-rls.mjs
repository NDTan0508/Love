import fs from 'node:fs'
import path from 'node:path'

const migrationsDir = path.join(process.cwd(), 'db', 'migrations')
const requiredTables = [
  'users',
  'couples',
  'couple_members',
  'pair_invites',
  'timeline_events',
  'timeline_media',
  'comments',
  'moods',
  'notifications',
  'missions',
  'mission_progress',
  'badges',
  'blogs',
  'blog_comments',
  'activity_events',
  'ai_privacy_settings',
  'ai_insights',
  'ai_monthly_recaps',
  'ai_daily_prompts',
  'ai_daily_prompt_responses',
  'ai_rituals',
  'ai_memory_stories',
  'wishlist_items',
  'wishlist_reservations',
  'couple_rewards',
  'game_sessions',
  'game_players',
  'game_moves'
]

function fail(message) {
  console.error(`RLS audit failed: ${message}`)
  process.exit(1)
}

const sql = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .map((file) => fs.readFileSync(path.join(migrationsDir, file), 'utf8'))
  .join('\n')
  .toLowerCase()

const missingRls = requiredTables.filter(
  (table) => !sql.includes(`alter table ${table} enable row level security`)
)

if (missingRls.length > 0) {
  fail(`missing enable row level security for: ${missingRls.join(', ')}`)
}

const missingPolicies = requiredTables.filter((table) => {
  const policyPattern = new RegExp(`create\\s+policy[\\s\\S]+?on\\s+${table}\\b`, 'i')
  return !policyPattern.test(sql)
})

if (missingPolicies.length > 0) {
  fail(`missing create policy statements for: ${missingPolicies.join(', ')}`)
}

console.log(`RLS audit clean: ${requiredTables.length} core tables have RLS and policies in migrations.`)
