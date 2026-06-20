const dbConnect = require('../../../lib/db')
const Post = require('../../../models/Post')
const User = require('../../../models/User')
const Community = require('../../../models/Community')
const Notification = require('../../../models/Notification')
const { protect } = require('../../../lib/auth')

async function getOptionalUser(req) {
  let token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }
  if (!token) return null
  try {
    const jwt = require('jsonwebtoken')
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    await dbConnect()
    return await User.findById(decoded.id).select('-password')
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      await dbConnect()
      const { community, search, page = 1, limit = 20 } = req.query
      const user = await getOptionalUser(req)
      const pageNum = Math.max(1, parseInt(page))
      const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20))
      const skip = (pageNum - 1) * limitNum

      const searchFilter = search
        ? { $or: [
            { title: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } },
          ]}
        : {}

      if (user) {
        const myCommunities = await Community.find({ members: user._id }).lean()
        if (myCommunities.length === 0) return res.json({ posts: [], page: 1, totalPages: 0, total: 0 })

        const communityIds = myCommunities.map(c => c._id)
        const baseFilter = { status: 'approved', communities: { $in: communityIds }, ...searchFilter }
        const total = await Post.countDocuments(baseFilter)
        const totalPages = Math.ceil(total / limitNum)

        const posts = await Post.find(baseFilter)
          .populate('author', 'name username avatar school faculty department level')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean()

        const userSchool = user.school || ''
        const userFaculty = user.faculty || ''
        const userDept = user.department || ''
        const myComMap = {}
        for (const c of myCommunities) myComMap[c._id.toString()] = c

        const now = Date.now()
        const followedByUser = user.following || []

        const scored = posts.map(p => {
          let maxPriority = 999
          const pComIds = (p.communities || []).map(id => id.toString ? id.toString() : id)
          for (const cid of pComIds) {
            const com = myComMap[cid]
            if (!com) continue
            const isMySchool = com.school === userSchool
            const isSameDept = com.department === userDept && com.faculty === userFaculty
            const isSameFaculty = com.faculty === userFaculty && !com.department
            const isSameSchool = com.type === 'school' && isMySchool
            const isSameClass = com.type === 'class' && isMySchool
            const isSubject = com.type === 'subject' && isMySchool
            const isGeneral = com.type === 'general'
            let priority
            if (isSameDept) priority = 1
            else if (isSameFaculty) priority = 2
            else if (isSameSchool) priority = 3
            else if (isSameClass) priority = 4
            else if (isSubject) priority = 5
            else if (isGeneral) priority = 6
            else priority = 7
            if (priority < maxPriority) maxPriority = priority
          }

          const age = now - new Date(p.createdAt).getTime()
          const hoursOld = age / (1000 * 60 * 60)
          let recencyBoost = 0
          if (hoursOld < 1) recencyBoost = 80
          else if (hoursOld < 6) recencyBoost = 60
          else if (hoursOld < 24) recencyBoost = 40
          else if (hoursOld < 48) recencyBoost = 20

          const likeCount = (p.likes || []).length
          const commentCount = (p.commentsData || []).length
          const engagementBoost = likeCount * 2 + commentCount * 5

          const followBoost = followedByUser.includes(p.author?._id) ? 40 : 0

          const boostedBoost = p.boosted ? 200 : 0

          // Dynamic trending: posts with high engagement in last 24h
          const trendingScore = likeCount * 3 + commentCount * 10
          const isRecent = hoursOld < 24
          const trending = isRecent && trendingScore >= 30

          const score = maxPriority * 100 - recencyBoost - engagementBoost - followBoost - boostedBoost

          return {
            ...p, _score: score,
            liked: (p.likes || []).includes(user._id),
            likesCount: likeCount,
            commentCount: commentCount,
            trending,
          }
        })
        scored.sort((a, b) => a._score - b._score)
        return res.json({ posts: scored, page: pageNum, totalPages, total })
      }

      const filter = { status: 'approved', ...searchFilter }
      if (community) filter.communities = community
      const total = await Post.countDocuments(filter)
      const totalPages = Math.ceil(total / limitNum)
      const posts = await Post.find(filter)
        .populate('author', 'name username avatar school faculty department level')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
      const enriched = posts.map(p => ({
        ...p, liked: false, likesCount: (p.likes || []).length, trending: false,
      }))
      return res.json({ posts: enriched, page: pageNum, totalPages, total })
    }

    if (req.method === 'POST') {
      const user = await protect(req, res)
      if (!user) return
      if (user.status && user.status !== 'Current Student') {
        return res.status(403).json({ message: `${user.status === 'Graduate' ? 'Graduates' : 'Alumni'} cannot create posts` })
      }
      const { title, content, category, image, communityIds } = req.body
      if (!title || !content) return res.status(400).json({ message: 'Title and content are required' })
      if (!communityIds || !communityIds.length) return res.status(400).json({ message: 'At least one community is required' })

      const post = await Post.create({
        author: user._id, title, content,
        category: category || '', image: image || '',
        communities: communityIds,
      })

      const communities = await Community.find({ _id: { $in: communityIds } }).lean()
      for (const com of communities) {
        const members = await User.find({ _id: { $ne: user._id, $in: com.members } }).select('_id').lean()
        if (members.length > 0) {
          const notifs = members.map(u => ({
            user: u._id, fromUser: user._id,
            type: 'post',
            text: `${user.name.split(' ')[0]} posted in ${com.name}`,
          }))
          await Notification.insertMany(notifs)
        }
      }

      const populated = await Post.findById(post._id).populate('author', 'name username avatar school faculty department level').lean()
      return res.status(201).json({ ...populated, liked: false, likesCount: 0 })
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
