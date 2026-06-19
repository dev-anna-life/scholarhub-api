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
      const { community } = req.query
      const user = await getOptionalUser(req)

      if (user) {
        const myCommunities = await Community.find({ members: user._id }).lean()
        if (myCommunities.length === 0) return res.json([])

        const communityIds = myCommunities.map(c => c._id)
        const posts = await Post.find({
          status: 'approved',
          communities: { $in: communityIds },
        })
          .populate('author', 'name username avatar school faculty department level')
          .sort({ createdAt: -1 })
          .lean()

        const userSchool = user.school || ''
        const userFaculty = user.faculty || ''
        const userDept = user.department || ''
        const myComMap = {}
        for (const c of myCommunities) myComMap[c._id.toString()] = c

        const scored = posts.map(p => {
          let maxScore = 999
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
            let score
            if (isSameDept) score = 1
            else if (isSameFaculty) score = 2
            else if (isSameSchool) score = 3
            else if (isSameClass) score = 4
            else if (isSubject) score = 5
            else if (isGeneral) score = 6
            else score = 7
            if (score < maxScore) maxScore = score
          }
          return { ...p, _score: maxScore, liked: (p.likes || []).includes(user._id), likesCount: (p.likes || []).length }
        })
        scored.sort((a, b) => a._score - b._score || new Date(b.createdAt) - new Date(a.createdAt))
        return res.json(scored)
      }

      const filter = { status: 'approved' }
      if (community) filter.communities = community
      const posts = await Post.find(filter)
        .populate('author', 'name username avatar school faculty department level')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
      const enriched = posts.map(p => ({
        ...p, liked: false, likesCount: (p.likes || []).length,
      }))
      return res.json(enriched)
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
