require('dotenv').config()
const prisma = require('../lib/prisma')

async function clean() {
  console.log('Cleaning all demo posts and accounts from Supabase...')

  // Delete dependent records first
  await prisma.postCommunity.deleteMany({})
  await prisma.postLike.deleteMany({})
  await prisma.postSave.deleteMany({})
  await prisma.comment.deleteMany({})
  await prisma.monthlyAward.deleteMany({})
  await prisma.notification.deleteMany({})
  await prisma.message.deleteMany({})
  await prisma.conversationParticipant.deleteMany({})
  await prisma.conversation.deleteMany({})
  await prisma.sOS.deleteMany({})
  await prisma.purchase.deleteMany({})
  await prisma.badgeSubscription.deleteMany({})
  await prisma.communityMember.deleteMany({})
  await prisma.post.deleteMany({})
  await prisma.user.deleteMany({})

  console.log('Successfully wiped all demo posts and accounts!')
  console.log('The database is now 100% clean and ready for real users.')
}

clean()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Clean error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
