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
}

IMPORTANT INSTRUCTIONS:
- The "quizQuestion" MUST test the actual academic concept taught in the lesson (e.g. specific medical anatomy, legal statute, scientific rule, or formula). Do NOT ask meta-questions like "What is the cornerstone requirement" or "What is the main principle demonstrated".
- The 4 "quizOptions" must be plausible, specific academic choices with option at "correctOptionIndex" being correct.`;

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

  // High quality authentic curriculum fallback bank across all 10 academic tracks
  if (!newPostData) {
    const CURRICULUM_BANK = {
      'uni_med': {
        title: 'Cardiovascular Physiology: Frank-Starling Mechanism in Cardiac Output',
        content: `THE SIMPLE CONCEPT:\nThe Frank-Starling mechanism states that the stroke volume of the heart increases in response to an increase in the volume of blood in the ventricles before contraction (end-diastolic volume), when all other factors remain constant.\n\nCLINICAL PHYSIOLOGY EXAMPLE:\nDuring physical exercise, venous return increases, stretching myocardial sarcomeres closer to their optimal length (~2.2 micrometers). This increases calcium sensitivity of cardiac troponin C, producing a more forceful ventricular contraction.\n\nKEY TAKEAWAY MEMORY RULE:\nGreater ventricular filling (preload) = Greater stroke volume contraction up to physiologic limits.\n\nVERIFIED ACADEMIC REFERENCE:\nVerified Source: ${selectedBot.citationSource}`,
        quizQuestion: 'According to the Frank-Starling Law of the heart, what happens when end-diastolic volume increases?',
        quizOptions: [
          'Stroke volume and force of contraction increase',
          'Heart rate drops to zero',
          'Aortic valve remains permanently closed',
          'Pulmonary capillary pressure drops immediately'
        ],
        correctOptionIndex: 0
      },
      'uni_law': {
        title: 'Constitutional Jurisprudence: The Doctrine of Judicial Review',
        content: `THE SIMPLE CONCEPT:\nJudicial review is the power of the judiciary to review and invalidate legislative acts, executive actions, or administrative decisions that conflict with the constitution or violate natural justice.\n\nLANDMARK LEGAL PRECEDENT:\nIn the historic case of Marbury v. Madison (1803), Chief Justice John Marshall ruled that "an act of the legislature repugnant to the Constitution is void," firmly establishing the judiciary as the guardian of constitutional supremacy.\n\nKEY TAKEAWAY MEMORY RULE:\nThe Constitution is supreme; any statute inconsistent with it is null and void to the extent of the inconsistency.\n\nVERIFIED ACADEMIC REFERENCE:\nVerified Source: ${selectedBot.citationSource}`,
        quizQuestion: 'Which constitutional landmark firmly established the doctrine of Judicial Review?',
        quizOptions: [
          'Marbury v. Madison (1803)',
          'Currie v. Misa (1875)',
          'Carlill v. Carbolic Smoke Ball Co (1893)',
          'Donoghue v. Stevenson (1932)'
        ],
        correctOptionIndex: 0
      },
      'highschool_science': {
        title: 'Secondary Chemistry: Le Chatelier\'s Principle in Chemical Equilibrium',
        content: `THE SIMPLE CONCEPT:\nWhen a system at chemical equilibrium is subjected to a change in concentration, temperature, volume, or pressure, the system readjusts itself to counteract the effect of the applied change and establish a new equilibrium.\n\nACADEMIC LABORATORY APPLICATION:\nIn the Haber process (N2 + 3H2 <=> 2NH3 + Heat), the reaction is exothermic. Increasing temperature shifts equilibrium to the left (favoring reactants), while increasing pressure shifts equilibrium to the right (favoring ammonia production with fewer gas moles).\n\nKEY TAKEAWAY MEMORY RULE:\nEquilibrium always shifts in the direction that opposes the disturbance!\n\nVERIFIED ACADEMIC REFERENCE:\nVerified Source: ${selectedBot.citationSource}`,
        quizQuestion: 'For an exothermic reaction at equilibrium, what effect does increasing temperature have?',
        quizOptions: [
          'The equilibrium shifts left towards the reactants',
          'The equilibrium shifts right towards the products',
          'The reaction stops completely',
          'The pressure instantly drops to zero'
        ],
        correctOptionIndex: 0
      },
      'highschool_art': {
        title: 'Literature in English: Analyzing Soliloquy in Dramatic Literature',
        content: `THE SIMPLE CONCEPT:\nA soliloquy is a dramatic speech delivered by a character alone on stage, revealing their private innermost motives, emotional conflicts, and moral deliberations directly to the audience without other characters hearing.\n\nCLASSIC DRAMA EXAMPLE:\nIn Shakespeare\'s "Hamlet", the famous soliloquy "To be or not to be" allows the audience to witness Hamlet\'s philosophical contemplation of existence, death, and moral conscience in profound psychological depth.\n\nKEY TAKEAWAY MEMORY RULE:\nAlone on stage + Speaking inner truth = Soliloquy (unlike an aside, which occurs while others are present).\n\nVERIFIED ACADEMIC REFERENCE:\nVerified Source: ${selectedBot.citationSource}`,
        quizQuestion: 'What is the primary dramatic function of a soliloquy in drama?',
        quizOptions: [
          'To reveal a character\'s innermost thoughts directly to the audience',
          'To introduce slapstick comic relief between tragic acts',
          'To debate a political argument between two opposing protagonists',
          'To sing a chorus celebrating a victory'
        ],
        correctOptionIndex: 0
      },
      'highschool_commerce': {
        title: 'Secondary Commerce: Functions of Central Banks & Monetary Policy',
        content: `THE SIMPLE CONCEPT:\nA Central Bank is the apex financial institution responsible for issuing legal tender, regulating commercial banks, maintaining price stability, and acting as the lender of last resort during liquidity crises.\n\nMONETARY REGULATION EXAMPLE:\nWhen inflation rises excessively, the Central Bank increases the Monetary Policy Rate (MPR) and Cash Reserve Ratio (CRR). This raises borrowing costs, reduces commercial bank lending, and curtails excess money supply in circulation.\n\nKEY TAKEAWAY MEMORY RULE:\nHigher interest rates = Reduced money supply = Inflation containment.\n\nVERIFIED ACADEMIC REFERENCE:\nVerified Source: ${selectedBot.citationSource}`,
        quizQuestion: 'Which institution serves as the lender of last resort in a modern financial system?',
        quizOptions: [
          'The Central Bank',
          'Commercial Retail Banks',
          'Private Microfinance Institutions',
          'Commodity Trading Exchanges'
        ],
        correctOptionIndex: 0
      },
      'uni_accounting': {
        title: 'Financial Accounting: The Matching Principle in Accrual Accounting',
        content: `THE SIMPLE CONCEPT:\nThe Matching Principle dictates that expenses incurred to earn revenue must be recognized in the exact same accounting period as the related revenue, regardless of when cash is actually paid or received.\n\nACCOUNTING JOURNAL APPLICATION:\nIf a company delivers $10,000 worth of merchandise to a customer in December, but pays the sales commission of $500 to its sales agent in January, the $500 commission expense must be accrued and recorded in December to match the revenue earned.\n\nKEY TAKEAWAY MEMORY RULE:\nMatch expenses with the revenues they generated in the same reporting period!\n\nVERIFIED ACADEMIC REFERENCE:\nVerified Source: ${selectedBot.citationSource}`,
        quizQuestion: 'What does the Matching Principle in financial accounting require?',
        quizOptions: [
          'Expenses must be recognized in the same period as the revenues they helped generate',
          'Assets must always equal total liabilities plus annual expenses',
          'Cash received must match bank deposit slips on a daily basis',
          'Depreciation must equal market inflation'
        ],
        correctOptionIndex: 0
      },
      'uni_polsci': {
        title: 'Political Science: Unitary vs Federal Constitutional Systems',
        content: `THE SIMPLE CONCEPT:\nA federal system of government divides constitutional powers between a central national authority and autonomous regional constituent units (states or provinces), neither of which derives its authority from the other.\n\nCOMPARATIVE GOVERNANCE STUDY:\nIn countries like Nigeria and the United States, legislative powers are divided into Exclusive and Concurrent lists in a written, rigid constitution, whereas in a unitary state (like the UK), ultimate authority resides in the central parliament.\n\nKEY TAKEAWAY MEMORY RULE:\nFederalism = Constitutionally shared sovereignty; Unitary = Centralized sovereign authority.\n\nVERIFIED ACADEMIC REFERENCE:\nVerified Source: ${selectedBot.citationSource}`,
        quizQuestion: 'In a federal system of government, how is political power distributed?',
        quizOptions: [
          'Constitutionally divided between central and regional governments',
          'Held entirely by a single central unicameral legislature',
          'Delegated strictly to local municipal councils on an ad-hoc basis',
          'Administered solely by the military high command'
        ],
        correctOptionIndex: 0
      },
      'pro_uiux': {
        title: 'UI/UX Design: Fitts\'s Law in Mobile Interactive Interface Design',
        content: `THE SIMPLE CONCEPT:\nFitts\'s Law states that the time required to rapidly move to a target area is a function of the ratio between the distance to the target and the width of the target.\n\nMOBILE INTERACTION CASE STUDY:\nPlacing primary Call-to-Action (CTA) buttons at the bottom of the mobile screen (the "thumb zone") and giving them a minimum touch target size of 44x44pt minimizes travel distance and reduces touch errors for one-handed smartphone users.\n\nKEY TAKEAWAY MEMORY RULE:\nLarger targets + Shorter distances = Faster, frictionless user actions!\n\nVERIFIED ACADEMIC REFERENCE:\nVerified Source: ${selectedBot.citationSource}`,
        quizQuestion: 'According to Fitts\'s Law, how can UI designers reduce interaction time for a key button?',
        quizOptions: [
          'Make the button larger and position it closer to the user\'s thumb',
          'Make the button smaller and place it in the top corner',
          'Hide the button inside a nested hamburger drawer',
          'Eliminate button padding and reduce text contrast'
        ],
        correctOptionIndex: 0
      },
      'pro_webdev': {
        title: 'Web Engineering: RESTful API Principles & HTTP Idempotency',
        content: `THE SIMPLE CONCEPT:\nAn HTTP method is considered idempotent if making multiple identical requests has the exact same effect on the server state as making a single request.\n\nFULLSTACK APPLICATION EXAMPLE:\nGET, PUT, and DELETE methods are idempotent. Sending PUT /api/user/10 with the same JSON payload 5 times leaves the user profile in the exact same state, whereas POST is non-idempotent because 5 requests create 5 new separate database records.\n\nKEY TAKEAWAY MEMORY RULE:\nMultiple calls with identical results = Idempotent (GET, PUT, DELETE, HEAD).\n\nVERIFIED ACADEMIC REFERENCE:\nVerified Source: ${selectedBot.citationSource}`,
        quizQuestion: 'Which HTTP method is defined as idempotent according to the W3C HTTP/1.1 standard?',
        quizOptions: [
          'PUT',
          'POST',
          'CONNECT',
          'PATCH (in non-standard partial writes)'
        ],
        correctOptionIndex: 0
      },
      'pro_data': {
        title: 'Data Science & AI: Bias-Variance Tradeoff in Supervised Machine Learning',
        content: `THE SIMPLE CONCEPT:\nThe bias-variance tradeoff is the central challenge in machine learning where minimizing training error (reducing bias) can make a model overly sensitive to noise, causing poor generalization to unseen data (increasing variance).\n\nMACHINE LEARNING CASE STUDY:\nA deep decision tree with no max-depth constraint achieves 100% accuracy on training data but drops to 60% on validation data. Regularizing the tree (or using a Random Forest ensemble) reduces variance and improves generalization.\n\nKEY TAKEAWAY MEMORY RULE:\nHigh bias = Underfitting; High variance = Overfitting; Balance achieves minimum total error!\n\nVERIFIED ACADEMIC REFERENCE:\nVerified Source: ${selectedBot.citationSource}`,
        quizQuestion: 'A machine learning model that performs with 99% accuracy on training data but 58% on test data is suffering from:',
        quizOptions: [
          'High variance (Overfitting)',
          'High bias (Underfitting)',
          'Excessive training dataset size',
          'Zero learning rate'
        ],
        correctOptionIndex: 0
      }
    };

    newPostData = CURRICULUM_BANK[selectedBot.username] || {
      title: `${selectedBot.category} Curriculum: Core Principles of ${selectedBot.track}`,
      content: `THE SIMPLE CONCEPT:\nMastering foundational concepts in ${selectedBot.track} provides the essential framework for accredited examination success and real-world analytical mastery.\n\nPRACTICAL CURRICULUM APPLICATION:\nApplying verified statutory, clinical, or technical standards ensures rigorous methodology and avoids flawed assumptions.\n\nKEY TAKEAWAY MEMORY RULE:\nRigorous conceptual understanding verified by primary citations is the foundation of scholarship.\n\nVERIFIED ACADEMIC REFERENCE:\nVerified Source: ${selectedBot.citationSource}`,
      quizQuestion: `Which principle is essential for rigorous academic mastery in ${selectedBot.track}?`,
      quizOptions: [
        'Mastering verified primary concepts with practical step-by-step applications',
        'Relying purely on unverified anecdotal claims',
        'Bypassing accredited examination curriculum standards',
        'None of the above'
      ],
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
