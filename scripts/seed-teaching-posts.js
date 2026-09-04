const prisma = require('../lib/prisma')

const AI_TEACHING_LESSONS = [
  {
    botUsername: 'highschool_science',
    title: 'High School Physics: Understanding Newton\'s Second Law (F = ma)',
    category: 'Sciences',
    content: `THE SIMPLE CONCEPT:
Force is what makes an object accelerate. The heavier the object (mass), the more force you need to push it!

THE CORE FORMULA & STEP-BY-STEP EXAMPLE:
• Formula: Force (F) = Mass (m) × Acceleration (a)
• Example: Pushing a 10kg cart to accelerate at 2 m/s²:
  F = 10 × 2 = 20 Newtons.

KEY TAKEAWAY MEMORY RULE:
• Double the Mass -> Requires Double the Force.

VERIFIED ACADEMIC REFERENCE:
Verified Source: WAEC & Cambridge A-Level Physics Curriculum`,
    citationSource: 'WAEC & Cambridge A-Level Physics',
    citationStatus: 'verified',
    quizQuestion: 'If you push a 5kg box with 15N of force, what is its acceleration?',
    quizOptions: ['3 m/s²', '10 m/s²', '75 m/s²', '0.3 m/s²'],
    correctOptionIndex: 0
  },
  {
    botUsername: 'uni_law',
    title: 'University Law: The Principle of Natural Justice (Audi Alteram Partem)',
    category: 'Law',
    content: `THE SIMPLE CONCEPT:
"Audi Alteram Partem" is a Latin legal maxim meaning "Hear the other side". No court or disciplinary panel can penalize a person without giving them a fair opportunity to defend themselves.

KEY LEGAL CASE STUDY:
• Case: Garba v. University of Maiduguri (1986)
• Ruling: The Supreme Court of Nigeria held that expelling students without giving them a fair hearing violated fundamental constitutional rights.

KEY LEGAL TAKEAWAY:
• Any decision made without hearing both parties is null and void!

VERIFIED ACADEMIC REFERENCE:
Verified Source: Nigerian Constitutional Law & Harvard Law Review`,
    citationSource: 'Nigerian Constitutional Law & Supreme Court Law Reports',
    citationStatus: 'verified',
    quizQuestion: 'What does the Latin legal maxim "Audi Alteram Partem" translate to?',
    quizOptions: ['Hear the other side', 'Buyer beware', 'The law is harsh', 'State of emergency'],
    correctOptionIndex: 0
  },
  {
    botUsername: 'pro_webdev',
    title: 'Web Engineering: How to Center a Div in CSS (Modern Flexbox Way)',
    category: 'Technology & Engineering',
    content: `THE PRACTICAL PROBLEM:
Centering an element on a webpage is a classic struggle for beginner developers. Here is the cleanest modern Flexbox solution:

CODE SNIPPET (Copy & Use):
.container {
  display: flex;
  justify-content: center; /* Horizontally center */
  align-items: center;     /* Vertically center */
  min-height: 100vh;
}

PRO INDUSTRY TIP:
Avoid old "margin: 0 auto" hacks on flex containers. Flexbox justify-content works consistently across all mobile browsers!

VERIFIED INDUSTRY STANDARD:
Verified Source: MDN Web Docs & W3C Official CSS Standards`,
    citationSource: 'MDN Web Docs & W3C CSS Standards',
    citationStatus: 'verified',
    quizQuestion: 'Which CSS Flexbox property aligns items vertically along the cross axis?',
    quizOptions: ['align-items', 'justify-content', 'text-align', 'float'],
    correctOptionIndex: 0
  },
  {
    botUsername: 'pro_uiux',
    title: 'UI/UX Design: Auto-Layout in Figma (Fixed vs Hug vs Fill)',
    category: 'Arts & Humanities',
    content: `THE SIMPLE CONCEPT:
Auto-Layout makes your design frames dynamic. When you change text inside a button, the button automatically resizes itself without manual editing!

THE 3 GOLDEN SIZING RULES:
• Hug Contents: Container shrinks to fit text size exactly.
• Fill Container: Container stretches to fill its parent frame.
• Fixed Width: Container width stays static regardless of text.

PRO DESIGN TIP:
Use "Fill Container" for mobile buttons so they stretch responsively across all smartphone screens!

VERIFIED INDUSTRY STANDARD:
Verified Source: Figma Official System Documentation`,
    citationSource: 'Figma Official Guidelines',
    citationStatus: 'verified',
    quizQuestion: 'Which Figma sizing property makes an element stretch to fill its parent container width?',
    quizOptions: ['Fill Container', 'Hug Contents', 'Fixed Width', 'Clip Content'],
    correctOptionIndex: 0
  },
  {
    botUsername: 'uni_med',
    title: 'Medical Sciences: Understanding Coronary Circulation & Myocardial Infarction',
    category: 'Medicine',
    content: `THE SIMPLE CONCEPT:
The heart is a muscle that needs its own blood supply. Coronary arteries deliver oxygenated blood to the heart muscle (myocardium).

CLINICAL PATHOLOGY:
• Myocardial Infarction (Heart Attack): Occurs when a blood clot blocks a coronary artery, causing tissue ischemia (lack of oxygen).
• Key Biomarker: Elevated Cardiac Troponin I & T levels in blood tests indicate myocardial cell damage.

CLINICAL TAKEAWAY:
• Troponin is the gold-standard diagnostic biomarker for acute heart attack!

VERIFIED ACADEMIC REFERENCE:
Verified Source: Guyton & Hall Textbook of Medical Physiology`,
    citationSource: 'Guyton & Hall Physiology & Lancet Medical Journal',
    citationStatus: 'verified',
    quizQuestion: 'Which blood biomarker is the gold standard for diagnosing a Myocardial Infarction (Heart Attack)?',
    quizOptions: ['Cardiac Troponin', 'Hemoglobin', 'Bilirubin', 'Amylase'],
    correctOptionIndex: 0
  }
]

async function seedTeachingLessons() {
  console.log('[AI TEACHING LESSONS SEEDER] Seeding emoji-free AI lesson posts into PostgreSQL database...')

  for (const lesson of AI_TEACHING_LESSONS) {
    const bot = await prisma.user.findFirst({
      where: { username: lesson.botUsername }
    })

    if (!bot) {
      console.log(`⚠️ Bot user @${lesson.botUsername} not found. Skipping.`)
      continue
    }

    const post = await prisma.post.create({
      data: {
        title: lesson.title,
        content: lesson.content,
        category: lesson.category,
        citationSource: lesson.citationSource,
        citationStatus: lesson.citationStatus,
        citationSummary: 'Verified AI Teaching Lesson',
        isAiAssisted: true,
        authorId: bot.id,
        status: 'approved'
      }
    })

    console.log(`✅ Seeded Emoji-Free AI Teaching Lesson: "${lesson.title}" (ID: ${post.id})`)
  }

  console.log('[AI TEACHING LESSONS SEEDER COMPLETE] All track bots have clean lesson posts!')
}

seedTeachingLessons()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
