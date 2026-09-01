const prisma = require('../lib/prisma')
const bcrypt = require('bcryptjs')

const BOTS = [
  {
    name: 'High School Science Bot',
    username: 'highschool_science',
    email: 'bot_hs_science@scholarhub.dev',
    track: 'Science',
    level: 'High School',
    bio: 'Official High School Science & Math Guild Bot. Daily quizzes, formulas, and STEM discussions.',
    isBot: true,
    isOfficial: true,
  },
  {
    name: 'High School Art Bot',
    username: 'highschool_art',
    email: 'bot_hs_art@scholarhub.dev',
    track: 'Art',
    level: 'High School',
    bio: 'Official High School Arts, History & Literature Bot. Daily discussions and creative prompts.',
    isBot: true,
    isOfficial: true,
  },
  {
    name: 'High School Commerce Bot',
    username: 'highschool_commerce',
    email: 'bot_hs_commerce@scholarhub.dev',
    track: 'Commercial',
    level: 'High School',
    bio: 'Official High School Commerce & Economics Bot. Business concepts, accounting, and finance basics.',
    isBot: true,
    isOfficial: true,
  },
  {
    name: 'University Law Guild Bot',
    username: 'uni_law',
    email: 'bot_uni_law@scholarhub.dev',
    track: 'Law',
    level: 'University',
    bio: 'Official University Law & Legal Reasoning Bot. Case law studies, legal principles, and mock debate polls.',
    isBot: true,
    isOfficial: true,
  },
  {
    name: 'Medical Sciences Guild Bot',
    username: 'uni_med',
    email: 'bot_uni_med@scholarhub.dev',
    track: 'Medical Science',
    level: 'University',
    bio: 'Official Medical & Clinical Sciences Bot. Anatomy breakdowns, medical trivia, and pharmacology challenges.',
    isBot: true,
    isOfficial: true,
  },
  {
    name: 'Political Science Guild Bot',
    username: 'uni_polsci',
    email: 'bot_uni_polsci@scholarhub.dev',
    track: 'Political Science',
    level: 'University',
    bio: 'Official Political Science & Governance Bot. International relations, policy analysis, and governance debate.',
    isBot: true,
    isOfficial: true,
  },
  {
    name: 'Accounting & Finance Bot',
    username: 'uni_accounting',
    email: 'bot_uni_accounting@scholarhub.dev',
    track: 'Accounting',
    level: 'University',
    bio: 'Official Accounting, Auditing & Financial Analytics Bot. Balance sheets, tax law, and financial modeling.',
    isBot: true,
    isOfficial: true,
  },
  {
    name: 'UI/UX Design Studio Bot',
    username: 'pro_uiux',
    email: 'bot_pro_uiux@scholarhub.dev',
    track: 'UI/UX & Product Design Studio',
    level: 'Pro Skill',
    bio: 'Official UI/UX & Product Design Studio Bot. Design critiques, Figma techniques, and usability polls.',
    isBot: true,
    isOfficial: true,
  },
  {
    name: 'Web & App Engineering Bot',
    username: 'pro_webdev',
    email: 'bot_pro_webdev@scholarhub.dev',
    track: 'Web & Mobile App Engineering',
    level: 'Pro Skill',
    bio: 'Official Web & Mobile Engineering Bot. Frontend, backend, React, Next.js, and system architecture tips.',
    isBot: true,
    isOfficial: true,
  },
  {
    name: 'Data Science & AI Lab Bot',
    username: 'pro_data',
    email: 'bot_pro_data@scholarhub.dev',
    track: 'Data Science & AI Lab',
    level: 'Pro Skill',
    bio: 'Official Data Science & Artificial Intelligence Bot. Python, ML models, neural networks, and data analytics.',
    isBot: true,
    isOfficial: true,
  },
]

async function seedBots() {
  console.log('[SEED BOTS] Creating 10 Official Track-Specific AI Bot Accounts...')
  const botPassword = await bcrypt.hash('BotSecretPassword2026!', 10)

  for (const botData of BOTS) {
    try {
      const existing = await prisma.user.findFirst({
        where: { email: botData.email }
      })

      if (existing) {
        console.log(`[BOT EXISTS] @${botData.username} already present.`)
        continue
      }

      const created = await prisma.user.create({
        data: {
          name: botData.name,
          username: botData.username,
          email: botData.email,
          password: botPassword,
          level: botData.level,
          track: botData.track,
          bio: botData.bio,
          isVerified: true,
          isAdmin: false,
          scholarScore: 1000,
          coins: 500,
        }
      })
      console.log(`[BOT CREATED] Created official bot @${created.username} (ID: ${created.id})`)
    } catch (err) {
      console.error(`[BOT SEED ERROR] Could not seed @${botData.username}:`, err.message)
    }
  }

  console.log('[SEED BOTS COMPLETE] All 10 Track AI Bots Ready!')
}

seedBots()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
