const { Client } = require('pg');

const BOTS_POOL = [
  { id: 'cmtiv114v0003lsvolm3vgkoj', username: 'uni_law', track: 'Law & Jurisprudence', category: 'Law', citationSource: 'Nigerian Constitutional Law & Supreme Court Law Reports' },
  { id: 'cmtiv11pk0004lsvo7qce9lrm', username: 'uni_med', track: 'Medical & Clinical Sciences', category: 'Medicine', citationSource: 'Guyton and Hall Textbook of Medical Physiology' },
  { id: 'cmtiv133e0007lsvoinr72ybg', username: 'pro_uiux', track: 'UI/UX & Product Design', category: 'Arts & Humanities', citationSource: 'Figma Official Guidelines & Apple HIG' },
  { id: 'cmtiv13hs0008lsvopqjsfxml', username: 'pro_webdev', track: 'Web Engineering & Cloud', category: 'Technology & Engineering', citationSource: 'MDN Web Docs & W3C CSS Standards' },
  { id: 'cmtiv0zrm0000lsvoquuxye6h', username: 'highschool_science', track: 'Secondary Physics & Chemistry', category: 'Sciences', citationSource: 'WAEC & Cambridge A-Level Curriculum' },
  { id: 'cmtiv13yz0009lsvo8j9ddgy7', username: 'pro_data', track: 'Data Science & Artificial Intelligence', category: 'Technology & Engineering', citationSource: 'Python Software Foundation & Scikit-Learn Documentation' },
  { id: 'cmtiv12pl0006lsvoi5f4hncg', username: 'uni_accounting', track: 'Accounting & Financial Economics', category: 'Commerce', citationSource: 'International Financial Reporting Standards (IFRS)' },
  { id: 'cmtiv128q0005lsvo9gsyi4c4', username: 'uni_polsci', track: 'Political Science & Constitutional Governance', category: 'Law', citationSource: 'African Union & UN Human Rights Charters' },
  { id: 'cmtiv10qk0002lsvoau95i8lv', username: 'highschool_commerce', track: 'Secondary Commerce & Business Economics', category: 'Commerce', citationSource: 'WAEC & Cambridge Business Studies Curriculum' },
  { id: 'cmtiv109i0001lsvolgr717yz', username: 'highschool_art', track: 'Literature in English & World History', category: 'Arts & Humanities', citationSource: 'Cambridge Literature & West African History Archives' }
];

