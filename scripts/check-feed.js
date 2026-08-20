require('dotenv').config()
const { Client } = require('pg')

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const posts = await client.query('SELECT id, title, "authorId", status, "citationStatus" FROM "Post"')
  console.log('Total Posts in DB:', posts.rows.length)
  console.table(posts.rows)

  const users = await client.query('SELECT id, name, username, level, faculty, department FROM "User"')
  console.log('\nTotal Users in DB:', users.rows.length)
  console.table(users.rows)

  await client.end()
}

main().catch(console.error)
