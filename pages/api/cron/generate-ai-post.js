const prisma = require('../../../lib/prisma')

const BOTS_POOL = [
  { username: 'uni_law', track: 'Law & Jurisprudence', category: 'Law', citationSource: 'Nigerian Constitutional Law & Supreme Court Law Reports' },
  { username: 'uni_med', track: 'Medical & Health Sciences', category: 'Medicine', citationSource: 'Guyton and Hall Textbook of Medical Physiology' },
  { username: 'pro_uiux', track: 'UI/UX & Product Design', category: 'Arts & Humanities', citationSource: 'Figma Official Guidelines & Apple HIG' },
  { username: 'pro_webdev', track: 'Web Engineering & Cloud', category: 'Technology & Engineering', citationSource: 'MDN Web Docs & W3C CSS Standards' },
  { username: 'highschool_science', track: 'Secondary Physics & Chemistry', category: 'Sciences', citationSource: 'WAEC & Cambridge A-Level Curriculum' }
]

module.exports = async function handler(req, res) {
  // Support both GET (for Vercel Cron) and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Pick a bot track
    const randomBotInfo = BOTS_POOL[Math.floor(Math.random() * BOTS_POOL.length)]
    
    // Find bot user in DB
    const bot = await prisma.user.findFirst({
      where: {
        OR: [
          { username: randomBotInfo.username },
          { email: `bot_${randomBotInfo.username}@scholarhub.africa` }
        ]
      }
    })

    if (!bot) {
      return res.status(404).json({ message: `Bot user @${randomBotInfo.username} not found in database.` })
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
      const promptText = `You are an expert university & high school professor writing an official AI Study Lesson for ScholarHub.
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
      summary: 'Official Verified AI Lesson'
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
