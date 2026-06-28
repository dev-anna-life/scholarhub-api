const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    let messagesArray = req.body.messages
    if (!messagesArray && req.body.message) {
      messagesArray = [{ role: 'user', content: req.body.message }]
    }

    if (!messagesArray || !Array.isArray(messagesArray) || messagesArray.length === 0) {
      return res.status(400).json({ message: 'Messages array or message string is required' })
    }

    const today = new Date().toISOString().slice(0, 10)
    const badge = getEffectiveBadge(user)
    const limit = DAILY_LIMITS[badge] || DAILY_LIMITS.free

    if (user.botUsage?.date !== today) {
      user.botUsage = { date: today, count: 0 }
    }

    if (user.botUsage.count >= limit) {
      return res.status(429).json({
        message: `Daily limit reached. You've used ${limit}/${limit} messages today. Upgrade your badge for more.`,
        limit,
        used: user.botUsage.count,
        badge,
      })
    }

    user.botUsage.count += 1
    await user.save()

    const apiKey = process.env.GEMINI_API_KEY
    let reply
    if (!apiKey) {
      reply = "Sorry, my AI brain is currently disconnected (Gemini API key missing). Please tell the admin to set it up!"
    } else {
      const SYSTEM_PROMPT = `You are ScholarBot, an AI study assistant built for African students. 
You specialize in helping students understand academic subjects, prepare for exams like WAEC, NECO, JAMB, 
UTME, GCE, and university courses. Be friendly, encouraging, and explain things simply. 
When answering, use clear language. Keep answers concise but thorough.`

      const contents = messagesArray.map(m => ({
        role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

      const systemContent = { role: 'user', parts: [{ text: SYSTEM_PROMPT }] }
      const systemReply = { role: 'model', parts: [{ text: 'Understood! Ask me anything!' }] }
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [systemContent, systemReply, ...contents],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
          }),
        }
      )

      if (!response.ok) {
        const err = await response.json()
        reply = "Sorry, I'm having trouble thinking right now. Details: " + (err.error?.message || JSON.stringify(err))
      } else {
        const data = await response.json()
        reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure how to respond to that."
      }
    }

    res.json({
      reply,
      timestamp: new Date().toISOString(),
      quota: { limit, used: user.botUsage.count, badge },
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}