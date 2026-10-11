const dbConnect = require('../../../lib/db')
const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')

function resolveHubIdsForUser({ course, faculty, track, skillDomain }) {
  const hubIds = new Set(['cmtiv14br0010lsvobrandhub']) // Brand Challenge Hub is automatic for all users
  const corpus = [course, faculty, track, skillDomain].filter(Boolean).join(' ').toLowerCase()

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

  return Array.from(hubIds)
}

async function ensureCommunity(name, type, school, faculty, department, userId) {
  let community = await prisma.community.findFirst({ where: { name, type, school } })
  if (!community) {
    community = await prisma.community.create({
      data: { name, type, school, faculty, department: null, createdById: userId, members: { create: { userId } } },
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

    const { school, level, course, track, state, faculty, skillDomain, status, secondaryClass } = req.body
    const updates = {}
    if (school !== undefined) updates.school = school
    if (level !== undefined) updates.level = level
    if (status !== undefined) updates.status = status
    if (secondaryClass !== undefined) updates.secondaryClass = secondaryClass
    if (course !== undefined) updates.course = course
    if (track !== undefined) updates.track = track
    if (state !== undefined) updates.state = state
    if (faculty !== undefined) updates.faculty = faculty || course

    const { password, ...updated } = await prisma.user.update({ where: { id: user.id }, data: updates })

    const joinedCommunities = []
    const isSecondary = level?.toLowerCase() === 'secondary' || level?.toLowerCase() === 'high school'

    if (school && !isSecondary) {
      const courseOrFac = course || faculty
      if (courseOrFac) {
        const facCom = await ensureCommunity(`${courseOrFac}`, 'faculty', school, courseOrFac, '', user.id)
        joinedCommunities.push(facCom)
        const globalFacCom = await ensureCommunity(`${courseOrFac} (Global)`, 'general', '', courseOrFac, '', user.id)
        joinedCommunities.push(globalFacCom)
      }

      const schCom = await ensureCommunity(school, 'school', school, '', '', user.id)
      joinedCommunities.push(schCom)
    }

    if (!isSecondary) {
      const generalCom = await ensureCommunity('General University Hub', 'general', '', '', '', user.id)
      joinedCommunities.push(generalCom)
    } else {
      if (school) {
        const schCom = await ensureCommunity(school, 'school', school, '', '', user.id)
        joinedCommunities.push(schCom)
      }
      const generalCom = await ensureCommunity('General Secondary Hub', 'general', '', '', '', user.id)
      joinedCommunities.push(generalCom)
    }

    // Auto-follow Brand Challenge Hub + Course Hub
    const targetHubIds = resolveHubIdsForUser({ course, faculty, track, skillDomain })
    for (const hubId of targetHubIds) {
      try {
        await prisma.follow.upsert({
          where: { followerId_followingId: { followerId: user.id, followingId: hubId } },
          update: {},
          create: { followerId: user.id, followingId: hubId }
        })
      } catch (_) {}
    }

    const followingRows = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true }
    })
    const followingIds = followingRows.map(f => f.followingId)

    res.json({
      user: { ...updated, followingIds },
      joinedCommunities: joinedCommunities.map(c => ({ id: c.id, name: c.name, type: c.type }))
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
