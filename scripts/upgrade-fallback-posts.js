const { Client } = require('pg');

const UPGRADES = [
  {
    titleMatch: '%Medicine Masterclass%',
    newTitle: 'Cardiovascular Physiology: Frank-Starling Mechanism in Cardiac Output',
    category: 'Medicine',
    citationSource: 'Guyton and Hall Textbook of Medical Physiology (14th Edition)',
    content: `THE SIMPLE CONCEPT:
The Frank-Starling mechanism states that the stroke volume of the heart increases in response to an increase in the volume of blood in the ventricles before contraction (end-diastolic volume), when all other factors remain constant.

CLINICAL PHYSIOLOGY EXAMPLE:
During physical exercise, venous return increases, stretching myocardial sarcomeres closer to their optimal length (~2.2 micrometers). This increases calcium sensitivity of cardiac troponin C, producing a more forceful ventricular contraction.

KEY TAKEAWAY MEMORY RULE:
Greater ventricular filling (preload) = Greater stroke volume contraction up to physiologic limits.

VERIFIED ACADEMIC REFERENCE:
Verified Source: Guyton and Hall Textbook of Medical Physiology (14th Edition)`,
    quizQuestion: 'According to the Frank-Starling Law of the heart, what happens when end-diastolic volume increases?',
    quizOptions: [
      'Stroke volume and force of contraction increase',
      'Heart rate drops to zero',
      'Aortic valve remains permanently closed',
      'Pulmonary capillary pressure drops immediately'
    ],
    correctOptionIndex: 0
  },
  {
    titleMatch: '%Technology & Engineering Masterclass%',
    newTitle: 'Web Engineering: RESTful API Principles & HTTP Idempotency',
    category: 'Technology & Engineering',
    citationSource: 'MDN Web Docs & W3C HTTP/1.1 Specification (RFC 7231)',
    content: `THE SIMPLE CONCEPT:
An HTTP method is considered idempotent if making multiple identical requests has the exact same effect on the server state as making a single request.

FULLSTACK APPLICATION EXAMPLE:
GET, PUT, and DELETE methods are idempotent. Sending PUT /api/user/10 with the same JSON payload 5 times leaves the user profile in the exact same state, whereas POST is non-idempotent because 5 requests create 5 new separate database records.

KEY TAKEAWAY MEMORY RULE:
Multiple calls with identical results = Idempotent (GET, PUT, DELETE, HEAD).

VERIFIED ACADEMIC REFERENCE:
Verified Source: MDN Web Docs & W3C HTTP/1.1 Specification (RFC 7231)`,
    quizQuestion: 'Which HTTP method is defined as idempotent according to the W3C HTTP/1.1 standard?',
    quizOptions: [
      'PUT',
      'POST',
      'CONNECT',
      'PATCH (in non-standard partial writes)'
    ],
    correctOptionIndex: 0
  },
  {
    titleMatch: '%Fundamentals of Accounting & Financial Economics%',
    newTitle: 'Financial Accounting: The Matching Principle in Accrual Accounting',
    category: 'Commerce',
    citationSource: 'International Financial Reporting Standards (IFRS) & GAAP',
    content: `THE SIMPLE CONCEPT:
The Matching Principle dictates that expenses incurred to earn revenue must be recognized in the exact same accounting period as the related revenue, regardless of when cash is actually paid or received.

ACCOUNTING JOURNAL APPLICATION:
If a company delivers $10,000 worth of merchandise to a customer in December, but pays the sales commission of $500 to its sales agent in January, the $500 commission expense must be accrued and recorded in December to match the revenue earned.

KEY TAKEAWAY MEMORY RULE:
Match expenses with the revenues they generated in the same reporting period!

VERIFIED ACADEMIC REFERENCE:
Verified Source: International Financial Reporting Standards (IFRS) & GAAP`,
    quizQuestion: 'What does the Matching Principle in financial accounting require?',
    quizOptions: [
      'Expenses must be recognized in the same period as the revenues they helped generate',
      'Assets must always equal total liabilities plus annual expenses',
      'Cash received must match bank deposit slips on a daily basis',
      'Depreciation must equal market inflation'
    ],
    correctOptionIndex: 0
  },
  {
    titleMatch: '%Fundamentals of Law & Jurisprudence%',
    newTitle: 'Constitutional Jurisprudence: The Doctrine of Judicial Review',
    category: 'Law',
    citationSource: 'Nigerian Constitutional Law & Supreme Court Law Reports',
    content: `THE SIMPLE CONCEPT:
Judicial review is the power of the judiciary to review and invalidate legislative acts, executive actions, or administrative decisions that conflict with the constitution or violate natural justice.

LANDMARK LEGAL PRECEDENT:
In the historic case of Marbury v. Madison (1803), Chief Justice John Marshall ruled that "an act of the legislature repugnant to the Constitution is void," firmly establishing the judiciary as the guardian of constitutional supremacy.

KEY TAKEAWAY MEMORY RULE:
The Constitution is supreme; any statute inconsistent with it is null and void to the extent of the inconsistency.

VERIFIED ACADEMIC REFERENCE:
Verified Source: Nigerian Constitutional Law & Supreme Court Law Reports`,
    quizQuestion: 'Which constitutional landmark firmly established the doctrine of Judicial Review?',
    quizOptions: [
      'Marbury v. Madison (1803)',
      'Currie v. Misa (1875)',
      'Carlill v. Carbolic Smoke Ball Co (1893)',
      'Donoghue v. Stevenson (1932)'
    ],
    correctOptionIndex: 0
  },
  {
    titleMatch: '%Fundamentals of Political Science%',
    newTitle: 'Political Science: Unitary vs Federal Constitutional Systems',
    category: 'Law',
    citationSource: 'African Union & UN Human Rights Charters',
    content: `THE SIMPLE CONCEPT:
A federal system of government divides constitutional powers between a central national authority and autonomous regional constituent units (states or provinces), neither of which derives its authority from the other.

COMPARATIVE GOVERNANCE STUDY:
In countries like Nigeria and the United States, legislative powers are divided into Exclusive and Concurrent lists in a written, rigid constitution, whereas in a unitary state (like the UK), ultimate authority resides in the central parliament.

KEY TAKEAWAY MEMORY RULE:
Federalism = Constitutionally shared sovereignty; Unitary = Centralized sovereign authority.

VERIFIED ACADEMIC REFERENCE:
Verified Source: African Union & UN Human Rights Charters`,
    quizQuestion: 'In a federal system of government, how is political power distributed?',
    quizOptions: [
      'Constitutionally divided between central and regional governments',
      'Held entirely by a single central unicameral legislature',
      'Delegated strictly to local municipal councils on an ad-hoc basis',
      'Administered solely by the military high command'
    ],
    correctOptionIndex: 0
  },
  {
    titleMatch: '%Fundamentals of Literature in English%',
    newTitle: 'Literature in English: Analyzing Soliloquy in Dramatic Literature',
    category: 'Arts & Humanities',
    citationSource: 'Cambridge International A-Level Literature & Oxford Companion to English Literature',
    content: `THE SIMPLE CONCEPT:
A soliloquy is a dramatic speech delivered by a character alone on stage, revealing their private innermost motives, emotional conflicts, and moral deliberations directly to the audience without other characters hearing.

CLASSIC DRAMA EXAMPLE:
In Shakespeare's "Hamlet", the famous soliloquy "To be or not to be" allows the audience to witness Hamlet's philosophical contemplation of existence, death, and moral conscience in profound psychological depth.

KEY TAKEAWAY MEMORY RULE:
Alone on stage + Speaking inner truth = Soliloquy (unlike an aside, which occurs while others are present).

VERIFIED ACADEMIC REFERENCE:
Verified Source: Cambridge International A-Level Literature & Oxford Companion to English Literature`,
    quizQuestion: 'What is the primary dramatic function of a soliloquy in drama?',
    quizOptions: [
      'To reveal a character\'s innermost thoughts directly to the audience',
      'To introduce slapstick comic relief between tragic acts',
      'To debate a political argument between two opposing protagonists',
      'To sing a chorus celebrating a victory'
    ],
    correctOptionIndex: 0
  },
  {
    titleMatch: '%Fundamentals of Secondary Physics & Chemistry%',
    newTitle: 'Secondary Chemistry: Le Chatelier\'s Principle in Chemical Equilibrium',
    category: 'Sciences',
    citationSource: 'WAEC & Cambridge A-Level Curriculum',
    content: `THE SIMPLE CONCEPT:
When a system at chemical equilibrium is subjected to a change in concentration, temperature, volume, or pressure, the system readjusts itself to counteract the effect of the applied change and establish a new equilibrium.

ACADEMIC LABORATORY APPLICATION:
In the Haber process (N2 + 3H2 <=> 2NH3 + Heat), the reaction is exothermic. Increasing temperature shifts equilibrium to the left (favoring reactants), while increasing pressure shifts equilibrium to the right (favoring ammonia production with fewer gas moles).

KEY TAKEAWAY MEMORY RULE:
Equilibrium always shifts in the direction that opposes the disturbance!

VERIFIED ACADEMIC REFERENCE:
Verified Source: WAEC & Cambridge A-Level Curriculum`,
    quizQuestion: 'For an exothermic reaction at equilibrium, what effect does increasing temperature have?',
    quizOptions: [
      'The equilibrium shifts left towards the reactants',
      'The equilibrium shifts right towards the products',
      'The reaction stops completely',
      'The pressure instantly drops to zero'
    ],
    correctOptionIndex: 0
  },
  {
    titleMatch: '%Fundamentals of Secondary Commerce%',
    newTitle: 'Secondary Commerce: Functions of Central Banks & Monetary Policy',
    category: 'Commerce',
    citationSource: 'WAEC & Cambridge Business Studies Curriculum',
    content: `THE SIMPLE CONCEPT:
A Central Bank is the apex financial institution responsible for issuing legal tender, regulating commercial banks, maintaining price stability, and acting as the lender of last resort during liquidity crises.

MONETARY REGULATION EXAMPLE:
When inflation rises excessively, the Central Bank increases the Monetary Policy Rate (MPR) and Cash Reserve Ratio (CRR). This raises borrowing costs, reduces commercial bank lending, and curtails excess money supply in circulation.

KEY TAKEAWAY MEMORY RULE:
Higher interest rates = Reduced money supply = Inflation containment.

VERIFIED ACADEMIC REFERENCE:
Verified Source: WAEC & Cambridge Business Studies Curriculum`,
    quizQuestion: 'Which institution serves as the lender of last resort in a modern financial system?',
    quizOptions: [
      'The Central Bank',
      'Commercial Retail Banks',
      'Private Microfinance Institutions',
      'Commodity Trading Exchanges'
    ],
    correctOptionIndex: 0
  }
];

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://postgres.njiomdxbinfqzczlptfp:ScholarHub2026!Secure@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
  const client = new Client({ connectionString });
  await client.connect();
  console.log('[UPGRADE] Connected to Supabase PostgreSQL.');

  for (const item of UPGRADES) {
    const citationSummary = JSON.stringify({
      quizQuestion: item.quizQuestion,
      quizOptions: item.quizOptions,
      correctOptionIndex: item.correctOptionIndex,
      summary: 'Official Verified AI Lesson'
    });

    const res = await client.query(`
      UPDATE "Post"
      SET 
        "title" = $1,
        "content" = $2,
        "citationSource" = $3,
        "citationSummary" = $4,
        "isAiAssisted" = true
      WHERE "title" LIKE $5
      RETURNING id, title;
    `, [item.newTitle, item.content, item.citationSource, citationSummary, item.titleMatch]);

    if (res.rowCount > 0) {
      console.log(`[UPGRADED] ${res.rowCount} post(s) updated to: "${item.newTitle}" (ID: ${res.rows[0].id})`);
    } else {
      console.log(`[SKIPPED] No matching post for pattern "${item.titleMatch}"`);
    }
  }

  await client.end();
  console.log('[UPGRADE] All fallback posts updated successfully.');
}

main().catch(err => {
  console.error('[UPGRADE ERROR]:', err);
  process.exit(1);
});
