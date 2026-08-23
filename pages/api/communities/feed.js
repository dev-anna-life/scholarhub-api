const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const user = await protect(req, res)
    if (!user) return

    // Get user joined communities or department/faculty/school communities
    let myCommunities = await prisma.community.findMany({
      where: {
        OR: [
          { members: { some: { userId: user.id } } },
          user.school ? { school: { contains: user.school, mode: 'insensitive' } } : {},
          { type: 'general' }
        ]
      }
    })

    if (!myCommunities.length) {
      myCommunities = await prisma.community.findMany({ take: 20 })
    }

    const cascadeOrder = []
    let seenIds = []

    const fetchPostsForCommunities = async (communities, limit) => {
      if (limit <= 0) return []
      let whereFilter = {
        post: {
          status: 'approved',
          id: { notIn: seenIds }
        }
      }
      if (communities.length > 0) {
        whereFilter.communityId = { in: communities.map(c => c.id) }
      }

      const postCommunities = await prisma.postCommunity.findMany({
        where: whereFilter,
        include: {
          post: {
            include: {
              author: {
                select: { id: true, name: true, username: true, avatar: true, school: true, faculty: true, department: true, level: true, coins: true }
              }
            }
          }
        },
        orderBy: { post: { createdAt: 'desc' } },
        take: limit,
      })

      let posts = postCommunities.map(pc => {
        const p = pc.post
        if (!p) return null
        return {
          ...p,
          community: pc.communityId,
          communityId: pc.communityId,
          liked: p.likes?.some(l => l.userId === user.id) || false,
          likesCount: (p.likes || []).length
        }
      }).filter(Boolean)

      // Fallback: If postCommunities is empty, grab global approved posts for general student stream
      if (posts.length === 0) {
        const fallbackPosts = await prisma.post.findMany({
          where: {
            status: 'approved',
            id: { notIn: seenIds }
          },
          include: {
            author: {
              select: { id: true, name: true, username: true, avatar: true, school: true, faculty: true, department: true, level: true, coins: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit
        })
        posts = fallbackPosts.map(p => ({
          ...p,
          liked: p.likes?.some(l => l.userId === user.id) || false,
          likesCount: (p.likes || []).length
        }))
      }

      seenIds = [...seenIds, ...posts.map(p => p.id)]
      return posts
    }

    const userDeptCom = myCommunities.find(c => c.type === 'department' && c.school === user.school && c.department === user.department)
    const userFacultyComs = myCommunities.filter(c => c.type === 'faculty' && c.school === user.school)
    const userSchoolComs = myCommunities.filter(c => c.type === 'school' && c.school === user.school)
    const userGeneralComs = myCommunities.filter(c => c.type === 'general' || !c.type)

    const deptPosts = await fetchPostsForCommunities(userDeptCom ? [userDeptCom] : [], 15)
    if (deptPosts.length) cascadeOrder.push({ type: 'department', community: userDeptCom?.name || 'Department Hub', posts: deptPosts })

    const remaining = 20 - deptPosts.length
    const facultyPosts = await fetchPostsForCommunities(userFacultyComs, remaining)
    if (facultyPosts.length) cascadeOrder.push({ type: 'faculty', posts: facultyPosts })

    const remaining2 = 20 - (deptPosts.length + facultyPosts.length)
    const schoolPosts = await fetchPostsForCommunities(userSchoolComs, remaining2)
    if (schoolPosts.length) cascadeOrder.push({ type: 'school', posts: schoolPosts })

    const remaining3 = 25 - (deptPosts.length + facultyPosts.length + schoolPosts.length)
    const generalPosts = await fetchPostsForCommunities(userGeneralComs, remaining3)
    if (generalPosts.length) cascadeOrder.push({ type: 'general', posts: generalPosts })

    // If still no sections built, fallback section
    if (cascadeOrder.length === 0) {
      const allApproved = await fetchPostsForCommunities([], 20)
      if (allApproved.length) {
        cascadeOrder.push({ type: 'general', posts: allApproved })
      }
    }

    return res.json(cascadeOrder)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
