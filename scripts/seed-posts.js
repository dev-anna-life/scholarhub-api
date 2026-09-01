const prisma = require('../lib/prisma')

const POSTS = [
  {
    botUsername: 'highschool_science',
    title: 'Daily Science Poll: Electricity & Current ⚡',
    content: 'Have you answered your High School Science question today?\n\nWhat is the SI unit of electric current?\nA) Volt\nB) Ampere\nC) Ohm\nD) Watt\n\nDrop your answer below with your explanation! #STEM #PhysicsQuiz',
    category: 'Science',
  },
  {
    botUsername: 'highschool_science',
    title: 'Periodic Table Mastery: Chemical Elements 🧪',
    content: 'Which element on the periodic table has the highest electronegativity?\n\nA) Oxygen\nB) Chlorine\nC) Fluorine\nD) Nitrogen\n\nExplain why electronegativity increases across periods! #Chemistry #HighSchoolScience',
    category: 'Science',
  },
  {
    botUsername: 'uni_law',
    title: 'Legal Principles Quiz: Natural Justice ⚖️',
    content: 'Law Scholars Challenge: Which principle of natural justice translates to "Hear the other side"?\n\nA) Nemo judex in causa sua\nB) Audi alteram partem\nC) Stare decisis\nD) Res ipsa loquitur\n\nHow is this principle applied in administrative tribunal hearings? #LawGuild #LegalStudies',
    category: 'Law',
  },
  {
    botUsername: 'uni_med',
    title: 'Anatomy Challenge: Human Endocrinology 🩺',
    content: 'Medical Sciences Poll: Which gland in the human endocrine system produces insulin?\n\nA) Thyroid Gland\nB) Adrenal Gland\nC) Pancreas\nD) Pituitary Gland\n\nBonus question: Which specific cells within the organ secrete insulin? #MedGuild #Anatomy',
    category: 'Medical Science',
  },
  {
    botUsername: 'pro_uiux',
    title: 'Product Design Challenge: Touch Target Sizing 🎨',
    content: 'UI/UX Designers Quiz: What is Apple\'s Human Interface Guidelines recommended minimum touch target size for mobile UI buttons?\n\nA) 24 x 24 pt\nB) 32 x 32 pt\nC) 44 x 44 pt\nD) 60 x 60 pt\n\nWhy is touch target padding critical for accessibility? #UIUX #ProductDesign',
    category: 'UI/UX & Product Design Studio',
  },
  {
    botUsername: 'pro_webdev',
    title: 'Web Engineering Poll: React Hooks & State 💻',
    content: 'Fullstack Engineers Quiz: What is the primary purpose of the useMemo hook in React?\n\nA) Memoizing computed values to avoid expensive recalculations\nB) Triggering side effects after render\nC) Creating persistent DOM references\nD) Managing global state\n\nWhen should you avoid overusing useMemo? #WebDev #ReactJS',
    category: 'Web & Mobile App Engineering',
  },
]

async function seedPosts() {
  console.log('[SEED POSTS] Creating initial track posts and interactive poll quizzes...')

  for (const item of POSTS) {
    const bot = await prisma.user.findFirst({
      where: { username: item.botUsername }
    })

    if (!bot) {
      console.log(`[BOT NOT FOUND] @${item.botUsername} missing. Skipping post.`)
      continue
    }

    const existingPost = await prisma.post.findFirst({
      where: { title: item.title, authorId: bot.id }
    })

    if (existingPost) {
      console.log(`[POST EXISTS] "${item.title}" already present.`)
      continue
    }

    const post = await prisma.post.create({
      data: {
        title: item.title,
        content: item.content,
        category: item.category,
        status: 'approved',
        trending: true,
        authorId: bot.id,
      }
    })
    console.log(`[POST CREATED] Created post "${post.title}" by @${bot.username}`)
  }

  console.log('[SEED POSTS COMPLETE] All Track Posts Seeding Complete!')
}

seedPosts()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
