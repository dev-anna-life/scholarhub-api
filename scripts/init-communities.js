require('dotenv').config()
const prisma = require('../lib/prisma')

async function main() {
  const coms = await prisma.community.findMany()
  if (coms.length === 0) {
    await prisma.community.createMany({
      data: [
        { name: 'General University Hub', type: 'general' },
        { name: 'Sciences', type: 'faculty' },
        { name: 'Technology & Computing', type: 'faculty' },
        { name: 'Engineering', type: 'faculty' },
        { name: 'Law', type: 'faculty' },
        { name: 'Medicine & Health', type: 'faculty' },
        { name: 'Arts & Social Sciences', type: 'faculty' }
      ],
      skipDuplicates: true
    })
    console.log('Created standard open communities.')
  }
}

main().then(() => prisma.$disconnect()).catch(console.error)
