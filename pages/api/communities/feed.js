const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    if (!user.school) return res.json([])

    const myCommunities = await prisma.community.findMany({
      where: { members: { some: { userId: user.id } } }
    })
    if (!myCommunities.length) return res.json([])

    const userDeptCom = myCommunities.find(c => c.type === 'department' && c.school === user.school && c.department === user.department)
    const userFacultyComs = myCommunities.filter(c => c.type === 'faculty' && c.school === user.school)
    const userSchoolComs = myCommunities.filter(c => c.type === 'school' && c.school === user.school)
    const userGeneralComs = myCommunities.filter(c => c.type === 'general')

    const cascadeOrder = []
    let seenIds = []

    const fetchPosts = async (communities, limit) => {
      if (!communities.length || limit <= 0) return []
      const postCommunities = await prisma.postCommunity.findMany({
        where: {
          communityId: { in: communities.map(c => c.id) },
          post: {
            status: 'approved',
            id: { notIn: seenIds }
          }
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
        take: limit,
      })
      const posts = postCommunities.map(pc => {
        const p = pc.post
        return {
          ...p,
          community: pc.communityId,
          communityId: pc.communityId,
          liked: p.likes?.some(l => l.userId === user.id) || false,
          likesCount: (p.likes || []).length
        }
      })
      seenIds = [...seenIds, ...posts.map(p => p.id)]
      return posts
    }

    const deptPosts = await fetchPosts(userDeptCom ? [userDeptCom] : [], 20)
    if (deptPosts.length) cascadeOrder.push({ type: 'department', community: userDeptCom?.name || '', posts: deptPosts })

    const remaining = 20 - deptPosts.length
    const facultyPosts = await fetchPosts(userFacultyComs, remaining)
    if (facultyPosts.length) cascadeOrder.push({ type: 'faculty', posts: facultyPosts })

    const remaining2 = 20 - facultyPosts.length
    const schoolPosts = await fetchPosts(userSchoolComs, remaining2)
    if (schoolPosts.length) cascadeOrder.push({ type: 'school', posts: schoolPosts })

    const remaining3 = 20 - schoolPosts.length
    const generalPosts = await fetchPosts(userGeneralComs, remaining3)
    if (generalPosts.length) cascadeOrder.push({ type: 'general', posts: generalPosts })

    return res.json(cascadeOrder)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
