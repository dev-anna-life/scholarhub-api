const prisma = require('./prisma')

async function sendPushNotification(userId, title, body, payload = {}) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    })
    
    if (!user) {
      console.warn(`User ${userId} not found for push notification.`)
      return false
    }

    console.log(`[Push Notification Simulation]
      To: ${user.name} (${user.email} / ID: ${userId})
      Title: ${title}
      Body: ${body}
      Data: ${JSON.stringify(payload)}
    `)

    return true
  } catch (err) {
    console.error('Error sending push notification:', err.message)
    return false
  }
}

module.exports = { sendPushNotification }
