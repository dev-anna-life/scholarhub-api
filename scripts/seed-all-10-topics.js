const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DIRECT_URL || 'postgresql://postgres.njiomdxbinfqzczlptfp:ScholarHub2026!Secure@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'
});

const LESSONS = [
  {
    username: 'highschool_science',
    title: 'Secondary Chemistry: The Periodic Table & Electronegativity Trends',
    category: 'Sciences',
    citationSource: 'Cambridge IGCSE Chemistry & Linus Pauling Electronegativity Scale',
    quizQuestion: 'Which element has the highest electronegativity value on the Pauling scale?',
    quizOptions: ['Fluorine', 'Oxygen', 'Chlorine', 'Sodium'],
    correctOptionIndex: 0,
    content: `THE SIMPLE CONCEPT:
Electronegativity is the measure of how strongly an atom attracts bonded electrons towards itself. Fluorine is the most electronegative element on the entire periodic table.

PERIODIC TABLE TRENDS:
• Across a Period (Left to Right): Electronegativity INCREASES due to increased nuclear charge pulling electrons tighter.
• Down a Group (Top to Bottom): Electronegativity DECREASES due to extra electron shielding and increased atomic radius.

KEY TAKEAWAY MEMORY RULE:
Electronegativity increases up and to the right, peaking at Fluorine (F)!

VERIFIED ACADEMIC REFERENCE:
Verified Source: Cambridge IGCSE Chemistry & Linus Pauling Electronegativity Scale`
  },
  {
    username: 'highschool_art',
    title: 'Literature in English: Understanding Dramatic Irony in Shakespeare\'s Macbeth',
    category: 'Arts & Humanities',
    citationSource: 'Cambridge International A-Level Literature & Oxford Companion to English Literature',
    quizQuestion: 'What defines dramatic irony in literature?',
    quizOptions: ['The audience knows key facts that characters do not', 'Characters know everything while the audience is confused', 'When the opposite of what is expected happens in nature', 'A humorous play on words with multiple meanings'],
    correctOptionIndex: 0,
    content: `THE SIMPLE CONCEPT:
Dramatic irony occurs when the audience or reader knows a critical piece of information that the character in the play does not know. This creates tension, suspense, and emotional anticipation.

KEY LITERARY EXAMPLE:
In Shakespeare's "Macbeth", King Duncan trusts Macbeth completely and praises his castle as pleasant ("This castle hath a pleasant seat..."), while the audience already knows Macbeth and Lady Macbeth are plotting Duncan's murder that very night.

KEY TAKEAWAY MEMORY RULE:
Audience knows the secret + Character is unaware = Dramatic Irony.

VERIFIED ACADEMIC REFERENCE:
Verified Source: Cambridge International A-Level Literature & Oxford Companion to English Literature`
  },
  {
    username: 'highschool_commerce',
    title: 'Secondary Commerce: Principles of Insurance & Utmost Good Faith',
    category: 'Commerce',
    citationSource: 'WAEC & Cambridge Business Studies Curriculum',
    quizQuestion: 'What does the insurance doctrine of "Uberrimae Fidei" require?',
    quizOptions: ['Both parties must disclose all material facts honestly', 'The insurer must pay claims regardless of fraud', 'Premiums must remain flat for ten years', 'The insured can withhold prior accident history'],
    correctOptionIndex: 0,
    content: `THE SIMPLE CONCEPT:
Uberrimae Fidei (Utmost Good Faith) is the foundational rule of insurance. Both the insured person and the insurance company must disclose all material facts honestly and completely before entering into a contract.

KEY PRACTICAL EXAMPLE:
If an applicant for car insurance fails to disclose that their previous driving license was revoked, the insurer has the legal right to void the policy and refuse payment when an accident occurs, because the non-disclosure breaches utmost good faith.

KEY TAKEAWAY MEMORY RULE:
Hide any material fact = Policy voided under Utmost Good Faith.

VERIFIED ACADEMIC REFERENCE:
Verified Source: WAEC & Cambridge Business Studies Curriculum`
  },
  {
    username: 'uni_law',
    title: 'University Law: Contract Law & The Doctrine of Consideration',
    category: 'Law',
    citationSource: 'Chitty on Contracts & Nigerian Law of Contract',
    quizQuestion: 'In contract law, what is the legal status of "past consideration"?',
    quizOptions: ['It is generally invalid and cannot support a new promise', 'It is always legally binding', 'It automatically replaces new consideration', 'It only applies to international shipping'],
    correctOptionIndex: 0,
    content: `THE SIMPLE CONCEPT:
In common law contract, a promise is not legally enforceable unless it is supported by consideration. Consideration is the price paid by one party for the promise of the other—a legal benefit received or a detriment suffered.

LANDMARK LEGAL CASE:
• Case: Currie v. Misa (1875)
• Legal Rule: "A valuable consideration in the eye of the law may consist either in some right, interest, profit, or benefit accruing to the one party, or some forbearance, detriment, loss, or responsibility given, suffered, or undertaken by the other."

KEY TAKEAWAY MEMORY RULE:
Past consideration is no consideration! Consideration must be sufficient, but need not be adequate.

VERIFIED ACADEMIC REFERENCE:
Verified Source: Chitty on Contracts & Nigerian Law of Contract (Sagay)`
  },
  {
    username: 'uni_med',
    title: 'Medical Sciences: Renal Physiology & The Renin-Angiotensin-Aldosterone System (RAAS)',
    category: 'Medicine',
    citationSource: 'Guyton and Hall Textbook of Medical Physiology (14th Edition)',
    quizQuestion: 'Where is Angiotensin-Converting Enzyme (ACE) primarily located in the body?',
    quizOptions: ['Pulmonary vascular endothelium (lungs)', 'Renal collecting ducts', 'Adrenal medulla', 'Pancreatic islets'],
    correctOptionIndex: 0,
    content: `THE SIMPLE CONCEPT:
The RAAS is a hormone system that regulates long-term blood pressure and fluid balance. When blood pressure or sodium levels drop, the kidneys release the enzyme Renin to restore balance.

STEP-BY-STEP BIOCHEMICAL PATHWAY:
1. Low kidney perfusion triggers Juxtaglomerular cells to secrete Renin.
2. Renin converts Angiotensinogen (from liver) into Angiotensin I.
3. ACE (Angiotensin-Converting Enzyme) in pulmonary capillaries converts Angiotensin I into Angiotensin II.
4. Angiotensin II triggers vasoconstriction and stimulates Aldosterone from adrenal cortex to retain sodium and water.

CLINICAL APPLICATION:
ACE inhibitors (e.g., Lisinopril) block ACE, lowering blood pressure in hypertensive patients.

VERIFIED ACADEMIC REFERENCE:
Verified Source: Guyton and Hall Textbook of Medical Physiology (14th Edition)`
  },
  {
    username: 'uni_polsci',
    title: 'Political Science: The Separation of Powers Doctrine (Montesquieu)',
    category: 'Law',
    citationSource: 'Baron de Montesquieu, The Spirit of the Laws (1748) & Nigerian Constitution',
    quizQuestion: 'Who formulated the modern doctrine of the Separation of Powers in 1748?',
    quizOptions: ['Baron de Montesquieu', 'Thomas Hobbes', 'Niccolò Machiavelli', 'Karl Marx'],
    correctOptionIndex: 0,
    content: `THE SIMPLE CONCEPT:
To prevent tyranny and arbitrary rule, governmental authority must be divided into three independent branches: the Legislature (makes laws), the Executive (enforces laws), and the Judiciary (interprets laws).

CONSTITUTIONAL CHECKS & BALANCES:
No single branch holds unchecked authority. For instance, the Legislature passes statutory bills, the Executive president can sign or veto them, and the Supreme Court has the judicial review power to declare unconstitutional laws void.

KEY TAKEAWAY MEMORY RULE:
Separation of Powers divides governmental power; Checks and Balances keeps each branch accountable.

VERIFIED ACADEMIC REFERENCE:
Verified Source: Baron de Montesquieu, The Spirit of the Laws (1748) & Nigerian 1999 Constitution (Sections 4, 5, 6)`
  },
  {
    username: 'uni_accounting',
    title: 'Financial Accounting: Double-Entry Bookkeeping & The Accounting Equation',
    category: 'Commerce',
    citationSource: 'International Financial Reporting Standards (IFRS) & ACCA Guidelines',
    quizQuestion: 'According to the fundamental accounting equation, Assets must equal which of the following?',
    quizOptions: ['Liabilities + Equity', 'Liabilities - Equity', 'Revenue - Expenses', 'Current Assets / Current Liabilities'],
    correctOptionIndex: 0,
    content: `THE SIMPLE CONCEPT:
Every business transaction affects at least two accounts with equal debits and credits. The balance sheet must always maintain mathematical equality across resources and claims.

CORE FORMULA & BALANCE RULE:
• The Fundamental Accounting Equation: Assets = Liabilities + Equity
• Debit Rule (DEAD): Debit Expenses, Assets, and Drawings to increase them.
• Credit Rule (CLIC): Credit Liabilities, Income, and Capital to increase them.

KEY TAKEAWAY MEMORY RULE:
For every debit entry recorded, there must be a matching credit entry of equal value!

VERIFIED ACADEMIC REFERENCE:
Verified Source: International Financial Reporting Standards (IFRS) & ACCA Financial Accounting Guidelines`
  },
  {
    username: 'pro_uiux',
    title: 'Product Design: The 60-30-10 Color Rule in Mobile User Interface Design',
    category: 'Arts & Humanities',
    citationSource: 'Apple Human Interface Guidelines (HIG) & Material Design 3',
    quizQuestion: 'In the 60-30-10 UI design rule, what elements should the 10% accent color be reserved for?',
    quizOptions: ['Call-to-Action buttons and key interactive elements', 'The main canvas background', 'Body paragraphs of text', 'The header navigation background'],
    correctOptionIndex: 0,
    content: `THE SIMPLE CONCEPT:
The 60-30-10 rule is an interior and interface design principle that creates visual harmony and hierarchy on screens without overwhelming the user's eye.

THE 3-TIER RATIO BREAKDOWN:
• 60% Dominant Base Color: The canvas, background, or dominant whitespace (usually clean neutral tones like white, cream, or dark gray).
• 30% Secondary Supporting Color: Cards, navigation bars, headers, and sidebars that create structural boundaries.
• 10% Vibrant Accent Color: Primary Call-to-Action (CTA) buttons, notifications, badges, and active state highlights.

PRO UI RULE:
Never use your accent color on large background areas—reserve it for actions you want users to tap!

VERIFIED ACADEMIC REFERENCE:
Verified Source: Apple Human Interface Guidelines (HIG) & Material Design 3 Documentation`
  },
  {
    username: 'pro_webdev',
    title: 'Web Engineering: Understanding JavaScript Event Loop & Microtask Queue',
    category: 'Technology & Engineering',
    citationSource: 'MDN Web Docs & ECMAScript Language Specification (ECMA-262)',
    quizQuestion: 'Which queue has higher execution priority in the JavaScript Event Loop?',
    quizOptions: ['Microtask Queue (Promises)', 'Macrotask Queue (setTimeout)', 'Rendering Queue', 'Garbage Collection Queue'],
    correctOptionIndex: 0,
    content: `THE SIMPLE CONCEPT:
JavaScript is single-threaded, meaning it can only execute one command at a time. The Event Loop enables non-blocking asynchronous programming by delegating background tasks to the browser runtime.

EXECUTION ORDER PRIORITY:
1. Call Stack (Synchronous code executes immediately).
2. Microtask Queue (Promise callbacks, process.nextTick, queueMicrotask) - completely drained before moving on!
3. Macrotask Queue (setTimeout, setInterval, setImmediate, I/O events).

CODE EXECUTION ORDER QUIZ:
console.log('1'); setTimeout(() => console.log('2'), 0); Promise.resolve().then(() => console.log('3'));
Output order will always be: 1, 3, 2!

VERIFIED INDUSTRY REFERENCE:
Verified Source: MDN Web Docs & ECMAScript Language Specification (ECMA-262)`
  },
  {
    username: 'pro_data',
    title: 'Data Science & AI: Overfitting vs Underfitting in Machine Learning Models',
    category: 'Technology & Engineering',
    citationSource: 'Scikit-Learn Documentation & Deep Learning (MIT Press)',
    quizQuestion: 'Which scenario strongly indicates that a machine learning model is overfitting?',
    quizOptions: ['99% accuracy on training data but 55% accuracy on test data', 'Equal accuracy on both training and validation sets', 'Low accuracy on both training and test data', 'Fast convergence during gradient descent'],
    correctOptionIndex: 0,
    content: `THE SIMPLE CONCEPT:
A machine learning model must learn general underlying patterns rather than memorizing training data noise. Overfitting happens when a model learns the training data too well, failing on unseen real-world data.

THE BIAS-VARIANCE TRADEOFF:
• Underfitting (High Bias): The model is too simple to capture trends (e.g., linear regression on non-linear data).
• Overfitting (High Variance): The model memorizes training noise (e.g., deep unpruned decision trees).
• Prevention Techniques: Cross-validation (K-Fold), L1/L2 Regularization, Dropout, and pruning.

KEY TAKEAWAY MEMORY RULE:
High training accuracy + Poor test accuracy = Overfitting!

VERIFIED ACADEMIC REFERENCE:
Verified Source: Scikit-Learn Documentation & Deep Learning (Goodfellow, Bengio, Courville - MIT Press)`
  }
];

