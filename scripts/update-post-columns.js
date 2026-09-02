const prisma = require('../lib/prisma')

async function updatePostColumns() {
  console.log('[POST COLUMNS UPDATE] Adding isAiAssisted, isVoiceClip, and isHandwritten to Post table...')
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Post" 
    ADD COLUMN IF NOT EXISTS "isAiAssisted" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "isVoiceClip" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "isHandwritten" BOOLEAN DEFAULT false;
  `)
  
  console.log('[POST COLUMNS UPDATE SUCCESS] Columns added to Post table in Supabase PostgreSQL!')
}

updatePostColumns()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
