const prisma = require('../../../lib/prisma')
const jwt = require('jsonwebtoken')
const { protect } = require('../../../lib/auth')

const authorSelect = { id: true, name: true, username: true, avatar: true, school: true, faculty: true, department: true, level: true }

async function getOptionalUser(req) {
  let token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }
  if (!token) return null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true, name: true, username: true, avatar: true, level: true,
        school: true, faculty: true, department: true, status: true,
        following: { select: { followingId: true } }
      }
    })
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { community, search, page = 1, limit = 20, tab, category, communityId } = req.query
      const user = await getOptionalUser(req)
      const pageNum = Math.max(1, parseInt(page))
      const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20))
      const skip = (pageNum - 1) * limitNum

      const searchFilter = search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
            ]
          }
        : {}

      if (user) {
        const sameLevelUsers = await prisma.user.findMany({
          where: { level: user.level },
          select: { id: true }
        })
        const levelUserIds = sameLevelUsers.map(u => u.id)

        const memberCommunities = await prisma.communityMember.findMany({
          where: { userId: user.id },
          select: {
            communityId: true,
            community: { select: { id: true, name: true, type: true, school: true, faculty: true, department: true } }
          }
        })
        const myComMap = {}
        for (const m of memberCommunities) myComMap[m.communityId] = m.community

        const followedIds = (user.following || []).map(f => f.followingId)
        const userSchool = user.school || ''
        const userFaculty = user.faculty || ''
        const userDept = user.department || ''

        let baseWhere = {
          status: 'approved',
          authorId: { in: levelUserIds },
          ...searchFilter
        }
        let isForYou = false

        if (tab === 'following') {
          const followingAtSameLevel = followedIds.filter(id => levelUserIds.includes(id))
          baseWhere.authorId = { in: followingAtSameLevel }
        } else if (tab === 'category' && category) {
          baseWhere.category = category
        } else if (tab === 'community' && communityId) {
          baseWhere.communities = { some: { communityId } }
        } else {
          isForYou = true
        }

        const total = await prisma.post.count({ where: baseWhere })
        const totalPages = Math.ceil(total / limitNum)

        const posts = await prisma.post.findMany({
          where: baseWhere,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: authorSelect },
            communities: { include: { community: { select: { name: true } } } },
            _count: { select: { likes: true, comments: true } }
          }
        })

        const postIds = posts.map(p => p.id)
        const userLikes = postIds.length > 0 ? await prisma.postLike.findMany({
          where: { postId: { in: postIds }, userId: user.id },
          select: { postId: true }
        }) : []
        const likedPostIds = new Set(userLikes.map(l => l.postId))

        if (isForYou) {
          const now = Date.now()
          const scored = posts.map(p => {
            const age = now - new Date(p.createdAt).getTime()
            const hoursOld = age / (1000 * 60 * 60)
            let recencyBoost = 0
            if (hoursOld < 1) recencyBoost = 100
            else if (hoursOld < 6) recencyBoost = 70
            else if (hoursOld < 24) recencyBoost = 40
            else if (hoursOld < 48) recencyBoost = 20
            else if (hoursOld < 168) recencyBoost = 10

            const likeCount = p._count.likes
            const commentCount = p._count.comments
            const engagementBoost = likeCount * 3 + commentCount * 10

            const followBoost = followedIds.includes(p.authorId) ? 80 : 0

            let communityBoost = 0
            const pComIds = p.communities.map(pc => pc.communityId)
            for (const cid of pComIds) {
              const com = myComMap[cid]
              if (!com) continue
              const isDept = com.department === userDept && com.faculty === userFaculty && com.type === 'department'
              const isFaculty = com.faculty === userFaculty && com.type === 'faculty'
              const isSchool = com.school === userSchool && com.type === 'school'
              if (isDept) communityBoost = Math.max(communityBoost, 80)
              else if (isFaculty) communityBoost = Math.max(communityBoost, 60)
              else if (isSchool) communityBoost = Math.max(communityBoost, 50)
              else communityBoost = Math.max(communityBoost, 30)
            }

            const boostedBoost = p.boosted ? 200 : 0
            const trendingScore = likeCount * 3 + commentCount * 10
            const isRecent = hoursOld < 24
            const trending = isRecent && trendingScore >= 30

            const score = recencyBoost + followBoost + communityBoost + engagementBoost + boostedBoost

            const { _count, ...rest } = p
            return {
              ...rest, _score: score,
              liked: likedPostIds.has(p.id),
              likesCount: likeCount,
              commentCount,
              trending,
            }
          })
          scored.sort((a, b) => b._score - a._score)
          return res.json({ posts: scored, page: pageNum, totalPages, total })
        }

        const enriched = posts.map(p => {
          const { _count, ...rest } = p
          return {
            ...rest, liked: likedPostIds.has(p.id),
            likesCount: _count.likes,
            commentCount: _count.comments,
            trending: false,
          }
        })
        return res.json({ posts: enriched, page: pageNum, totalPages, total })
      }

      const where = { status: 'approved', ...searchFilter }
      if (category) where.category = category
      if (community) where.communities = { some: { communityId: community } }
      if (communityId) where.communities = { some: { communityId } }

      const total = await prisma.post.count({ where })
      const totalPages = Math.ceil(total / limitNum)
      const posts = await prisma.post.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: authorSelect },
          communities: { include: { community: { select: { name: true } } } },
          _count: { select: { likes: true, comments: true } }
        }
      })
      const enriched = posts.map(p => {
        const { _count, ...rest } = p
        return {
          ...rest, liked: false, likesCount: _count.likes, trending: false,
        }
      })
      return res.json({ posts: enriched, page: pageNum, totalPages, total })
    }

    if (req.method === 'POST') {
      const user = await protect(req, res)
      if (!user) return
      if (user.status && user.status !== 'Current Student') {
        return res.status(403).json({ message: `${user.status === 'Graduate' ? 'Graduates' : 'Alumni'} cannot create posts` })
      }
      let { title, content, category, image, communityIds } = req.body
      if (!title || !content) return res.status(400).json({ message: 'Title and content are required' })

      // Clean and validate communityIds array
      if (!Array.isArray(communityIds)) {
        communityIds = communityIds ? [communityIds] : []
      }
      communityIds = communityIds.filter(id => id && typeof id === 'string' && id !== 'undefined' && id !== 'null')

      // Fallback: if no valid community ID supplied, auto-assign to General or User's school community
      if (communityIds.length === 0) {
        const userCommunities = await prisma.communityMember.findMany({
          where: { userId: user.id },
          select: { communityId: true },
          take: 5,
        })
        if (userCommunities.length > 0) {
          communityIds = userCommunities.map(c => c.communityId)
        } else {
          let defaultCommunity = await prisma.community.findFirst({
            where: { name: { contains: 'General', mode: 'insensitive' } }
          })
          if (!defaultCommunity) defaultCommunity = await prisma.community.findFirst()
          if (defaultCommunity) {
            communityIds = [defaultCommunity.id]
            // Auto-join user to default community
            await prisma.communityMember.create({
              data: { communityId: defaultCommunity.id, userId: user.id }
            }).catch(() => {})
          } else {
            return res.status(400).json({ message: 'Please select at least one community to post' })
          }
        }
      }

      const postStatus = (user.isAdmin || user.email?.toLowerCase() === 'admin@scholarhub.app') ? 'approved' : 'pending'
      const post = await prisma.post.create({
        data: {
          title,
          content,
          category: category || '',
          image: image || '',
          authorId: user.id,
          status: postStatus,
          communities: {
            create: communityIds.map(cid => ({ communityId: cid }))
          }
        },
        include: {
          author: { select: authorSelect },
        }
      })

      // Safely notify community members without throwing errors
      try {
        for (const cid of communityIds) {
          const members = await prisma.communityMember.findMany({
            where: { communityId: cid, userId: { not: user.id } },
            select: { userId: true }
          })
          if (members.length > 0) {
            const community = await prisma.community.findUnique({
              where: { id: cid },
              select: { name: true }
            })
            const commName = community ? community.name : 'a community'
            await prisma.notification.createMany({
              data: members.map(m => ({
                userId: m.userId,
                fromUserId: user.id,
                type: 'post',
                text: `${user.name.split(' ')[0]} posted in ${commName}`,
              }))
            })
          }
        }
      } catch (notifErr) {
        console.error('Post notification warning:', notifErr)
      }

      return res.status(201).json({ ...post, liked: false, likesCount: 0 })
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    console.error('Post handler error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
