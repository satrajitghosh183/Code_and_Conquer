import { supabase } from './supabaseClient.js'
import fs from 'fs'

// Load and parse the JSONL file
const filePath = './tariq/leetcode-train.jsonl'
const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean)

async function insertProblems() {
  for (let i = 0; i < 5; i++) { // insert first 5 for testing
    const item = JSON.parse(lines[i])

    // 1️⃣ Insert into problems table
    const { data: problemData, error: problemError } = await supabase
      .from('problems')
      .insert([
        {
          slug: item.slug,
          title: item.title,
          statement_md: item.content,
          difficulty: item.difficulty,
        },
      ])
      .select('problem_id')

    if (problemError) {
      console.error('❌ Error inserting problem:', item.title, problemError.message)
      continue
    }

    const problemId = problemData[0].problem_id
    console.log(`✅ Inserted problem: ${item.title} (ID ${problemId})`)

    // 2️⃣ Insert one problem_version per language
    const languages = ['python', 'java', 'c++', 'javascript']
    for (const lang of languages) {
      if (!item[lang]) continue

      const { error: versionError } = await supabase
        .from('problem_versions')
        .insert([
          {
            problem_id: problemId,
            language: lang,
            solution_code: item[lang],
            explanation_md: null,
          },
        ])

      if (versionError) {
        console.error(`   ❌ Error inserting version (${lang}) for ${item.title}:`, versionError.message)
      } else {
        console.log(`   ✅ Added ${lang} version for ${item.title}`)
      }
    }
  }
}

insertProblems()
