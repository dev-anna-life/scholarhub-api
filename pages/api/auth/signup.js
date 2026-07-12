const bcrypt = require('bcryptjs')
const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
const { generateToken } = require('../../../lib/auth')
const rateLimit = require('../../../middleware/rateLimit')
const { z } = require('zod')

const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  school: z.string().optional(),
  level: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  course: z.string().optional(),
  track: z.string().optional(),
  faculty: z.string().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
  secondaryClass: z.string().optional(),
  secondarySubjects: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  referralCode: z.string().optional(),
})

async function ensureCommunity(name, type, school, faculty, department, userId) {
  let community = await prisma.community.findFirst({
    where: { name, type, school, faculty, department },
  })
  if (!community) {
    community = await prisma.community.create({
      data: {
        name, type, school: school || null, faculty: faculty || null,
        department: department || null, createdById: userId,
        members: { create: { userId } },
      },
    })
  } else {
    const existingMember = await prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: community.id, userId } },
    })
    if (!existingMember) {
      await prisma.communityMember.create({
        data: { communityId: community.id, userId },
      })
    }
  }
  return community
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  const isAllowed = rateLimit(req, res)
  if (!isAllowed) return

  try {
    await dbConnect()

    const validationResult = signupSchema.safeParse(req.body)
    if (!validationResult.success) {
      const errorMsg = validationResult.error.errors.map(err => err.message).join(', ')
      return res.status(400).json({ message: errorMsg })
    }

    const { name, email, username, password, school, level, course, track, state, city, country, faculty, department, interests, referralCode, status, secondaryClass, secondarySubjects } = validationResult.data

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })
    if (existing) return res.status(400).json({ message: 'Email or username already taken' })

    let referrer = null
    if (referralCode) {
      referrer = await prisma.user.findUnique({ where: { referralCode: referralCode.trim() } })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name, email, username, password: hashedPassword,
        school: school || '', level: level || 'University',
        status: status || 'Current Student',
        secondaryClass: ['Science', 'Arts'].includes(secondaryClass) ? secondaryClass : null,
        secondarySubjects: Array.isArray(secondarySubjects) ? secondarySubjects : [],
        course: course || '', track: ['Science', 'Art', 'Commercial'].includes(track) ? track : null,
        state: state || '', city: city || '', country: country || '',
        faculty: faculty || '', department: department || '',
        interests: interests || [],
        coins: 50, monthlyCoins: 50,
        monthlyCoinsMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        referralCode: username.toLowerCase() + Math.floor(Math.random() * 1000),
        referredById: referrer ? referrer.id : null,
      },
    })

    if (referrer) {
      const refMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      await prisma.user.update({
        where: { id: referrer.id },
        data: {
          coins: { increment: 20 },
          monthlyCoins: { increment: 20 },
          monthlyCoinsMonth: referrer.monthlyCoinsMonth !== refMonth ? refMonth : undefined,
        },
      })
    }

    if (school && level?.toLowerCase() === 'university') {
      await ensureCommunity(
        `${faculty || 'General'} - ${department || 'General'}`,
        'department', school, faculty || '', department || '', user.id
      )
      if (faculty) {
        await ensureCommunity(`${faculty}`, 'faculty', school, faculty, '', user.id)
      }
      await ensureCommunity(school, 'school', school, '', '', user.id)
      if (department) {
        await ensureCommunity(`${department}`, 'general', '', faculty || '', department, user.id)
      }
      if (faculty) {
        await ensureCommunity(`${faculty} (Global)`, 'general', '', faculty, '', user.id)
      }
      await ensureCommunity('General University Hub', 'general', '', '', '', user.id)
    }

    if (level?.toLowerCase() === 'secondary') {
      if (school) {
        await ensureCommunity(school, 'school', school, '', '', user.id)
      }
      await ensureCommunity('General Secondary Hub', 'general', '', '', '', user.id)
    }

    const token = generateToken(user.id)
    res.status(201).json({
      token,
      isNewUser: true,
      user: {
        id: user.id, name: user.name, email: user.email, username: user.username,
        avatar: user.avatar, school: user.school, level: user.level,
        status: user.status, secondaryClass: user.secondaryClass,
        secondarySubjects: user.secondarySubjects,
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
