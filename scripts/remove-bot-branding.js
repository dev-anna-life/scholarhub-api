const { Client } = require('pg');

const ACCOUNT_UPDATES = [
  {
    id: 'cmtiv0zrm0000lsvoquuxye6h',
    name: 'Secondary Sciences Academy',
    username: 'science_academy',
    email: 'science_academy@scholarhub.dev',
    bio: 'Official Secondary Sciences & Mathematics Guild. Daily formulas, chemistry principles, and STEM discussions.'
  },
  {
    id: 'cmtiv109i0001lsvolgr717yz',
    name: 'Arts & Literature Academy',
    username: 'literature_academy',
    email: 'literature_academy@scholarhub.dev',
    bio: 'Official Secondary Arts, Literature in English & World History Guild. Literary analysis and dramatic studies.'
  },
  {
    id: 'cmtiv10qk0002lsvoau95i8lv',
    name: 'Business & Commerce Academy',
    username: 'commerce_academy',
    email: 'commerce_academy@scholarhub.dev',
    bio: 'Official Secondary Commerce & Business Economics Guild. Trade principles, commercial law, and banking basics.'
  },
  {
    id: 'cmtiv114v0003lsvolm3vgkoj',
    name: 'Faculty of Law',
    username: 'law_faculty',
    email: 'law_faculty@scholarhub.dev',
    bio: 'Official University Law & Legal Reasoning Guild. Constitutional law, jurisprudence, and legal precedents.'
  },
  {
    id: 'cmtiv11pk0004lsvo7qce9lrm',
    name: 'Faculty of Medical Sciences',
    username: 'medical_sciences',
    email: 'medical_sciences@scholarhub.dev',
    bio: 'Official Medical & Clinical Physiology Guild. Clinical anatomy, pathology, and physiological mechanisms.'
  },
  {
    id: 'cmtiv128q0005lsvo9gsyi4c4',
    name: 'Governance & Political Studies',
    username: 'governance_studies',
    email: 'governance_studies@scholarhub.dev',
    bio: 'Official Political Science & Constitutional Governance Guild. Comparative politics and policy analysis.'
  },
  {
    id: 'cmtiv12pl0006lsvoi5f4hncg',
    name: 'Accounting & Finance Guild',
    username: 'accounting_guild',
    email: 'accounting_guild@scholarhub.dev',
    bio: 'Official Accounting, Auditing & Financial Economics Guild. Double-entry bookkeeping, GAAP, and IFRS standards.'
  },
  {
    id: 'cmtiv133e0007lsvoinr72ybg',
    name: 'Product Design Studio',
    username: 'design_studio',
    email: 'design_studio@scholarhub.dev',
    bio: 'Official Product Design & UI/UX Studio. Design systems, mobile usability patterns, and Figma techniques.'
  },
  {
    id: 'cmtiv13hs0008lsvopqjsfxml',
    name: 'Web & Cloud Engineering Guild',
    username: 'web_engineering',
    email: 'web_engineering@scholarhub.dev',
    bio: 'Official Web Engineering Guild. Modern web architecture, cloud systems, and full-stack software standards.'
  },
  {
    id: 'cmtiv13yz0009lsvo8j9ddgy7',
    name: 'Data Science & Analytics Guild',
    username: 'data_science',
    email: 'data_science@scholarhub.dev',
    bio: 'Official Data Science & Machine Learning Guild. Statistical modeling, algorithm design, and analytics.'
  }
];

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://postgres.njiomdxbinfqzczlptfp:ScholarHub2026!Secure@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
  const client = new Client({ connectionString });
  await client.connect();
  console.log('[RENAME] Connected to Supabase PostgreSQL.');

  // 1. Update User accounts: remove "Bot" from names, usernames, emails, and bios
  for (const acc of ACCOUNT_UPDATES) {
    const res = await client.query(`
      UPDATE "User"
      SET 
        "name" = $1,
        "username" = $2,
        "email" = $3,
        "bio" = $4
      WHERE "id" = $5 OR "username" = $6 OR "email" = $7
      RETURNING id, name, username;
    `, [acc.name, acc.username, acc.email, acc.bio, acc.id, acc.username, acc.email]);

    if (res.rowCount > 0) {
      console.log(`[USER UPDATED] Renamed to "${res.rows[0].name}" (@${res.rows[0].username})`);
    } else {
      console.log(`[USER SKIPPED] No match for ${acc.name}`);
    }
  }

  // 2. Clean any existing Post titles: remove "Bot" or "OFFICIAL AI LESSON"
  const postRes = await client.query(`
    UPDATE "Post"
    SET "title" = REPLACE(REPLACE(REPLACE("title", ' Bot', ''), 'Bot: ', ''), 'OFFICIAL AI LESSON: ', '')
    WHERE "title" LIKE '%Bot%' OR "title" LIKE '%OFFICIAL AI LESSON%';
  `);
  console.log(`[POST TITLES CLEANED] Updated ${postRes.rowCount} posts.`);

  await client.end();
  console.log('[RENAME COMPLETE] All bot branding stripped from database.');
}

main().catch(err => {
  console.error('[FATAL ERROR]:', err);
  process.exit(1);
});
