const prisma = require('../../../lib/prisma')

const giftNameToId = {
  'Helpful': 'gift_helpful',
  'Insightful': 'gift_insightful',
  'Creative': 'gift_creative',
  'Brilliant': 'gift_brilliant',
  'Super Intelligent': 'gift_intelligent',
  'Masterclass': 'gift_masterclass',
}

export default async function handler(req, res) {
  try {
    let syncedPostsCount = 0
    let giftsPushedCount = 0

    // 1. Sync from comments with gifts or gift announcements
    const commentsWithGifts = await prisma.comment.findMany({
      where: {
        OR: [
          { gifts: { isEmpty: false } },
          { text: { contains: '🎁' } }
        ]
      },
      select: { postId: true, gifts: true, text: true }
    })

    for (const c of commentsWithGifts) {
      if (!c.postId) continue
      let giftIds = c.gifts || []

      // Parse text if gifts array was empty
      const textContent = c.text || ''
      if (giftIds.length === 0 && textContent.includes('🎁')) {
        for (const [gName, gId] of Object.entries(giftNameToId)) {
          if (textContent.includes(gName)) {
            giftIds.push(gId)
          }
        }
      }

      if (giftIds.length > 0) {
        for (const gId of giftIds) {
          await prisma.post.update({
            where: { id: c.postId },
            data: { gifts: { push: gId } }
          }).catch(() => {})
          giftsPushedCount++
        }
        syncedPostsCount++
      }
    }

    // 2. Sync from gift notifications
    const giftNotifs = await prisma.notification.findMany({
      where: {
        type: 'gift',
        postId: { not: null }
      },
      select: { postId: true, text: true }
    })

    for (const notif of giftNotifs) {
      if (!notif.postId) continue
      const notifText = notif.text || ''
      for (const [gName, gId] of Object.entries(giftNameToId)) {
        if (notifText.includes(gName)) {
          await prisma.post.update({
            where: { id: notif.postId },
            data: { gifts: { push: gId } }
          }).catch(() => {})
          giftsPushedCount++
          syncedPostsCount++
        }
      }
    }

    // 3. Sync from Purchases
    const giftPurchases = await prisma.purchase.findMany({
      where: { type: 'gift' },
      select: { itemId: true, userId: true, recipientId: true, createdAt: true }
    })

    for (const p of giftPurchases) {
      if (p.itemId) {
        // Find recent post by recipient
        const recentPost = await prisma.post.findFirst({
          where: { authorId: p.recipientId },
          orderBy: { createdAt: 'desc' }
        })
        if (recentPost) {
          await prisma.post.update({
            where: { id: recentPost.id },
            data: { gifts: { push: p.itemId } }
          }).catch(() => {})
          giftsPushedCount++
        }
      }
    }

    return res.json({
      success: true,
      message: `Sync complete! Synced ${syncedPostsCount} posts and pushed ${giftsPushedCount} past gift reactions!`,
      syncedPostsCount,
      giftsPushedCount
    })
  } catch (error) {
    console.error('Gift sync error:', error)
    return res.status(500).json({ message: 'Server error', error: error.message })
  }
}
