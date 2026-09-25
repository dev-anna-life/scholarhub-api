const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.njiomdxbinfqzczlptfp:ScholarHub2026!Secure@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  await client.connect();

  const res = await client.query('SELECT id, title FROM "Post" WHERE title LIKE \'%(Sep%\'');
  console.log(`Found ${res.rows.length} posts with date labels in title.`);

  for (const post of res.rows) {
    const cleanedTitle = post.title.replace(/\s*\([A-Za-z]+\s+\d+\)/g, '').trim();
    await client.query('UPDATE "Post" SET "title" = $1 WHERE "id" = $2', [cleanedTitle, post.id]);
    console.log(`Cleaned: "${post.title}" -> "${cleanedTitle}"`);
  }

  await client.end();
  console.log('Finished cleaning titles in database.');
}

main().catch(console.error);
