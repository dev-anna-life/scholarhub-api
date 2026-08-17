const prisma = require('../../../lib/prisma')
const jwt = require('jsonwebtoken')
const { protect } = require('../../../lib/auth')

const authorSelect = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  school: true,
  faculty: true,
  department: true,
  level: true,
  badgeSubscriptions: {
    select: { badgeId: true, expiresAt: true }
  }
}

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

async function analyzePostSafetyAndCitation(title, content, category) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { isSafe: true, flagReason: null, citationStatus: 'discussion', citationSummary: 'Community Discussion' }

  try {
    const prompt = `You are the ScholarHub Academic Semantic AI Engine.
ScholarHub is an academic social platform for university and secondary school students.
Analyze this post:
Title: "${title || ''}"
Content: "${content || ''}"
Category: "${category || 'General'}"

Instructions:
1. SAFETY CHECK:
   - If the content contains explicit pornography, graphic violence, hate speech, severe harassment, or academic scam/fraud: set "isSafe": false and "flagReason" with a clear polite explanation.
2. SEMANTIC CITATION CHECK (If safe):
   - "verified" (🟢): The post provides educational knowledge, study tips, scientific/academic explanations, historical facts, coding/math tutorials, or course insights that are factually sound.
   - "discussion" (🟡): The post expresses personal feelings, campus thoughts, social questions, campus gist, or casual student life (not educating others).
   - "misinformation" (🔴): The post makes debunked or false claims, examination leak rumors, or misleading academic information.
3. CITATION SUMMARY: Provide a concise 1-sentence note (e.g. "Verified by AI: Accurately explains AI video generation concepts." or "Campus Discussion: Student sharing personal thoughts.").

Return ONLY valid JSON:
{
  "isSafe": true,
  "flagReason": null,
  "citationStatus": "verified" | "discussion" | "misinformation",
  "citationSummary": "string"
}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 300,
            responseMimeType: 'application/json'
          }
        })
      }
    )

    if (!response.ok) return { isSafe: true, flagReason: null, citationStatus: 'discussion', citationSummary: 'Community Discussion' }
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { isSafe: true, flagReason: null, citationStatus: 'discussion', citationSummary: 'Community Discussion' }
    return JSON.parse(text)
  } catch (err) {
    console.error('AI Moderation error:', err)
    return { isSafe: true, flagReason: null, citationStatus: 'discussion', citationSummary: 'Community Discussion' }
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
      let { title, content, category, image, video, communityIds } = req.body
      if (!title || !content) return res.status(400).json({ message: 'Title and content are required' })

      // Check subscription tier limits
      const now = new Date()
      const activeSubs = (user.badgeSubscriptions || []).filter(s => new Date(s.expiresAt) > now)
      const hasExtra = activeSubs.some(s => s.badgeId === 'badge_extra_premium' || s.id === 'badge_extra_premium')
      const hasPremium = activeSubs.some(s => s.badgeId === 'badge_premium' || s.id === 'badge_premium')
      const hasBasic = activeSubs.some(s => s.badgeId === 'badge_basic' || s.id === 'badge_basic')

      const wordCount = content.trim().split(/\s+/).length
      const charCount = content.length

      if (!hasExtra && !hasPremium && !hasBasic) {
        // Free tier
        if (wordCount > 80) {
          return res.status(400).json({ message: 'Free accounts can write up to 80 words. Upgrade to Basic (₦2,000/mo) to post up to 500 words.' })
        }
        if (video) {
          return res.status(400).json({ message: 'Free accounts can only post pictures. Upgrade to Basic to post up to 30s video.' })
        }
      } else if (hasBasic && !hasPremium && !hasExtra) {
        // Basic tier
        if (wordCount > 80) {
          return res.status(400).json({ message: 'Basic accounts can write up to 80 words. Upgrade to Premium for 1,000 words or Extra Premium for unlimited writing.' })
        }
      } else if (hasPremium && !hasExtra) {
        // Premium tier
        if (wordCount > 1000 && charCount > 5000) {
          return res.status(400).json({ message: 'Premium accounts can write up to 1,000 words. Upgrade to Extra Premium for unlimited writing.' })
        }
      }

      // Clean and validate communityIds array
      if (!Array.isArray(communityIds)) {
        communityIds = communityIds ? [communityIds] : []
      }
      communityIds = communityIds.filter(id => id && typeof id === 'string' && id !== 'undefined' && id !== 'null')

      // Fallback: if no valid community ID supplied, auto-assign to author's department/faculty community
      if (communityIds.length === 0) {
        let primaryCommunity = null
        if (user.department) {
          const deptCom = await prisma.community.findFirst({
            where: { department: user.department }
          })
          if (deptCom) primaryCommunity = deptCom.id
        }
        if (!primaryCommunity && user.faculty) {
          const facCom = await prisma.community.findFirst({
            where: { faculty: user.faculty }
          })
          if (facCom) primaryCommunity = facCom.id
        }
        if (!primaryCommunity) {
          const userCom = await prisma.communityMember.findFirst({
            where: { userId: user.id },
            select: { communityId: true }
          })
          if (userCom) primaryCommunity = userCom.communityId
        }

        if (primaryCommunity) {
          communityIds = [primaryCommunity]
        } else {
          let defaultCommunity = await prisma.community.findFirst({
            where: { name: { contains: 'General', mode: 'insensitive' } }
          })
          if (!defaultCommunity) defaultCommunity = await prisma.community.findFirst()
          if (defaultCommunity) {
            communityIds = [defaultCommunity.id]
            await prisma.communityMember.create({
              data: { communityId: defaultCommunity.id, userId: user.id }
            }).catch(() => {})
          } else {
            return res.status(400).json({ message: 'Please select at least one community to post' })
          }
        }
      }

      // Run Gemini AI Content Safety & Academic Citation Moderation
      const safetyAnalysis = await analyzePostSafetyAndCitation(title, content, category)
      if (!safetyAnalysis.isSafe) {
        return res.status(400).json({
          message: safetyAnalysis.flagReason || 'Post blocked by ScholarHub AI Safety: Content violates academic safety guidelines (explicit or harmful material detected).'
        })
      }

      if (safetyAnalysis.citationStatus === 'misinformation') {
        return res.status(400).json({
          message: safetyAnalysis.citationSummary || 'Post blocked by ScholarHub AI: Unverified claims or misinformation detected. Please provide accurate academic sources.'
        })
      }

      const citationStatus = safetyAnalysis.citationStatus === 'verified' ? 'verified' : 'discussion'
      const citationSummary = safetyAnalysis.citationSummary || (citationStatus === 'verified' ? 'Verified academic insight' : 'Community discussion')

      const postStatus = 'approved'
      const post = await prisma.post.create({
        data: {
          title,
          content,
          category: category || '',
          image: image || '',
          video: video || '',
          citationStatus,
          citationSummary,
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

      // If verified academic post, reward author with +15 scholar coins / points
      if (citationStatus === 'verified') {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            coins: { increment: 15 },
            lifetimeCoins: { increment: 15 },
          }
        }).catch(() => {})
      }

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
