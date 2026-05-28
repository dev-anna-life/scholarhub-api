const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const { protect } = require('../../../lib/auth')

const DAILY_LIMITS = {
  free: 5,
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

    const { message } = req.body
    if (!message) return res.status(400).json({ message: 'Message is required' })

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

    const msg = message.toLowerCase()
    let reply
    if (msg.includes('hello') || msg.includes('hi')) reply = 'Hello! How can I help with your studies today?'
    else if (msg.includes('exam') || msg.includes('test') || msg.includes('study tips'))
      reply = 'Great question! Try breaking your study sessions into 25-minute focused blocks (Pomodoro technique), review actively rather than passively reading, and teach concepts to someone else to solidify understanding.'
    else if (msg.includes('deadline') || msg.includes('procrastinate'))
      reply = 'Procrastination is common! Try the "2-minute rule" — start with just 2 minutes of work. Often starting is the hardest part. Also try breaking large tasks into smaller, manageable steps.'
    else if (msg.includes('note') || msg.includes('summarize'))
      reply = 'For effective note-taking, try the Cornell method: divide your page into cues, notes, and summary sections. Or use mind maps for visual subjects. The key is to process, not just transcribe.'
    else if (msg.includes('stress') || msg.includes('anxious') || msg.includes('overwhelmed'))
      reply = "It's important to take care of your mental health. Take deep breaths, step away for 5-10 minutes, and remember that asking for help is a sign of strength. Your school likely has counseling resources available."
    else
      reply = "That's a great question! I recommend checking with your course materials or asking your classmates. If you'd like, I can help you find study resources on this topic."

    res.json({
      reply,
      timestamp: new Date().toISOString(),
      quota: { limit, used: user.botUsage.count, badge },
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}