// node tariq/mergeNewfacadeSimple.js --dry-run
// node tariq/mergeNewfacadeSimple.js
import { supabase } from './supabaseClient.js'
import fs from 'fs'
import path from 'path'
import readline from 'readline'

const NEWFACADE_PATH = path.resolve('./tariq/LeetCodeDataset-train.jsonl')
const DRY_RUN = process.argv.includes('--dry-run')
const BATCH = 50

const normalize = s => (s||'').toLowerCase().replace(/[\u2019']/g,'').replace(/[^a-z0-9]+/g,' ').trim()
const slugify  = s => (s||'').toLowerCase().replace(/[\u2019']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-+/g,'-')
function slugFromEntryPoint(ep) {
  if (!ep) return null
  const last = ep.split('.').pop()
  const fn = last?.replace(/\(\)$/, '') || ''
  return fn ? fn.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase() : null
}

async function loadProblems() {
  const { data, error } = await supabase.from('problems').select('id, slug, title')
  if (error) throw new Error(error.message)
  const bySlug = new Map(), byTitle = new Map(), byTitleSlug = new Map()
  for (const p of data) {
    if (p.slug) bySlug.set(String(p.slug).toLowerCase(), p)
    if (p.title) {
      byTitle.set(normalize(p.title), p)
      byTitleSlug.set(slugify(p.title), p)
    }
  }
  return { bySlug, byTitle, byTitleSlug }
}

function chunk(a, n=50){const o=[];for(let i=0;i<a.length;i+=n)o.push(a.slice(i,i+n));return o}

async function insertCases(problem_id, cases) {
  if (!cases?.length) return 0
  const rows = cases.map((tc, idx) => ({
    problem_id,
    input: { raw: String(tc.input ?? '').trim() },            // JSONB
    expected_output: { raw: String(tc.output ?? '').trim() }, // JSONB
    is_hidden: idx >= 3,                                      // 3 public, rest hidden
    weight: 1
  }))
  let inserted = 0
  for (const group of chunk(rows, BATCH)) {
    const { data, error } = await supabase
      .from('test_cases')
      .upsert(group, { onConflict: 'problem_id,input' })
      .select('id')
    if (error) { console.error('   ❌ test_cases upsert error:', error.message); continue }
    inserted += data?.length ?? 0
  }
  return inserted
}

async function setPythonEntryPoint(problem_id, entry_point) {
  if (!entry_point) return
  const { error } = await supabase
    .from('problem_versions')
    .update({ entry_point })
    .eq('problem_id', problem_id)
    .eq('language', 'python')
  if (error) console.error(`   ⚠️ entry_point update failed:`, error.message)
}

async function main () {
  console.log(`\n=== Merge newfacade → test_cases ${DRY_RUN ? '(dry-run)' : ''} ===\n`)
  if (!fs.existsSync(NEWFACADE_PATH)) throw new Error(`File not found: ${NEWFACADE_PATH}`)

  const { bySlug, byTitle, byTitleSlug } = await loadProblems()

  const rl = readline.createInterface({
    input: fs.createReadStream(NEWFACADE_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  })

  let total = 0, matched = 0, totalInserted = 0
  const unmatched = []

  for await (const line of rl) {
    if (!line.trim()) continue
    total += 1
    let row; try { row = JSON.parse(line) } catch { continue }

    const title       = row.title || row.problem_title || row.question_title || null
    const entryPoint  = row.entry_point || null
    const inputOutput = row.input_output || row.test_cases || []

    const derivedSlug = slugFromEntryPoint(entryPoint)
    const titleSlug   = slugify(title)
    const titleKey    = normalize(title)

    let problem = null
    if (derivedSlug && bySlug.has(derivedSlug)) problem = bySlug.get(derivedSlug)
    else if (bySlug.has(titleSlug))             problem = bySlug.get(titleSlug)
    else if (byTitleSlug.has(titleSlug))        problem = byTitleSlug.get(titleSlug)
    else if (byTitle.has(titleKey))             problem = byTitle.get(titleKey)

    if (!problem) { unmatched.push({ title, entry_point: entryPoint, derived_slug: derivedSlug }); continue }

    matched += 1
    if (DRY_RUN) continue

    await setPythonEntryPoint(problem.id, entryPoint)

    const valid = Array.isArray(inputOutput)
      ? inputOutput.filter(tc => tc && typeof tc.input !== 'undefined' && typeof tc.output !== 'undefined')
      : []

    const inserted = await insertCases(problem.id, valid)
    totalInserted += inserted

    console.log(`✅ ${problem.title} → cases found: ${valid.length}, inserted: ${inserted}`)
  }

  console.log('\n=== Summary ===')
  console.log(`newfacade rows:  ${total}`)
  console.log(`matched:         ${matched}`)
  console.log(`unmatched:       ${unmatched.length}`)
  console.log(`inserted cases:  ${DRY_RUN ? 0 : totalInserted}`)
  fs.writeFileSync('./tariq/unmatched-newfacade.json', JSON.stringify(unmatched, null, 2), 'utf-8')
  console.log('Unmatched written to: ./tariq/unmatched-newfacade.json\n')
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
