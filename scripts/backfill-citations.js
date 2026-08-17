require('dotenv').config()
const { Client } = require('pg')

const apiKey = process.env.GEMINI_API_KEY
const dbUrl = process.env.DATABASE_URL

function extractJson(text) {
  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned)
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw e
  }
}

async function analyzePost(title, content, category, citationSource) {
  if (!apiKey) return { citationStatus: 'unverified', citationSummary: 'No API Key' }

  const prompt = `You are the ScholarHub Academic Semantic Citation & Fact-Checking Engine.
ScholarHub is an academic social platform for university and secondary school students.
Analyze this student post from the feed:
Title: "${title || ''}"
Content: "${content || ''}"
Category: "${category || 'General'}"
Claimed Citation: "${citationSource || 'None'}"

Instructions:
1. Determine if this post contains genuine, factually sound educational knowledge, academic concepts, definitions, study insights, historical facts, scientific principles, law principles, or course tutorials (e.g. Surveying, Law, Engineering, Medicine, Science, Mathematics, Literature, Technology, History).
2. If it is accurate and educational -> "citationStatus": "verified".
3. If it is purely casual social chat, campus gist, or unverified opinion -> "citationStatus": "unverified".
4. Provide a clear 1-sentence "citationSummary" (e.g., "Verified: Accurately explains fundamental surveying principles." or "Unverified: Campus discussion.").

Return ONLY valid raw JSON:
{
  "citationStatus": "verified",
  "citationSummary": "Accurate explanation of historical events."
}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 300,
            responseMimeType: 'application/json'
          }
        })
      }
    )

    if (!res.ok) {
      const errTxt = await res.text()
      console.error('Gemini error:', errTxt)
      return { citationStatus: 'unverified', citationSummary: 'AI analysis unavailable' }
    }
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { citationStatus: 'unverified', citationSummary: 'No text response' }
    return extractJson(text)
  } catch (err) {
    console.error('Fetch error for post:', title, err.message)
    return { citationStatus: 'unverified', citationSummary: 'Error during analysis' }
  }
}

async function main() {
  const client = new Client({ connectionString: dbUrl })
  await client.connect()
  console.log('Connected to Neon PostgreSQL database.')

  const res = await client.query('SELECT id, title, content, category, "citationSource", "citationStatus" FROM "Post" ORDER BY "createdAt" DESC')
  const posts = res.rows

  console.log(`Found ${posts.length} posts. Starting Gemini Semantic Evaluation...\n`)

  let verifiedCount = 0
  let unverifiedCount = 0

  for (let i = 0; i < posts.length; i++) {
    const p = posts[i]
    console.log(`[${i + 1}/${posts.length}] Evaluating: "${(p.title || 'Untitled').slice(0, 45)}" (${p.category})`)

    const result = await analyzePost(p.title, p.content, p.category, p.citationSource)
    console.log(`  -> Result: [${result.citationStatus.toUpperCase()}] ${result.citationSummary}`)

    await client.query(
      'UPDATE "Post" SET "citationStatus" = $1, "citationSummary" = $2 WHERE id = $3',
      [result.citationStatus, result.citationSummary, p.id]
    )

    if (result.citationStatus === 'verified') verifiedCount++
    else unverifiedCount++

    // Brief delay to respect rate limits
    await new Promise(r => setTimeout(r, 600))
  }

  console.log(`\n========================================`)
  console.log(`AI Backfill Completed Successfully!`)
  console.log(`Total Posts Evaluated: ${posts.length}`)
  console.log(`🟢 Verified Educational Posts: ${verifiedCount}`)
  console.log(`🟡 Unverified / Discussion Posts: ${unverifiedCount}`)
  console.log(`========================================\n`)

  await client.end()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
