require('dotenv').config()

const apiKey = process.env.GEMINI_API_KEY

async function test() {
  const title = "Fundamentals of Land Surveying"
  const content = "Surveying is the science, art, and technology of determining the relative positions of points above, on, or beneath the earth's surface by means of direct or indirect measurements of distance, direction, and elevation."
  const category = "Sciences"
  const citationSource = "SURCON Curriculum and NUC Surveying Standards"

  const prompt = `You are the ScholarHub Academic Semantic Citation & Global Fact-Checking Engine.
ScholarHub connects university and secondary school students across Africa and globally.
Analyze this student post submission:
Title: "${title || ''}"
Content: "${content || ''}"
Category: "${category || 'General'}"
Claimed Citation / Academic Source: "${citationSource || 'None provided'}"

Global Knowledge Bases & Standards to Cross-Reference:
1. NIGERIAN & AFRICAN CURRICULA: NUC (National Universities Commission) CCMAS benchmarks, professional regulatory curricula (SURCON for Surveying, COREN for Engineering, MDCN for Medicine, NBA/Council of Legal Education for Law, ICAN for Accounting, WAEC/NECO/JAMB).
2. BRITISH CURRICULA: Cambridge International, UK GCSE/A-Levels, UK QAA (Quality Assurance Agency) higher education benchmark statements.
3. AMERICAN CURRICULA: US Common Core, AP (Advanced Placement), ABET accreditation standards for engineering/technology, US College Board benchmarks.
4. TECHNOLOGY & COMPUTING: ACM / IEEE Computing Curricula (Computer Science, Software Engineering, Cybersecurity, AI/Data Science, IT).

Evaluation Guidelines:
1. SAFETY CHECK:
   - If content contains explicit pornography, graphic violence, severe harassment, hate speech, dangerous weapons, or non-academic harmful scams: return "isSafe": false and a polite reason in "flagReason".
2. ACADEMIC CITATION & AUTHENTICITY:
   - "verified" (🟢): The post provides factually accurate, sound educational knowledge that thoroughly aligns with the cited curriculum database or recognized academic standard. Awards +1 Scholar Score.
   - "unverified" (🟡): The post is casual student thoughts, opinion, campus gist, or plausible concept without confirmed curriculum alignment, or is a raw AI chatbot copy-paste without a verified curriculum reference. (0 points).
   - "false_claim" (🔴): The post contains factually incorrect information, pseudoscientific claims, debunked rumors, or misleading false facts. Deducts -1 Scholar Score.
3. CITATION SUMMARY: Provide a concise 1-sentence note explaining the verification result (e.g., "Verified: Accurately aligns with SURCON & NUC Surveying curriculum." or "Unverified: General campus discussion.").

Return ONLY raw valid JSON:
{
  "isSafe": true,
  "flagReason": null,
  "citationStatus": "verified" | "unverified" | "false_claim",
  "citationSummary": "string"
}`

  console.log("Testing gemini-2.5-flash with maxOutputTokens: 1000 and thinkingBudget: 0...")
  let response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json'
        }
      })
    }
  )

  const data = await response.json()
  console.log("Raw response:", JSON.stringify(data, null, 2))
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  console.log("\nParsed text:", text)
}

test().catch(console.error)
