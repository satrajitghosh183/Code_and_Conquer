// node tariq/insertProblemsGreengerong.js --limit=5
import { supabase } from './supabaseClient.js'
import fs from 'fs'
import path from 'path'

const filePath = path.resolve('./tariq/leetcode-train.jsonl')
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 5

const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean)
const LANGS = ['python', 'java', 'c++', 'javascript']

async function main () {
  for (let i = 0; i < Math.min(LIMIT, lines.length); i++) {
    const item = JSON.parse(lines[i])

    // Insert problem (matches your columns: description + UUID id)
    const { data: problemData, error: problemError } = await supabase
      .from('problems')
      .upsert([{
        slug: item.slug,
        title: item.title,
        description: item.content,   // <- your schema
        difficulty: item.difficulty,
      }], { onConflict: 'slug' })
      .select('id')                  // <- UUID PK

    if (problemError) {
      console.error('❌ Problem upsert error:', item.title, problemError.message)
      continue
    }
    const problemId = problemData[0].id
    console.log(`✅ Problem: ${item.title} (id=${problemId})`)

    // Insert/Upsert 1 version per language (problem_versions.problem_id is UUID)
    for (const lang of LANGS) {
      const code = item[lang]
      if (!code) continue
      const { error: vErr } = await supabase
        .from('problem_versions')
        .upsert([{
          problem_id: problemId,
          language: lang,
          solution_code: String(code),
          explanation_md: null,
        }], { onConflict: 'problem_id,language' })

      if (vErr) console.error(`   ❌ version (${lang}) error:`, vErr.message)
      else console.log(`   ➕ ${lang}`)
    }
  }

  console.log('\nDone.')
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