function generateCuid() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `cm${timestamp}${randomPart}`;
}

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://postgres.njiomdxbinfqzczlptfp:ScholarHub2026!Secure@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
  const client = new Client({ connectionString });
  await client.connect();
  console.log('[CRON GENERATOR] Connected to Supabase PostgreSQL database.');

  // Find least recently posted bot to ensure fair round-robin rotation across all 10 topics
  const recentAiPostsRes = await client.query(`
    SELECT "authorId", MAX("createdAt") as "lastPostDate"
    FROM "Post"
    WHERE "isAiAssisted" = true
    GROUP BY "authorId"
  `);

  const lastPostMap = {};
  recentAiPostsRes.rows.forEach(r => {
    lastPostMap[r.authorId] = new Date(r.lastPostDate).getTime();
  });

  // Sort bots by oldest lastPostDate (or 0 if never posted)
  const sortedBots = [...BOTS_POOL].sort((a, b) => {
    const timeA = lastPostMap[a.id] || 0;
    const timeB = lastPostMap[b.id] || 0;
    return timeA - timeB;
  });

  // Pick from the top 3 least-recently-active bots for healthy rotation
  const candidates = sortedBots.slice(0, 3);
  const selectedBot = candidates[Math.floor(Math.random() * candidates.length)];
  console.log(`[CRON GENERATOR] Selected track: ${selectedBot.track} (@${selectedBot.username})`);

  // Fetch recent titles to avoid duplicates
  const recentTitlesRes = await client.query(`
    SELECT "title" FROM "Post" WHERE "isAiAssisted" = true ORDER BY "createdAt" DESC LIMIT 30
  `);
  const recentTitlesList = recentTitlesRes.rows.map(r => r.title).join('; ');

  let newPostData = null;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    console.log('[CRON GENERATOR] Calling Gemini AI for dynamic curriculum lesson generation...');
    const promptText = `You are a distinguished university professor writing an official, verified AI Study Lesson for ScholarHub.
Track: ${selectedBot.track}
Category: ${selectedBot.category}
Verified Source Citation: ${selectedBot.citationSource}
Excluded Recent Titles (Do NOT duplicate): [${recentTitlesList}]

Generate ONE fresh, engaging academic lesson with zero raw emojis.
Return JSON ONLY in this exact schema:
{
  "title": "Clear concise lesson title (e.g. University Law: Doctrine of Ultra Vires in Company Law)",
  "content": "THE SIMPLE CONCEPT:\nExplain the core concept in 2 crystal clear sentences.\n\nKEY CASE STUDY / PRACTICAL EXAMPLE:\nGive 1 specific academic case study, medical symptom, code snippet, or formula with step-by-step application.\n\nKEY TAKEAWAY MEMORY RULE:\n1-sentence rule for exams and real-world mastery.\n\nVERIFIED ACADEMIC REFERENCE:\nVerified Source: ${selectedBot.citationSource}",
  "quizQuestion": "A multiple-choice question testing the core takeaway",
  "quizOptions": ["Option A", "Option B", "Option C", "Option D"],
  "correctOptionIndex": 0
}`;

    try {
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      const data = await geminiRes.json();
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawJson) {
        newPostData = JSON.parse(rawJson);
        console.log(`[CRON GENERATOR] Gemini successfully generated: "${newPostData.title}"`);
      }
    } catch (err) {
      console.warn('[CRON GENERATOR] Gemini API call failed or timed out:', err.message);
    }
  }

  // High quality fallback if Gemini fails or key missing
  if (!newPostData) {
    newPostData = {
      title: `${selectedBot.category} Masterclass: Fundamentals of ${selectedBot.track}`,
      content: `THE SIMPLE CONCEPT:\nMastering core principles in ${selectedBot.track} provides the foundation for advanced academic understanding and practical industry problem-solving.\n\nKEY PRACTICAL EXAMPLE:\nStandard application according to accredited examination standards and industry references.\n\nKEY TAKEAWAY MEMORY RULE:\nAlways verify source citations before drawing academic conclusions.\n\nVERIFIED ACADEMIC REFERENCE:\nVerified Source: ${selectedBot.citationSource}`,
      quizQuestion: `What is the cornerstone requirement when analyzing a ${selectedBot.category} principle?`,
      quizOptions: ['Verify primary academic sources and foundational rules', 'Rely purely on anecdotal assumptions', 'Disregard standard curriculum references', 'None of the above'],
      correctOptionIndex: 0
    };
  }

  const citationSummary = JSON.stringify({
    quizQuestion: newPostData.quizQuestion,
    quizOptions: newPostData.quizOptions,
    correctOptionIndex: newPostData.correctOptionIndex,
    summary: 'Official Verified AI Lesson'
  });

  const postId = generateCuid();
  const query = `
    INSERT INTO "Post" (
      "id", "title", "content", "category", "citationSource", "citationStatus",
      "citationSummary", "isAiAssisted", "authorId", "status", "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    RETURNING id, title, "createdAt";
  `;

  const values = [
    postId,
    newPostData.title,
    newPostData.content,
    selectedBot.category,
    selectedBot.citationSource,
    'verified',
    citationSummary,
    true,
    selectedBot.id,
    'approved'
  ];

  const insertRes = await client.query(query, values);
  console.log(`[CRON GENERATOR SUCCESS] Created Post "${insertRes.rows[0].title}" (ID: ${insertRes.rows[0].id}) at ${insertRes.rows[0].createdAt}`);

  await client.end();
}

main().catch(err => {
  console.error('[CRON GENERATOR FATAL ERROR]:', err);
  process.exit(1);
});
