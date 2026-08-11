const nodemailer = require('nodemailer')
const prisma = require('./prisma')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'scholarhubng1@gmail.com',
    pass: process.env.EMAIL_PASS || 'zaew jokd rqdy uztq',
  },
})

async function sendNotificationWithEmail({ userId, fromUserId, type, text, postId, customSubject, customLink }) {
  try {
    if (!userId) return null

    // 1. Create notification in database
    const notif = await prisma.notification.create({
      data: {
        userId,
        fromUserId: fromUserId || null,
        type: type || 'system',
        text: text || '',
        postId: postId || null,
      }
    })

    // 2. Fetch target recipient and sender details
    const [recipient, sender] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
      fromUserId ? prisma.user.findUnique({ where: { id: fromUserId }, select: { name: true, username: true } }) : null,
    ])

    if (!recipient || !recipient.email) return notif

    // 3. Construct Email details
    const senderName = sender?.name || 'Someone'
    let subject = customSubject || 'New Notification on ScholarHub'
    let actionText = text || 'sent you an update on ScholarHub.'
    let ctaUrl = customLink || 'https://scholarhub-web.vercel.app/notifications'

    if (type === 'follow') {
      subject = `${senderName} started following you on ScholarHub!`
      actionText = `${senderName} is now following your activity.`
      ctaUrl = sender?.username ? `https://scholarhub-web.vercel.app/profile/${fromUserId}` : 'https://scholarhub-web.vercel.app/notifications'
    } else if (type === 'comment') {
      subject = `${senderName} commented on your post`
      actionText = `${senderName} left a comment on your post.`
      if (postId) ctaUrl = `https://scholarhub-web.vercel.app/post/${postId}`
    } else if (type === 'like') {
      subject = `${senderName} liked your post`
      actionText = `${senderName} liked your post on ScholarHub.`
      if (postId) ctaUrl = `https://scholarhub-web.vercel.app/post/${postId}`
    } else if (type === 'message') {
      subject = `New message from ${senderName}`
      actionText = `${senderName} sent you a message: "${(text || '').slice(0, 100)}"`
      ctaUrl = `https://scholarhub-web.vercel.app/chat?user=${fromUserId}`
    } else if (type === 'trending') {
      subject = `🔥 Trending on ScholarHub: ${text}`
      actionText = `Check out this trending discussion on ScholarHub!`
      if (postId) ctaUrl = `https://scholarhub-web.vercel.app/post/${postId}`
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="background-color: #0d1e16; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Scholar<span style="color: #10b981;">Hub</span></h1>
        </div>
        <div style="padding: 32px 24px; color: #1f2937;">
          <h2 style="margin-top: 0; font-size: 18px; font-weight: 700; color: #111827;">Hello ${recipient.name || 'Scholar'},</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
            ${actionText}
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${ctaUrl}" style="background-color: #10b981; color: #ffffff; padding: 12px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; display: inline-block;">
              View on ScholarHub
            </a>
          </div>
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 16px;">
            You are receiving this email because of activity on your ScholarHub account.<br>ScholarHub © 2026
          </p>
        </div>
      </div>
    `

    // Send email asynchronously
    transporter.sendMail({
      from: `"ScholarHub" <${process.env.EMAIL_USER || 'scholarhubng1@gmail.com'}>`,
      to: recipient.email,
      subject,
      html,
    }).catch(err => console.error(`Email notification failed for ${recipient.email}:`, err.message))

    return notif
  } catch (err) {
    console.error('Error sending notification & email:', err)
  }
}

module.exports = { sendNotificationWithEmail, sendPushNotification: sendNotificationWithEmail }
