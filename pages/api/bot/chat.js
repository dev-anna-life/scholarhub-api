const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

const DAILY_LIMITS = {
  free: 20,
  badge_basic: 20,
  badge_premium: 50,
  badge_extra_premium: 9999,
}

function getEffectiveBadge(user) {
  if (!user.badgeSubscriptions || user.badgeSubscriptions.length === 0) return 'free'
  const active = user.badgeSubscriptions.find(s => new Date(s.expiresAt) > new Date())
  if (!active) return 'free'
  return active.id
}

async function callGemini(messages) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Gemini API key not configured')

  const SYSTEM_PROMPT = `You are ScholarBot, an AI study assistant built for African students. 
You specialize in helping students understand academic subjects, prepare for exams like WAEC, NECO, JAMB, 
UTME, GCE, and university courses. Be friendly, encouraging, and explain things simply. 
When answering, use clear language. Keep answers concise but thorough. 
If a student seems stressed, offer encouragement along with your help.`

  const contents = messages.map(m => ({
    role: m.role === 'model' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const systemContent = {
    role: 'user',
    parts: [{ text: SYSTEM_PROMPT }],
  }
  const systemReply = {
    role: 'model',
    parts: [{ text: 'Understood! I am ScholarBot, ready to help African students learn and succeed. Ask me anything!' }],
  }
  const fullContents = [systemContent, systemReply, ...contents]

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: fullContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json()
    const errMsg = err.error?.message || JSON.stringify(err)
    console.error('Gemini API error:', errMsg)
    throw new Error('GEMINI_ERROR: ' + errMsg)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response. Please try again.'
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  try {
    const user = await protect(req, res)
    if (!user) return

    const { messages } = req.body
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'Messages array is required' })
    }

    const today = new Date().toISOString().slice(0, 10)
    const badge = getEffectiveBadge(user)
    const limit = DAILY_LIMITS[badge] || DAILY_LIMITS.free

    let botUsageDate = user.botUsageDate
    let botUsageCount = user.botUsageCount || 0

    if (botUsageDate !== today) {
      botUsageDate = today
      botUsageCount = 0
    }

    botUsageCount += 1
    await prisma.user.update({
      where: { id: user.id },
      data: { botUsageDate, botUsageCount }
    })

    const reply = await callGemini(messages)

    res.json({
      reply,
      timestamp: new Date().toISOString(),
      quota: { limit, used: botUsageCount, badge },
    })
  } catch (error) {
    console.error('Bot error:', error.message)
    res.status(500).json({ message: error.message })
  }
}
