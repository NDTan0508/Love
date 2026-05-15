import fs from 'node:fs'
import path from 'node:path'

const migrationsDir = path.join(process.cwd(), 'db', 'migrations')

function fail(message) {
  console.error(`Migration check failed: ${message}`)
  process.exit(1)
}

if (!fs.existsSync(migrationsDir)) {
  fail('db/migrations does not exist')
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((file) => /^\d{4}_.+\.sql$/.test(file))
  .sort()

if (files.length === 0) {
  fail('no numbered SQL migrations found')
}

const numbers = files.map((file) => Number(file.slice(0, 4)))
const seen = new Set()

for (const number of numbers) {
  if (seen.has(number)) fail(`duplicate migration number ${String(number).padStart(4, '0')}`)
  seen.add(number)
}

for (let i = 1; i <= numbers[numbers.length - 1]; i += 1) {
  if (!seen.has(i)) fail(`missing migration ${String(i).padStart(4, '0')}`)
}

console.log(`Migration check clean: ${files.length} migrations, latest ${files[files.length - 1]}`)
console.log('Manual live check: make sure every migration shown here has been applied in Supabase SQL Editor.')
