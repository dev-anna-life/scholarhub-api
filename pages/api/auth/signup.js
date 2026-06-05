const bcrypt = require('bcryptjs')
const dbConnect = require('../../../lib/db')
const User = require('../../../models/User')
const Community = require('../../../models/Community')
const { generateToken } = require('../../../lib/auth')

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
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const { name, email, username, password, school, level, course, track, state, faculty, department, interests, referralCode, status, secondaryClass } = req.body
    if (!name || !email || !username || !password) {
      return res.status(400).json({ message: 'Name, email, username, and password are required' })
    }
    const existing = await User.findOne({ $or: [{ email }, { username }] })
    if (existing) return res.status(400).json({ message: 'Email or username already taken' })

    let referrer = null
    if (referralCode) {
      referrer = await User.findOne({ referralCode: referralCode.trim() })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await User.create({
      name, email, username, password: hashedPassword,
      school: school || '', level: level || 'University',
      status: status || 'Current Student',
      secondaryClass: secondaryClass || '',
      course: course || '', track: track || '', state: state || '',
      faculty: faculty || '', department: department || '',
      interests: interests || [],
      coins: 50,
      referralCode: username.toLowerCase() + Math.floor(Math.random() * 1000),
      referredBy: referrer ? referrer._id : null,
    })

    if (referrer) {
      referrer.coins += 20
      await referrer.save()
    }

    if (school && level?.toLowerCase() === 'university') {
      await ensureCommunity(
        `${school} - ${faculty || 'General'} - ${department || 'General'}`,
        'department', school, faculty || '', department || '', user._id
      )
      if (faculty) {
        await ensureCommunity(`${school} - ${faculty}`, 'faculty', school, faculty, '', user._id)
      }
      await ensureCommunity(school, 'school', school, '', '', user._id)
      await ensureCommunity('General University Hub', 'general', '', '', '', user._id)
    }

    if (school && level?.toLowerCase() === 'secondary') {
      await ensureCommunity(school, 'school', school, '', '', user._id)
      await ensureCommunity('General Secondary Hub', 'general', '', '', '', user._id)
    }

    const token = generateToken(user._id)
    res.status(201).json({
      token,
      isNewUser: true,
      user: {
        id: user._id, name: user.name, email: user.email, username: user.username,
        avatar: user.avatar, school: user.school, level: user.level,
        status: user.status, secondaryClass: user.secondaryClass,
        course: user.course, track: user.track, state: user.state,
        faculty: user.faculty, department: user.department,
        interests: user.interests,
        bio: user.bio, coins: user.coins,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
