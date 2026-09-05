const prisma = require('../../../lib/prisma')
const jwt = require('jsonwebtoken')
const { protect } = require('../../../lib/auth')

const authorSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  avatar: true,
  school: true,
  faculty: true,
  department: true,
  level: true,
  scholarScore: true,
  badgeSubscriptions: {
    select: { badgeId: true, expiresAt: true }
  }
}

async function getOptionalUser(req) {
  let token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }
  if (!token) return null
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true, name: true, username: true, avatar: true, level: true,
        school: true, faculty: true, department: true, status: true,
        following: { select: { followingId: true } }
      }
    })
  } catch {
    return null
  }
}

async function analyzePostSafetyAndCitation(title, content, category, citationSource) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { isSafe: true, flagReason: null, citationStatus: 'unverified', citationSummary: 'Community post' }

  try {
    const prompt = `You are the ScholarHub Academic Semantic Citation & Global Fact-Checking Engine.
ScholarHub connects university and secondary school students across Africa and globally.
Analyze this student post submission:
Title: "${title || ''}"
Content: "${content || ''}"
Category: "${category || 'General'}"
Claimed Citation / Academic Source: "${citationSource || 'None provided'}"

Evaluation Guidelines:
1. Academic Safety: Flag non-academic, explicit, or harmful material.
2. Citation Status: Mark verified if standard educational concept or valid source.
Return JSON ONLY: { "isSafe": boolean, "flagReason": string|null, "citationStatus": "verified"|"unverified"|"false_claim", "citationSummary": string }`

    let response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
            responseMimeType: 'application/json'
          }
        })
      }
    ).catch(() => null)

    if (!response || !response.ok) {
      response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1000,
              responseMimeType: 'application/json'
            }
          })
        }
      ).catch(() => null)
    }

    if (!response || !response.ok) return { isSafe: true, flagReason: null, citationStatus: 'unverified', citationSummary: 'Community post' }
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return { isSafe: true, flagReason: null, citationStatus: 'unverified', citationSummary: 'Community post' }
    try {
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
      return JSON.parse(cleaned)
    } catch (e) {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) return JSON.parse(match[0])
      return { isSafe: true, flagReason: null, citationStatus: 'unverified', citationSummary: 'Community post' }
    }
  } catch (err) {
    console.error('AI Citation non-blocking fallback:', err)
    return { isSafe: true, flagReason: null, citationStatus: 'unverified', citationSummary: 'Community post' }
  }
}

function fetchWithTimeout(url, options, timeout = 5000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
  ])
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      const { community, search, page = 1, limit = 20, tab, category, communityId } = req.query
      const user = await getOptionalUser(req)
      const pageNum = Math.max(1, parseInt(page))
      const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20))
      const skip = (pageNum - 1) * limitNum

      const searchFilter = search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
            ]
          }
        : {}

      let baseWhere = {
        status: 'approved',
        ...searchFilter
      }

      if (tab === 'following' && user) {
        const followedIds = (user.following || []).map(f => f.followingId)
        baseWhere.authorId = { in: followedIds.length > 0 ? followedIds : ['none'] }
      } else if (tab === 'category' && category) {
        baseWhere.category = category
      } else if (tab === 'community' && communityId) {
        baseWhere.communities = { some: { communityId } }
      }

      let total = await prisma.post.count({ where: baseWhere })
      const totalPages = Math.ceil(total / limitNum)

      const posts = await prisma.post.findMany({
        where: baseWhere,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: authorSelect },
          communities: { include: { community: { select: { name: true } } } },
          _count: { select: { likes: true, comments: true } }
        }
      })

      const enriched = posts.map(p => {
        const { _count, ...rest } = p
        let parsedQuiz = {}
        if (p.citationSummary && p.citationSummary.trim().startsWith('{')) {
          try { parsedQuiz = JSON.parse(p.citationSummary) } catch (_) {}
        }
        return {
          ...rest,
          liked: false,
          likesCount: _count.likes,
          commentCount: _count.comments,
          trending: p.trending || false,
          quizQuestion: parsedQuiz.quizQuestion || p.quizQuestion || null,
          quizOptions: parsedQuiz.quizOptions || p.quizOptions || null,
          correctOptionIndex: parsedQuiz.correctOptionIndex !== undefined ? parsedQuiz.correctOptionIndex : 0
        }
      })
      return res.json({ posts: enriched, page: pageNum, totalPages, total })
    }

    if (req.method === 'POST') {
      const user = await protect(req, res)
      if (!user) return
      if (user.status && user.status !== 'Current Student') {
        return res.status(403).json({ message: `${user.status === 'Graduate' ? 'Graduates' : 'Alumni'} cannot create posts` })
      }
      let { title, content, category, image, video, communityIds, citationSource, isAiAssisted, isVoiceClip, isHandwritten } = req.body
      if (!title || !content) return res.status(400).json({ message: 'Title and content are required' })

      if (!Array.isArray(communityIds)) {
        communityIds = communityIds ? [communityIds] : []
      }
      communityIds = communityIds.filter(id => id && typeof id === 'string' && id !== 'undefined' && id !== 'null')

      if (communityIds.length === 0) {
        let defaultCommunity = await prisma.community.findFirst({
          where: { name: { contains: 'General', mode: 'insensitive' } }
        })
        if (!defaultCommunity) defaultCommunity = await prisma.community.findFirst()
        if (defaultCommunity) {
          communityIds = [defaultCommunity.id]
        }
      }

      const safetyAnalysis = await analyzePostSafetyAndCitation(title, content, category, citationSource)
      if (!safetyAnalysis.isSafe) {
        return res.status(400).json({
          message: safetyAnalysis.flagReason || 'Post blocked by ScholarHub AI Safety.'
        })
      }

      const citationStatus = safetyAnalysis.citationStatus === 'verified' ? 'verified' : 'unverified'
      const citationSummary = safetyAnalysis.citationSummary || 'Post submitted'

      const isBotUser = user.email ? user.email.startsWith('bot_') : false
      const finalIsAiAssisted = Boolean(isAiAssisted || isBotUser)

      const postStatus = 'approved'
      const post = await prisma.post.create({
        data: {
          title,
          content,
          category: category || 'General',
          image: image || '',
          video: video || '',
          isAiAssisted: finalIsAiAssisted,
          isVoiceClip: Boolean(isVoiceClip),
          isHandwritten: Boolean(isHandwritten),
          citationSource: citationSource ? citationSource.trim() : null,
          citationStatus,
          citationSummary,
          authorId: user.id,
          status: postStatus,
          communities: {
            create: communityIds.map(cid => ({ communityId: cid }))
          }
        },
        include: {
          author: { select: authorSelect },
        }
      })

      return res.status(201).json(post)
    }
  } catch (err) {
    console.error('[POSTS API ERROR]', err)
    res.status(500).json({ message: err.message || 'Server error' })
  }
}
