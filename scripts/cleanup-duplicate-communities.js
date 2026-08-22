require('dotenv').config()
const prisma = require('../lib/prisma')

async function cleanupDuplicates() {
  console.log('Cleaning up duplicate & (Global) communities...')

  // Delete weird composite & global communities
  const toDelete = await prisma.community.findMany({
    where: {
      OR: [
        { name: { contains: '(Global)' } },
        { name: { contains: ' - ' } },
      ]
    }
  })

  for (const c of toDelete) {
    await prisma.communityMember.deleteMany({ where: { communityId: c.id } })
    await prisma.postCommunity.deleteMany({ where: { communityId: c.id } })
    await prisma.community.delete({ where: { id: c.id } }).catch(() => {})
  }

  // Deduplicate General University Hub
  const generals = await prisma.community.findMany({
    where: { name: { contains: 'General University Hub' } }
  })
  if (generals.length > 1) {
    const keep = generals[0]
    const duplicates = generals.slice(1)
    for (const dup of duplicates) {
      // Reassign members to keep
      const members = await prisma.communityMember.findMany({ where: { communityId: dup.id } })
      for (const m of members) {
        await prisma.communityMember.upsert({
          where: { communityId_userId: { communityId: keep.id, userId: m.userId } },
          update: {},
          create: { communityId: keep.id, userId: m.userId }
        }).catch(() => {})
      }
      await prisma.communityMember.deleteMany({ where: { communityId: dup.id } })
      await prisma.postCommunity.deleteMany({ where: { communityId: dup.id } })
      await prisma.community.delete({ where: { id: dup.id } }).catch(() => {})
    }
  }

  // Deduplicate any exact matching (name, school, faculty, department)
  const all = await prisma.community.findMany()
  const seen = new Set()
  for (const c of all) {
    const key = `${c.name?.trim().toLowerCase()}_${c.school?.trim().toLowerCase() || ''}`
    if (seen.has(key)) {
      await prisma.communityMember.deleteMany({ where: { communityId: c.id } })
      await prisma.postCommunity.deleteMany({ where: { communityId: c.id } })
      await prisma.community.delete({ where: { id: c.id } }).catch(() => {})
    } else {
      seen.add(key)
    }
  }

  const remaining = await prisma.community.findMany()
  console.log('\nRemaining Clean Communities:')
  console.table(remaining.map(c => ({ id: c.id, name: c.name, type: c.type, school: c.school })))
}

cleanupDuplicates().then(() => prisma.$disconnect()).catch(console.error)
