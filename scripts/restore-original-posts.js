require('dotenv').config()
const bcrypt = require('bcryptjs')
const prisma = require('../lib/prisma')

async function restore() {
  console.log('Restoring original posts and users on Supabase...')

  // Clean out starter demo posts
  await prisma.postCommunity.deleteMany({})
  await prisma.postLike.deleteMany({})
  await prisma.comment.deleteMany({})
  await prisma.post.deleteMany({})
  await prisma.communityMember.deleteMany({})
  await prisma.community.deleteMany({})
  await prisma.user.deleteMany({})

  console.log('Cleared demo data.')

  // Recreate Anna's main account
  const hashedPassword = await bcrypt.hash('ScholarHub2026!', 10)

  const annaUser = await prisma.user.create({
    data: {
      name: 'Anna Ugwuanyi',
      email: 'annastesiaugwuanyi@gmail.com',
      username: 'anna',
      password: hashedPassword,
      level: 'University',
      school: 'Enugu State University of Science and Technology, Enugu',
      faculty: 'Faculty of Environmental Sciences',
      department: 'Surveying & Geoinformatics',
      coins: 5000,
      scholarScore: 5,
      isVerified: true,
      bio: 'Surveying & Geoinformatics student at ESUT.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    }
  })

  // ESUT Community
  const esutCom = await prisma.community.create({
    data: {
      name: 'Enugu State University of Science and Technology, Enugu',
      type: 'school',
      school: 'Enugu State University of Science and Technology, Enugu',
      members: {
        create: [{ userId: annaUser.id }]
      }
    }
  })

  // Department Community
  const surveyingCom = await prisma.community.create({
    data: {
      name: 'Surveying & Geoinformatics',
      type: 'department',
      school: 'Enugu State University of Science and Technology, Enugu',
      faculty: 'Faculty of Environmental Sciences',
      department: 'Surveying & Geoinformatics',
      members: {
        create: [{ userId: annaUser.id }]
      }
    }
  })

  // General Hub
  const generalCom = await prisma.community.create({
    data: {
      name: 'General University Hub',
      type: 'general',
      members: {
        create: [{ userId: annaUser.id }]
      }
    }
  })

  // Original Posts
  const originalPosts = [
    {
      title: 'Fundamentals of Land Surveying',
      content: 'Surveying is the science, art, and technology of determining the relative positions of points above, on, or beneath the earth surface by means of direct or indirect measurements of distance, direction, and elevation.',
      category: 'Sciences',
      citationSource: 'SURCON Curriculum and NUC Surveying Standards',
      citationStatus: 'verified',
      citationSummary: 'Verified: Accurately aligns with fundamental concepts found in SURCON and NUC Surveying curricula and international standards.',
      authorId: annaUser.id,
      communityId: surveyingCom.id,
      createdAt: new Date()
    },
    {
      title: 'How Nigeria Constitution Works',
      content: 'Nigerian Constitution is the supreme law of the land, meaning all other laws must align with it. It outlines the three arms of government: the Executive, the Legislature, and the Judiciary.',
      category: 'Law',
      citationSource: '1999 Constitution of the Federal Republic of Nigeria',
      citationStatus: 'verified',
      citationSummary: 'Accurately summarizes key constitutional principles and governance structures in Nigeria.',
      authorId: annaUser.id,
      communityId: generalCom.id,
      createdAt: new Date(Date.now() - 3600000 * 2)
    },
    {
      title: 'Science and its Evolution',
      content: 'Science has evolved from classical natural philosophy to empirical observation and evidence-based methodology, transforming our understanding of the universe.',
      category: 'Sciences',
      citationSource: 'General Science Curriculum',
      citationStatus: 'verified',
      citationSummary: 'Accurately explains fundamental scientific principles and the historical evolution of scientific inquiry.',
      authorId: annaUser.id,
      communityId: generalCom.id,
      createdAt: new Date(Date.now() - 3600000 * 5)
    },
    {
      title: 'What caused the world war I',
      content: 'World War I was triggered by the assassination of Archduke Franz Ferdinand of Austria, exacerbated by intricate web of mutual defense alliances, imperialism, and militarism across Europe.',
      category: 'Arts & Lit',
      citationSource: 'Modern History Curriculum',
      citationStatus: 'verified',
      citationSummary: 'Accurately details the geopolitical tensions, alliances, and historical events of World War I.',
      authorId: annaUser.id,
      communityId: generalCom.id,
      createdAt: new Date(Date.now() - 3600000 * 8)
    },
    {
      title: 'Introduction',
      content: 'Hello, I am Anna and I am studying at Enugu State University of Science and Technology, Enugu.',
      category: 'General',
      citationSource: 'None provided',
      citationStatus: 'unverified',
      citationSummary: 'Community introduction discussion.',
      authorId: annaUser.id,
      communityId: esutCom.id,
      createdAt: new Date(Date.now() - 3600000 * 12)
    }
  ]

  for (const p of originalPosts) {
    const { communityId, ...postData } = p
    await prisma.post.create({
      data: {
        ...postData,
        status: 'approved',
        communities: {
          create: [{ communityId }]
        }
      }
    })
  }

  console.log('Original posts and user restored successfully!')
}

restore()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
