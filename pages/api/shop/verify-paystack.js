const prisma = require('../../../lib/prisma')
const { protect } = require('../../../lib/auth')
const axios = require('axios')

const badgePackages = [
  { id: 'badge_basic', name: 'Basic', priceNGN: 2000, durationMonths: 1, type: 'badge' },
  { id: 'badge_premium', name: 'Premium', priceNGN: 4500, durationMonths: 1, type: 'badge' },
  { id: 'badge_extra_premium', name: 'Extra Premium', priceNGN: 7000, durationMonths: 1, type: 'badge' },
]

const coinPackages = [
  { id: 'coins_5000', amount: 5000, priceNGN: 10000, name: '5,000 Scholar Coins', type: 'coins' },
  { id: 'coins_10000', amount: 10000, priceNGN: 20000, name: '10,000 Scholar Coins', type: 'coins' },
  { id: 'coins_25000', amount: 25000, priceNGN: 50000, name: '25,000 Scholar Coins', type: 'coins' },
  { id: 'coins_50000', amount: 50000, priceNGN: 100000, name: '50,000 Scholar Coins', type: 'coins' },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  
  try {
    const user = await protect(req, res)
    if (!user) return

    const { reference, itemId, recipientUsername } = req.body
    if (!reference) return res.status(400).json({ message: 'Paystack transaction reference is required' })
    if (!itemId) return res.status(400).json({ message: 'itemId is required' })

    const pkg = [...badgePackages, ...coinPackages].find(p => p.id === itemId)
    if (!pkg) return res.status(404).json({ message: 'Package not found' })

    // Check if Paystack Secret Key is configured on the environment
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecret) {
      return res.status(501).json({
        message: 'Paystack integration is not configured on this server. Please set PAYSTACK_SECRET_KEY in environment variables.'
      })
    }

    // Call Paystack API to verify transaction status
    let verificationResponse
    try {
      verificationResponse = await axios.get(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        }
      })
    } catch (paystackError) {
      console.error('Paystack verification request failed:', paystackError.response?.data || paystackError.message)
      return res.status(400).json({ message: 'Failed to verify transaction with Paystack' })
    }

    const paystackData = verificationResponse.data?.data
    if (!paystackData || paystackData.status !== 'success') {
      return res.status(400).json({ message: 'Payment verification failed: Transaction was not successful' })
    }

    // Verify amount matches (Paystack transaction amount is in kobo, priceNGN is in naira)
    const expectedAmountKobo = pkg.priceNGN * 100
    if (paystackData.amount !== expectedAmountKobo) {
      return res.status(400).json({
        message: `Amount mismatch. Expected ${expectedAmountKobo} kobo, received ${paystackData.amount} kobo.`
      })
    }

    // Check if this reference has already been processed to prevent double-spending
    const existingPurchase = await prisma.purchase.findUnique({
      where: { id: `paystack_${reference}` }
    })
    if (existingPurchase) {
      return res.status(400).json({ message: 'This transaction reference has already been processed' })
    }

    // Resolve target recipient
    let targetUser = user
    if (recipientUsername && recipientUsername.trim()) {
      targetUser = await prisma.user.findUnique({
        where: { username: recipientUsername.trim().toLowerCase() }
      })
      if (!targetUser) return res.status(404).json({ message: 'Recipient username not found' })
    }

    if (pkg.type === 'badge') {
      // Calculate expiry date
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + pkg.durationMonths)

      const now = new Date()
      const existingSub = await prisma.badgeSubscription.findFirst({
        where: { userId: targetUser.id, badgeId: pkg.id, expiresAt: { gt: now } }
      })

      if (existingSub) {
        const extendedExpiry = new Date(existingSub.expiresAt)
        extendedExpiry.setMonth(extendedExpiry.getMonth() + pkg.durationMonths)
        await prisma.badgeSubscription.update({
          where: { id: existingSub.id },
          data: { expiresAt: extendedExpiry }
        })
      } else {
        await prisma.badgeSubscription.create({
          data: { userId: targetUser.id, badgeId: pkg.id, purchasedAt: new Date(), expiresAt }
        })
      }

      await prisma.purchase.create({
        data: {
          id: `paystack_${reference}`,
          userId: user.id,
          recipientId: targetUser.id !== user.id ? targetUser.id : null,
          itemId: pkg.id,
          itemName: pkg.name,
          price: pkg.priceNGN,
          type: targetUser.id !== user.id ? 'badge_gift' : 'badge_purchase',
          giftedBy: targetUser.id !== user.id ? user.id : null,
        }
      })

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { badgeSubscriptions: true }
      })

      return res.json({
        message: targetUser.id !== user.id
          ? `${pkg.name} badge gifted to @${recipientUsername} successfully via Paystack!`
          : `${pkg.name} badge subscription activated successfully via Paystack!`,
        badgeSubscriptions: updatedUser.badgeSubscriptions,
        coins: updatedUser.coins,
      })
    } else {
      // Process Coins Purchase
      await prisma.$transaction([
        prisma.user.update({
          where: { id: targetUser.id },
          data: { coins: { increment: pkg.amount } }
        }),
        prisma.purchase.create({
          data: {
            id: `paystack_${reference}`,
            userId: user.id,
            recipientId: targetUser.id !== user.id ? targetUser.id : null,
            itemId: pkg.id,
            itemName: pkg.name,
            price: pkg.priceNGN,
            type: targetUser.id !== user.id ? 'coin_gift' : 'coin_purchase',
            giftedBy: targetUser.id !== user.id ? user.id : null,
          }
        })
      ])

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { badgeSubscriptions: true }
      })

      return res.json({
        message: targetUser.id !== user.id
          ? `Successfully gifted ${pkg.amount.toLocaleString()} coins to @${recipientUsername} via Paystack!`
          : `Successfully purchased ${pkg.amount.toLocaleString()} coins via Paystack!`,
        coins: updatedUser.coins,
        badgeSubscriptions: updatedUser.badgeSubscriptions,
      })
    }
  } catch (error) {
    console.error('Verify Paystack error:', error)
    res.status(500).json({ message: 'Server error during payment verification', error: error.message })
  }
}
