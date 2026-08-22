require('dotenv').config()

const apiKey = process.env.GEMINI_API_KEY

async function testGoogleCitation() {
  const tests = [
    {
      title: "What is Photosynthesis?",
      content: "Photosynthesis is the biological process by which green plants and certain organisms convert light energy, usually from the sun, into chemical energy in the form of glucose, using water and carbon dioxide and releasing oxygen.",
      category: "Sciences",
      citationSource: "Google"
    },
    {
      title: "Definition of Economics",
      content: "Economics is a social science concerned with the production, distribution, and consumption of goods and services. It studies how individuals, businesses, and governments allocate resources.",
      category: "Social Sciences",
      citationSource: "Google Search"
    },
    {
      title: "What is Velocity",
      content: "Velocity is the directional speed of an object in motion as an indication of its rate of change in position as observed from a particular frame of reference. The SI unit is meters per second (m/s).",
      category: "Sciences",
      citationSource: "Google Scholar"
    }
  ]

  const promptBuilder = (title, content, category, citationSource) => `You are the ScholarHub Academic Semantic Citation & Global Fact-Checking Engine.
ScholarHub connects university and secondary school students across Africa and globally.
Analyze this student post submission:
Title: "${title || ''}"
Content: "${content || ''}"
Category: "${category || 'General'}"
Claimed Citation / Academic Source: "${citationSource || 'None provided'}"

Global Knowledge Bases, Search Engines & Curricula to Cross-Reference:
1. GLOBAL SEARCH & ACADEMIC REPOSITORIES: Google, Google Scholar, Wikipedia, Encyclopedia Britannica, peer-reviewed journals, recognized digital learning databases, and standard textbooks.
2. NIGERIAN & AFRICAN CURRICULA: NUC (CCMAS), professional regulatory curricula (SURCON, COREN, MDCN, NBA/Law, ICAN, WAEC/NECO/JAMB).
3. BRITISH & AMERICAN CURRICULA: Cambridge International, UK GCSE/A-Levels, UK QAA, US Common Core, AP, ABET accreditation benchmarks.
4. TECHNOLOGY & COMPUTING: ACM / IEEE Computing Curricula (Computer Science, Software Engineering, Cybersecurity, AI/Data Science, IT).

Evaluation Guidelines:
1. SAFETY CHECK:
   - If content contains explicit pornography, graphic violence, severe harassment, hate speech, dangerous weapons, or scams: return "isSafe": false and "flagReason".
2. ACADEMIC CITATION & AUTHENTICITY:
   - "verified" (🟢): The post provides factually accurate, sound educational/academic knowledge. When the source is cited as "Google", "Google Search", "Google Scholar", "Online Search", "Textbook", or an academic curriculum, and the information is factually true and verifiable against global search/educational databases, mark as "verified". Awards +1 Scholar Score.
   - "unverified" (🟡): The post is casual student opinion, campus gist, personal thought, or casual social chat that is not educational or has no factual basis to verify. (0 points).
   - "false_claim" (🔴): The post contains factually incorrect information, pseudoscientific falsehoods, debunked claims, or misleading fake facts. Deducts -1 Scholar Score.
3. CITATION SUMMARY: Provide a concise 1-sentence note explaining the verification result (e.g., "Verified: Factually accurate scientific concept confirmed via Google & academic sources." or "Verified: Accurately aligns with SURCON & NUC curriculum.").

Return ONLY valid JSON:
{
  "isSafe": true,
  "flagReason": null,
  "citationStatus": "verified" | "unverified" | "false_claim",
  "citationSummary": "string"
}`

  for (const t of tests) {
    console.log(`\n--- Testing: "${t.title}" (Citation: ${t.citationSource}) ---`)
    const p = promptBuilder(t.title, t.content, t.category, t.citationSource)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: p }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
            responseMimeType: 'application/json'
          }
        })
      }
    )
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    console.log("Result:", text)
  }
}

testGoogleCitation().catch(console.error)
