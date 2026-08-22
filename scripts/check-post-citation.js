require('dotenv').config()
const prisma = require('../lib/prisma')

async function main() {
  const post = await prisma.post.findFirst({
    where: { title: { contains: 'Time Complexity' } }
  })
  console.log('Post Title:', post?.title)
  console.log('Post Citation Status:', post?.citationStatus)
  console.log('Post Citation Summary:', post?.citationSummary)
  console.log('Post Citation Source:', post?.citationSource)
}

main().then(() => prisma.$disconnect()).catch(console.error)
