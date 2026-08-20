require('dotenv').config()
const bcrypt = require('bcryptjs')
const prisma = require('../lib/prisma')

async function seed() {
  console.log('Seeding Supabase Database...')

  // 1. Create Admin & Demo Users
  const hashedPassword = await bcrypt.hash('ScholarHub2026!', 10)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@scholarhub.africa' },
    update: {},
    create: {
      name: 'ScholarHub Official',
      email: 'admin@scholarhub.africa',
      username: 'scholarhub',
      password: hashedPassword,
      level: 'University',
      school: 'University of Lagos',
      faculty: 'Faculty of Science',
      department: 'Computer Science',
      coins: 10000,
      scholarScore: 50,
      isVerified: true,
      bio: 'Official ScholarHub Platform Administrator & Academic Verification Team.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    }
  })

  const studentUser = await prisma.user.upsert({
    where: { email: 'student@scholarhub.africa' },
    update: {},
    create: {
      name: 'Helen Stephens',
      email: 'student@scholarhub.africa',
      username: 'helenstephens',
      password: hashedPassword,
      level: 'University',
      school: 'Enugu State University of Science and Technology, Enugu',
      faculty: 'Faculty of Environmental Sciences',
      department: 'Surveying & Geoinformatics',
      coins: 5000,
      scholarScore: 12,
      isVerified: true,
      bio: 'Surveying & Geoinformatics Scholar. Passionate about geospatial engineering and GIS mapping.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
    }
  })

  console.log('Users created:', adminUser.email, studentUser.email)

  // 2. Communities
  const generalCom = await prisma.community.upsert({
    where: { id: 'general-university-hub' },
    update: {},
    create: {
      id: 'general-university-hub',
      name: 'General University Hub',
      type: 'general',
      members: {
        create: [
          { userId: adminUser.id },
          { userId: studentUser.id }
        ]
      }
    }
  })

  const csCom = await prisma.community.upsert({
    where: { id: 'cs-tech-hub' },
    update: {},
    create: {
      id: 'cs-tech-hub',
      name: 'Computing & Information Technology',
      type: 'faculty',
      faculty: 'Faculty of Science',
      department: 'Computer Science',
      members: {
        create: [
          { userId: adminUser.id }
        ]
      }
    }
  })

  const surveyingCom = await prisma.community.upsert({
    where: { id: 'surveying-geoinformatics' },
    update: {},
    create: {
      id: 'surveying-geoinformatics',
      name: 'Surveying & Geoinformatics Hub',
      type: 'department',
      faculty: 'Faculty of Environmental Sciences',
      department: 'Surveying & Geoinformatics',
      members: {
        create: [
          { userId: studentUser.id }
        ]
      }
    }
  })

  console.log('Communities created.')

  // 3. Academic Verified Starter Posts
  const posts = [
    {
      title: 'Fundamentals of Land Surveying',
      content: 'Surveying is the science, art, and technology of determining the relative positions of points above, on, or beneath the earth surface by means of direct or indirect measurements of distance, direction, and elevation.',
      category: 'Sciences',
      citationSource: 'SURCON Curriculum and NUC Surveying Standards',
      citationStatus: 'verified',
      citationSummary: 'Verified: Accurately aligns with SURCON & NUC Surveying curriculum standards.',
      authorId: studentUser.id,
      communityId: surveyingCom.id
    },
    {
      title: 'How Nigeria Constitution Works',
      content: 'The 1999 Constitution of Nigeria is the supreme law of the land, establishing a tripartite federal system with executive, legislative, and judicial branches with distinct separation of powers.',
      category: 'Law',
      citationSource: '1999 Constitution of the Federal Republic of Nigeria (as amended)',
      citationStatus: 'verified',
      citationSummary: 'Verified: Accurately summarizes key constitutional governance frameworks in Nigeria.',
      authorId: adminUser.id,
      communityId: generalCom.id
    },
    {
      title: 'Active Recall and Spaced Repetition in Cognitive Science',
      content: 'Active recall stimulates memory retrieval during the learning process, which significantly improves long-term neural consolidation compared to passive rereading.',
      category: 'Sciences',
      citationSource: 'Cambridge Cognitive Psychology & Learning Standards',
      citationStatus: 'verified',
      citationSummary: 'Verified: Accurately aligns with evidence-based cognitive psychology principles.',
      authorId: studentUser.id,
      communityId: generalCom.id
    },
    {
      title: 'Object-Oriented Programming Principles',
      content: 'The four core pillars of OOP are Encapsulation, Abstraction, Inheritance, and Polymorphism. These allow modularity, reusability, and scalable software architecture.',
      category: 'Technology',
      citationSource: 'ACM / IEEE Computing Curriculum',
      citationStatus: 'verified',
      citationSummary: 'Verified: Accurately reflects standard ACM/IEEE computing curricula benchmarks.',
      authorId: adminUser.id,
      communityId: csCom.id
    }
  ]

  for (const p of posts) {
    const { communityId, ...postData } = p
    await prisma.post.create({
      data: {
        ...postData,
        status: 'approved',
        communities: {
          create: [{ communityId }]
        }
      }
    }).catch(err => console.error('Post error:', err.message))
  }

  console.log('Verified academic posts created successfully on Supabase!')
}

seed()
  .then(async () => {
    await prisma.$disconnect()
    console.log('Seeding complete.')
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