function generateCuid() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `cm${timestamp}${randomPart}`;
}

async function main() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL database.');

  // Fetch bot users map
  const botsRes = await client.query('SELECT id, username FROM "User" WHERE username IS NOT NULL');
  const botMap = {};
  botsRes.rows.forEach(b => {
    botMap[b.username] = b.id;
  });

  console.log('Loaded bot map with', Object.keys(botMap).length, 'users.');

  for (const lesson of LESSONS) {
    const authorId = botMap[lesson.username];
    if (!authorId) {
      console.warn(`Bot ${lesson.username} not found in database! Skipping.`);
      continue;
    }

    const citationSummary = JSON.stringify({
      quizQuestion: lesson.quizQuestion,
      quizOptions: lesson.quizOptions,
      correctOptionIndex: lesson.correctOptionIndex,
      summary: 'Official Verified AI Lesson'
    });

    const postId = generateCuid();
    const query = `
      INSERT INTO "Post" (
        "id", "title", "content", "category", "citationSource", "citationStatus",
        "citationSummary", "isAiAssisted", "authorId", "status", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id, title;
    `;

    const values = [
      postId,
      lesson.title,
      lesson.content,
      lesson.category,
      lesson.citationSource,
      'verified',
      citationSummary,
      true,
      authorId,
      'approved'
    ];

    const insertRes = await client.query(query, values);
    console.log(`Successfully seeded [${lesson.username}]: ${insertRes.rows[0].title} (ID: ${insertRes.rows[0].id})`);
  }

  await client.end();
  console.log('All 10 AI topics successfully seeded!');
}

main().catch(err => {
  console.error('Seeding error:', err);
  client.end().finally(() => process.exit(1));
});
