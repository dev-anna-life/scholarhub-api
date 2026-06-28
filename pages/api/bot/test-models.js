export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(200).json({ error: 'GEMINI_API_KEY is not configured in environment variables.' })
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    )
    
    const data = await response.json()
    return res.status(200).json({
      status: response.status,
      statusText: response.statusText,
      data
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
