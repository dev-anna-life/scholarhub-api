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
  phone: z.string().optional(),
  school: z.string().optional(),
  level: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  course: z.string().optional(),
  track: z.string().optional(),
  faculty: z.string().optional(),
  department: z.string().optional(),
  skillDomain: z.string().optional(),
  status: z.string().optional(),
  secondaryClass: z.string().optional(),
  secondarySubjects: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  referralCode: z.string().optional(),
})

function resolveHubIdsForUser({ course, faculty, track, skillDomain, interests = [] }) {
  const hubIds = new Set(['cmtiv14br0010lsvobrandhub']) // Brand Challenge Hub is automatic for all users
  const corpus = [course, faculty, track, skillDomain, ...(Array.isArray(interests) ? interests : [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (corpus.includes('law') || corpus.includes('jurisprudence') || corpus.includes('legal')) {
    hubIds.add('cmtiv114v0003lsvolm3vgkoj') // @law_hub
  }
  if (corpus.includes('med') || corpus.includes('anatomy') || corpus.includes('clinic') || corpus.includes('health') || corpus.includes('pharma') || corpus.includes('nurs')) {
    hubIds.add('cmtiv11pk0004lsvo7qce9lrm') // @medical_hub
  }
  if (corpus.includes('art') || corpus.includes('lit') || corpus.includes('history') || corpus.includes('drama') || corpus.includes('english') || corpus.includes('humanit')) {
    hubIds.add('cmtiv109i0001lsvolgr717yz') // @arts_hub
  }
  if (corpus.includes('account') || corpus.includes('financ') || corpus.includes('audit') || corpus.includes('bank')) {
    hubIds.add('cmtiv12pl0006lsvoi5f4hncg') // @accounting_hub
  }
  if (corpus.includes('commerc') || corpus.includes('busin') || corpus.includes('econom') || corpus.includes('market') || corpus.includes('entrepreneur')) {
    hubIds.add('cmtiv10qk0002lsvoau95i8lv') // @commerce_hub
  }
  if (corpus.includes('politic') || corpus.includes('govern') || corpus.includes('diplom') || corpus.includes('public admin')) {
    hubIds.add('cmtiv128q0005lsvo9gsyi4c4') // @governance_hub
  }
  if (corpus.includes('design') || corpus.includes('ui/ux') || corpus.includes('figma') || corpus.includes('graphic')) {
    hubIds.add('cmtiv133e0007lsvoinr72ybg') // @design_hub
  }
  if (corpus.includes('data') || corpus.includes('machine learning') || corpus.includes('artificial intelligence') || corpus.includes('analytics')) {
    hubIds.add('cmtiv13yz0009lsvo8j9ddgy7') // @data_hub
  }
  if (corpus.includes('web') || corpus.includes('software') || corpus.includes('comput') || corpus.includes('cloud') || corpus.includes('coding') || corpus.includes('cyber')) {
    hubIds.add('cmtiv13hs0008lsvopqjsfxml') // @web_hub
  }
  if (corpus.includes('creat') || corpus.includes('video') || corpus.includes('film') || corpus.includes('storytelling')) {
    hubIds.add('cmtiv15cr0011lsvocreatorh') // @creator_hub
  }
  if (corpus.includes('scien') || corpus.includes('physic') || corpus.includes('chemis') || corpus.includes('biolog') || corpus.includes('engin') || corpus.includes('math')) {
    if (!corpus.includes('medical') && !corpus.includes('data science') && !corpus.includes('political')) {
      hubIds.add('cmtiv0zrm0000lsvoquuxye6h') // @science_hub
    }
  }

  // Ensure at least one academic hub if none matched
  if (hubIds.size === 1) {
    hubIds.add('cmtiv0zrm0000lsvoquuxye6h')
  }

  return Array.from(hubIds)
}

async function ensureCommunity(name, type, school, faculty, department, userId) {
  let community
  if (name === 'General University Hub' || type === 'general') {
    community = await prisma.community.findFirst({
      where: { name: { contains: name, mode: 'insensitive' } }
    })
  } else {
    community = await prisma.community.findFirst({
      where: {
        name,
        type,
        school: school || null,
      },
    })
  }

  if (!community) {
    community = await prisma.community.create({
      data: {
        name, type, school: school || null, faculty: faculty || null,
        department: null, createdById: userId,
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

    const { name, email: rawEmail, username: rawUsername, password, phone, school, level, course, track, state, city, country, faculty, skillDomain, interests, referralCode, status, secondaryClass, secondarySubjects } = validationResult.data
    const email = rawEmail.trim().toLowerCase()
    const username = rawUsername.trim().toLowerCase()

    const existingEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })
    if (existingEmail) {
      return res.status(400).json({ message: 'An account with this email address already exists. Please log in instead.' })
    }

    const existingUsername = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    })
    if (existingUsername) {
      return res.status(400).json({ message: 'This username is already taken. Please choose a different username.' })
    }

    let referrer = null
    if (referralCode) {
      referrer = await prisma.user.findUnique({ where: { referralCode: referralCode.trim() } })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name: name.trim(), email, username, password: hashedPassword,
        phone: phone || '',
        school: school || '', level: level || 'University',
        status: status || 'Current Student',
        secondaryClass: ['Science', 'Arts'].includes(secondaryClass) ? secondaryClass : null,
        secondarySubjects: Array.isArray(secondarySubjects) ? secondarySubjects : [],
        course: course || faculty || '',
        track: ['Science', 'Art', 'Commercial'].includes(track) ? track : null,
        state: state || '', city: city || '', country: country || '',
        faculty: faculty || course || '',
        department: '',
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

    // Communities by School & Course/Faculty (No restrictive department lock)
    const isSecondary = level?.toLowerCase() === 'secondary' || level?.toLowerCase() === 'high school'
    if (school && !isSecondary) {
      const courseOrFac = course || faculty
      if (courseOrFac) {
        await ensureCommunity(courseOrFac, 'faculty', school, courseOrFac, '', user.id)
      }
      await ensureCommunity(school, 'school', school, '', '', user.id)
      await ensureCommunity('General University Hub', 'general', '', '', '', user.id)
    } else if (isSecondary) {
      if (school) {
        await ensureCommunity(school, 'school', school, '', '', user.id)
      }
      await ensureCommunity('General Secondary Hub', 'general', '', '', '', user.id)
    }

    // Auto-follow Brand Challenge Hub + Course Hub
    const targetHubIds = resolveHubIdsForUser({ course, faculty, track, skillDomain, interests })
    for (const hubId of targetHubIds) {
      try {
        await prisma.follow.upsert({
          where: { followerId_followingId: { followerId: user.id, followingId: hubId } },
          update: {},
          create: { followerId: user.id, followingId: hubId }
        })
      } catch (_) {}
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
        followingIds: targetHubIds,
        bio: user.bio, coins: user.coins,
        referralCode: user.referralCode,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
