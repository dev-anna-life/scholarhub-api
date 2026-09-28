const prisma = require('../../../lib/prisma')

const BOTS_POOL = [
  { id: 'cmtiv114v0003lsvolm3vgkoj', username: 'law_faculty', track: 'Law & Jurisprudence', category: 'Law', citationSource: 'Nigerian Constitutional Law & Supreme Court Law Reports' },
  { id: 'cmtiv11pk0004lsvo7qce9lrm', username: 'medical_sciences', track: 'Medical & Clinical Sciences', category: 'Medicine', citationSource: 'Guyton and Hall Textbook of Medical Physiology' },
  { id: 'cmtiv133e0007lsvoinr72ybg', username: 'design_studio', track: 'UI/UX & Product Design', category: 'Arts & Humanities', citationSource: 'Figma Official Guidelines & Apple HIG' },
  { id: 'cmtiv13hs0008lsvopqjsfxml', username: 'web_engineering', track: 'Web Engineering & Cloud', category: 'Technology & Engineering', citationSource: 'MDN Web Docs & W3C CSS Standards' },
  { id: 'cmtiv0zrm0000lsvoquuxye6h', username: 'science_academy', track: 'Secondary Physics & Chemistry', category: 'Sciences', citationSource: 'WAEC & Cambridge A-Level Curriculum' },
  { id: 'cmtiv13yz0009lsvo8j9ddgy7', username: 'data_science', track: 'Data Science & Artificial Intelligence', category: 'Technology & Engineering', citationSource: 'Python Software Foundation & Scikit-Learn Documentation' },
  { id: 'cmtiv12pl0006lsvoi5f4hncg', username: 'accounting_guild', track: 'Accounting & Financial Economics', category: 'Commerce', citationSource: 'International Financial Reporting Standards (IFRS)' },
  { id: 'cmtiv128q0005lsvo9gsyi4c4', username: 'governance_studies', track: 'Political Science & Constitutional Governance', category: 'Law', citationSource: 'African Union & UN Human Rights Charters' },
  { id: 'cmtiv10qk0002lsvoau95i8lv', username: 'commerce_academy', track: 'Secondary Commerce & Business Economics', category: 'Commerce', citationSource: 'WAEC & Cambridge Business Studies Curriculum' },
  { id: 'cmtiv109i0001lsvolgr717yz', username: 'literature_academy', track: 'Literature in English & World History', category: 'Arts & Humanities', citationSource: 'Cambridge Literature & West African History Archives' }
]

module.exports = async function handler(req, res) {
  // Support both GET (for Cron/GitHub Action) and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Pick a bot track
    const randomBotInfo = BOTS_POOL[Math.floor(Math.random() * BOTS_POOL.length)]
    
    // Find academy user in DB by exact ID or username/email
    let bot = await prisma.user.findFirst({
      where: {
        OR: [
          { id: randomBotInfo.id },
          { username: randomBotInfo.username },
          { email: `${randomBotInfo.username}@scholarhub.dev` }
        ]
      }
    })

    // Fallback: search by ID
    if (!bot) {
      bot = await prisma.user.findFirst({
        where: {
          id: randomBotInfo.id
        }
      })
    }

    if (!bot) {
      return res.status(404).json({ message: `No faculty user available in database.` })
    }

    // Get recent titles to prevent duplicates
    const recentPosts = await prisma.post.findMany({
      take: 25,
      orderBy: { createdAt: 'desc' },
      select: { title: true }
    })
    const recentTitlesList = recentPosts.map(p => p.title).join('; ')

    // Call Gemini API if key is present
    const apiKey = process.env.GEMINI_API_KEY
    let newPostData = null

    if (apiKey) {
      const promptText = `You are a distinguished academic professor and faculty chair writing an official, verified curriculum Study Lesson for ScholarHub.
Track: ${randomBotInfo.track}
Category: ${randomBotInfo.category}
Verified Source Citation: ${randomBotInfo.citationSource}
Excluded Recent Titles (Do NOT repeat any of these): [${recentTitlesList}]

Generate ONE fresh, engaging academic lesson card with zero raw emojis.
Return JSON ONLY in this exact schema:
{
  "title": "Clear concise lesson title (e.g. University Law: Section 36 Right to Fair Hearing)",
  "content": "THE SIMPLE CONCEPT:\nExplain in 2 plain sentences.\n\nKEY CASE STUDY / PRACTICAL EXAMPLE:\nGive 1 specific legal case, medical symptom, or code snippet.\n\nKEY TAKEAWAY MEMORY RULE:\n1-sentence rule for exams.\n\nVERIFIED ACADEMIC REFERENCE:\nVerified Source: ${randomBotInfo.citationSource}",
  "quizQuestion": "A specific multiple-choice question testing the core takeaway of this post",
  "quizOptions": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correctOptionIndex": 0
}`

      try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        })
        const data = await geminiRes.json()
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (rawJson) {
          newPostData = JSON.parse(rawJson)
        }
      } catch (err) {
        console.error('Gemini API cron generation error:', err)
      }
    }

    // Fallback template if Gemini key is missing or fails
    if (!newPostData) {
      newPostData = {
        title: `${randomBotInfo.category} Lesson: Core Principles of ${randomBotInfo.track}`,
        content: `THE SIMPLE CONCEPT:\nUnderstanding fundamental principles in ${randomBotInfo.track} ensures proper application in real-world scenarios.\n\nKEY CASE STUDY / PRACTICAL EXAMPLE:\nApplying verified guidelines according to standard curriculum references.\n\nKEY TAKEAWAY MEMORY RULE:\nAlways verify source citations before drawing academic conclusions.\n\nVERIFIED ACADEMIC REFERENCE:\nVerified Source: ${randomBotInfo.citationSource}`,
        quizQuestion: `What is the primary requirement when analyzing a ${randomBotInfo.category} concept?`,
        quizOptions: ['Verify core academic rules', 'Ignore primary sources', 'Apply arbitrary rules', 'None of the above'],
        correctOptionIndex: 0
      }
    }

    // Combine quiz into citationSummary metadata JSON so frontend receives it
    const citationSummaryMeta = JSON.stringify({
      quizQuestion: newPostData.quizQuestion,
      quizOptions: newPostData.quizOptions,
      correctOptionIndex: newPostData.correctOptionIndex,
      summary: 'Official Verified Lesson'
    })

    // Create the post in Prisma DB
    const createdPost = await prisma.post.create({
      data: {
        title: newPostData.title,
        content: newPostData.content,
        category: randomBotInfo.category,
        citationSource: randomBotInfo.citationSource,
        citationStatus: 'verified',
        citationSummary: citationSummaryMeta,
        isAiAssisted: true,
        authorId: bot.id,
        status: 'approved'
      }
    })

    return res.status(200).json({
      success: true,
      message: 'New AI post successfully generated and published!',
      post: createdPost
    })

  } catch (error) {
    console.error('CRON AI POST GENERATION ERROR:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
}
