const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const Community = require('../../../models/Community')
const { protect } = require('../../../lib/auth')

async function ensureCommunity(name, type, school, faculty, department, userId) {
  let community = await Community.findOne({ name, type, school, faculty, department })
  if (!community) {
    community = await Community.create({ name, type, school, faculty, department, members: [userId], createdBy: userId })
  } else if (!community.members.includes(userId)) {
    community.members.push(userId)
    await community.save()
  }
  return community
}

export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    const { school, level, course, state, faculty, department } = req.body
    const updates = {}
    if (school !== undefined) updates.school = school
    if (level !== undefined) updates.level = level
    if (course !== undefined) updates.course = course
    if (state !== undefined) updates.state = state
    if (faculty !== undefined) updates.faculty = faculty
    if (department !== undefined) updates.department = department

    const updated = await User.findByIdAndUpdate(user._id, { $set: updates }, { new: true }).select('-password')

    const joinedCommunities = []

    if (school && level?.toLowerCase() === 'university') {
      const deptCom = await ensureCommunity(
        `${school} - ${faculty || 'General'} - ${department || 'General'}`,
        'department', school, faculty || '', department || '', user._id
      )
      joinedCommunities.push(deptCom)

      if (faculty) {
        const facCom = await ensureCommunity(
          `${school} - ${faculty}`,
          'faculty', school, faculty, '', user._id
        )
        joinedCommunities.push(facCom)
      }

      const schCom = await ensureCommunity(school, 'school', school, '', '', user._id)
      joinedCommunities.push(schCom)
    }

    if (level?.toLowerCase() === 'university') {
      const generalCom = await ensureCommunity('General University Hub', 'general', '', '', '', user._id)
      joinedCommunities.push(generalCom)
    }

    if (level?.toLowerCase() === 'secondary') {
      if (school) {
        const schCom = await ensureCommunity(school, 'school', school, '', '', user._id)
        joinedCommunities.push(schCom)
      }
      const generalCom = await ensureCommunity('General Secondary Hub', 'general', '', '', '', user._id)
      joinedCommunities.push(generalCom)
    }

    res.json({ user: updated.toObject(), joinedCommunities: joinedCommunities.map(c => ({ id: c._id, name: c.name, type: c.type })) })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
