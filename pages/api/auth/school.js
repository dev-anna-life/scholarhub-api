const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

async function ensureCommunity(name, type, school, faculty, department, userId) {
  let community = await prisma.community.findFirst({ where: { name, type, school, faculty, department } })
  if (!community) {
    community = await prisma.community.create({
      data: { name, type, school, faculty, department, createdById: userId, members: { create: { userId } } },
    })
  } else {
    const existingMember = await prisma.communityMember.findUnique({ where: { communityId_userId: { communityId: community.id, userId } } })
    if (!existingMember) {
      await prisma.communityMember.create({ data: { communityId: community.id, userId } })
    }
  }
  return community
}

export default async function handler(req, res) {
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    const user = await protect(req, res)
    if (!user) return

    const { school, level, course, track, state, faculty, department, status, secondaryClass } = req.body
    const updates = {}
    if (school !== undefined) updates.school = school
    if (level !== undefined) updates.level = level
    if (status !== undefined) updates.status = status
    if (secondaryClass !== undefined) updates.secondaryClass = secondaryClass
    if (course !== undefined) updates.course = course
    if (track !== undefined) updates.track = track
    if (state !== undefined) updates.state = state
    if (faculty !== undefined) updates.faculty = faculty
    if (department !== undefined) updates.department = department

    const { password, ...updated } = await prisma.user.update({ where: { id: user.id }, data: updates })

    const joinedCommunities = []

    if (school && level?.toLowerCase() === 'university') {
      const deptCom = await ensureCommunity(
        `${faculty || 'General'} - ${department || 'General'}`,
        'department', school, faculty || '', department || '', user.id
      )
      joinedCommunities.push(deptCom)

      if (faculty) {
        const facCom = await ensureCommunity(
          `${faculty}`,
          'faculty', school, faculty, '', user.id
        )
        joinedCommunities.push(facCom)
      }

      const schCom = await ensureCommunity(school, 'school', school, '', '', user.id)
      joinedCommunities.push(schCom)

      if (department) {
        const globalDeptCom = await ensureCommunity(`${department}`, 'general', '', faculty || '', department, user.id)
        joinedCommunities.push(globalDeptCom)
      }
      if (faculty) {
        const globalFacCom = await ensureCommunity(`${faculty} (Global)`, 'general', '', faculty, '', user.id)
        joinedCommunities.push(globalFacCom)
      }
    }

    if (level?.toLowerCase() === 'university') {
      const generalCom = await ensureCommunity('General University Hub', 'general', '', '', '', user.id)
      joinedCommunities.push(generalCom)
    }

    if (level?.toLowerCase() === 'secondary') {
      if (school) {
        const schCom = await ensureCommunity(school, 'school', school, '', '', user.id)
        joinedCommunities.push(schCom)
      }
      const generalCom = await ensureCommunity('General Secondary Hub', 'general', '', '', '', user.id)
      joinedCommunities.push(generalCom)
    }

    res.json({ user: updated, joinedCommunities: joinedCommunities.map(c => ({ id: c.id, name: c.name, type: c.type })) })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
