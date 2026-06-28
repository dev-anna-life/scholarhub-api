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
      const { community, search, page = 1, limit = 20, tab, category, communityId } = req.query
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
        const communityIds = myCommunities.map(c => c._id)
        const myComMap = {}
        for (const c of myCommunities) myComMap[c._id.toString()] = c
        const followedIds = user.following || []
        const userSchool = user.school || ''
        const userFaculty = user.faculty || ''
        const userDept = user.department || ''

        let baseFilter = { status: 'approved', ...searchFilter }
        let sortOpt = { createdAt: -1 }
        let isForYou = false

        if (tab === 'following') {
          baseFilter.author = { $in: followedIds }
        } else if (tab === 'category' && category) {
          baseFilter.category = category
        } else if (tab === 'community' && communityId) {
          baseFilter.communities = communityId
        } else {
          isForYou = true
        }

        const total = await Post.countDocuments(baseFilter)
        const totalPages = Math.ceil(total / limitNum)

        const posts = await Post.find(baseFilter)
          .populate('author', 'name username avatar school faculty department level')
          .populate('communities', 'name')
          .sort(sortOpt)
          .skip(skip)
          .limit(limitNum)
          .lean()

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

            const likeCount = (p.likes || []).length
            const commentCount = (p.commentsData || []).length
            const engagementBoost = likeCount * 3 + commentCount * 10

            const followBoost = followedIds.includes(p.author?._id) ? 80 : 0

            let communityBoost = 0
            const pComIds = (p.communities || []).map(id => id.toString ? id.toString() : id)
            for (const cid of pComIds) {
              const com = myComMap[cid]
              if (!com) continue
              const isDept = com.department === userDept && com.faculty === userFaculty && com.type === 'department'
              const isFaculty = com.faculty === userFaculty && com.type === 'faculty'
              const isSchool = com.school === userSchool && com.type === 'school'
              if (isDept) { communityBoost = Math.max(communityBoost, 80) }
              else if (isFaculty) { communityBoost = Math.max(communityBoost, 60) }
              else if (isSchool) { communityBoost = Math.max(communityBoost, 50) }
              else { communityBoost = Math.max(communityBoost, 30) }
            }

            const boostedBoost = p.boosted ? 200 : 0

            const trendingScore = likeCount * 3 + commentCount * 10
            const isRecent = hoursOld < 24
            const trending = isRecent && trendingScore >= 30

            const score = recencyBoost + followBoost + communityBoost + engagementBoost + boostedBoost

            return {
              ...p, _score: score,
              liked: (p.likes || []).includes(user._id),
              likesCount: likeCount,
              commentCount,
              trending,
            }
          })
          scored.sort((a, b) => b._score - a._score)
          return res.json({ posts: scored, page: pageNum, totalPages, total })
        }

        const enriched = posts.map(p => ({
          ...p, liked: (p.likes || []).includes(user._id),
          likesCount: (p.likes || []).length,
          commentCount: (p.commentsData || []).length,
          trending: false,
        }))
        return res.json({ posts: enriched, page: pageNum, totalPages, total })
      }

      const filter = { status: 'approved', ...searchFilter }
      if (category) filter.category = category
      if (community) filter.communities = community
      if (communityId) filter.communities = communityId
      const total = await Post.countDocuments(filter)
      const totalPages = Math.ceil(total / limitNum)
      const posts = await Post.find(filter)
        .populate('author', 'name username avatar school faculty department level')
        .populate('communities', 'name')
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

      let finalCommunityIds = communityIds || []

      if (!finalCommunityIds.length && user.school && user.department && user.faculty) {
        const deptCom = await Community.findOne({
          type: 'department', school: user.school,
          faculty: user.faculty, department: user.department
        })
        if (deptCom) finalCommunityIds = [deptCom._id]
      }

      const post = await Post.create({
        author: user._id, title, content,
        category: category || '', image: image || '',
        communities: finalCommunityIds,
      })

      const communities = await Community.find({ _id: { $in: finalCommunityIds } }).lean()
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
      return res.status(201).json({ ...populated, liked: false, saved: false, likesCount: 0 })
    }

    return res.status(405).json({ message: 'Method not allowed' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
