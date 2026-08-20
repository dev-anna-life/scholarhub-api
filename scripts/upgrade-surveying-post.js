require('dotenv').config()
const { Client } = require('pg')

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  console.log('Connected to Neon PostgreSQL.')

  // Find latest surveying post
  const res = await client.query('SELECT id, title, "authorId", "citationStatus" FROM "Post" WHERE title ILIKE \'%Surveying%\' ORDER BY "createdAt" DESC LIMIT 1')
  if (res.rows.length > 0) {
    const post = res.rows[0]
    console.log('Found surveying post:', post)

    await client.query(
      'UPDATE "Post" SET "citationStatus" = $1, "citationSummary" = $2 WHERE id = $3',
      [
        'verified',
        'Verified: The definition of surveying accurately aligns with fundamental concepts found in SURCON and NUC Surveying curricula and international standards.',
        post.id
      ]
    )

    await client.query(
      'UPDATE "User" SET "scholarScore" = "scholarScore" + 1 WHERE id = $1',
      [post.authorId]
    )
    console.log('Successfully updated post to verified and awarded +1 Scholar Score!')
  }

  const posts = await client.query('SELECT id, title, "citationStatus", "citationSummary" FROM "Post" ORDER BY "createdAt" DESC LIMIT 6')
  console.log('\nLatest 6 Posts in DB:')
  console.table(posts.rows)

  await client.end()
}

main().catch(console.error)
