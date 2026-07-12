const rateLimitWindow = 15 * 60 * 1000
const maxRequests = 100

const ipCache = new Map()

setInterval(() => {
  const now = Date.now()
  for (const [ip, data] of ipCache.entries()) {
    if (now > data.resetTime) {
      ipCache.delete(ip)
    }
  }
}, 5 * 60 * 1000)

function rateLimiter(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anonymous'
  const now = Date.now()

  if (!ipCache.has(ip)) {
    ipCache.set(ip, {
      count: 1,
      resetTime: now + rateLimitWindow,
    })
    return true
  }

  const data = ipCache.get(ip)
  if (now > data.resetTime) {
    data.count = 1
    data.resetTime = now + rateLimitWindow
    return true
  }

  data.count += 1
  if (data.count > maxRequests) {
    const retryAfter = Math.ceil((data.resetTime - now) / 1000)
    res.setHeader('Retry-After', retryAfter)
    res.status(429).json({
      message: `Too many requests. Please try again in ${retryAfter} seconds.`
    })
    return false
  }

  return true
}

module.exports = rateLimiter
