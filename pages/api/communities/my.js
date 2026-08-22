const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    const user = await protect(req, res)
    if (!user) return

    let communities = await prisma.community.findMany({
      where: { members: { some: { userId: user.id } } },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })

    if (communities.length === 0) {
      // Auto-enroll user in their relevant communities
      const commsToJoin = []
      if (user.department) {
        const deptCom = await prisma.community.findFirst({
          where: { department: user.department }
        })
        if (deptCom) commsToJoin.push(deptCom.id)
      }
      if (user.faculty) {
        const facCom = await prisma.community.findFirst({
          where: { faculty: user.faculty }
        })
        if (facCom) commsToJoin.push(facCom.id)
      }
      if (user.school) {
        const schoolCom = await prisma.community.findFirst({
          where: { school: user.school }
        })
        if (schoolCom) commsToJoin.push(schoolCom.id)
      }
      const generalCom = await prisma.community.findFirst({
        where: { name: { contains: 'General', mode: 'insensitive' } }
      })
      if (generalCom) commsToJoin.push(generalCom.id)

      // If no specific found, get all standard communities
      if (commsToJoin.length === 0) {
        const allStandard = await prisma.community.findMany({ take: 6 })
        for (const ac of allStandard) commsToJoin.push(ac.id)
      }

      for (const cid of commsToJoin) {
        await prisma.communityMember.upsert({
          where: { communityId_userId: { communityId: cid, userId: user.id } },
          update: {},
          create: { communityId: cid, userId: user.id }
        }).catch(() => {})
      }

      communities = await prisma.community.findMany({
        where: { members: { some: { userId: user.id } } },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      })
    }

    const postsByCommunity = {}
    for (const c of communities) {
      const postCommunities = await prisma.postCommunity.findMany({
        where: {
          communityId: c.id,
          post: { status: 'approved' }
        },
        include: {
          post: {
            include: {
              author: {
                select: { name: true, username: true, avatar: true, school: true, faculty: true, department: true, level: true }
              }
            }
          }
        },
        orderBy: { post: { createdAt: 'desc' } },
        take: 20,
      })
      const posts = postCommunities.map(pc => {
        const p = pc.post
        const likesCount = p.likes?.length || 0
        return {
          ...p,
          communityId: c.id,
          liked: p.likes?.some(l => l.userId === user.id) || false,
          likesCount
        }
      })
      postsByCommunity[c.id] = posts
    }

    return res.json({ communities, postsByCommunity })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
