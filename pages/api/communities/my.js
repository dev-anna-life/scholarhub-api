const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  try {
    const user = await protect(req, res)
    if (!user) return

    const communities = await prisma.community.findMany({
      where: { members: { some: { userId: user.id } } },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })

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
