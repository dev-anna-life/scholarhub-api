const axios = require('axios')
const dbConnect = require('../../../lib/db')
const SchoolRequest = require('../../../models/SchoolRequest')
const { getAllNigerianUniversities } = require('../../../lib/nigerianUniversities')
const { getAllSecondarySchools } = require('../../../lib/africanSecondarySchools')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    await dbConnect()
    let { country, level, query, state } = req.query
    if (!country) return res.status(400).json({ message: 'Country is required' })
    level = level?.toLowerCase() || 'university'

    let schools = []

    if (level === 'secondary') {
      schools = getAllSecondarySchools(country)
    } else if (country === 'Nigeria') {
      schools = getAllNigerianUniversities()
    } else {
      try {
        const { data } = await axios.get(
          `http://universities.hipolabs.com/search?country=${encodeURIComponent(country)}`,
          { timeout: 8000 }
        )
        schools = (data || []).map(u => ({
          name: u.name, country: u.country, level: 'University',
        }))
      } catch {
        const { data } = await axios.get(
          `http://universities.hipolabs.com/search?name=${encodeURIComponent(country)}`,
          { timeout: 8000 }
        )
        schools = (data || [])
          .filter(u => u.country?.toLowerCase() === country.toLowerCase())
          .map(u => ({
            name: u.name, country: u.country, level: 'University',
          }))
      }
    }

    const approved = await SchoolRequest.find({
      level: { $in: [level.charAt(0).toUpperCase() + level.slice(1), level] },
      status: 'approved',
      location: { $regex: country, $options: 'i' },
    }).lean()
    approved.forEach(s => {
      if (!schools.find(x => x.name.toLowerCase() === s.name.toLowerCase())) {
        schools.push({ name: s.name, country, level: level === 'secondary' ? 'Secondary' : 'University', state: s.state || '' })
      }
    })

    if (state && country === 'Nigeria') {
      const st = state.toLowerCase().replace(/[^\w\s]/g, '').trim()
      schools = schools.filter(s => {
        if (!s.state) return false
        const sst = s.state.toLowerCase().replace(/[^\w\s]/g, '').trim()
        return sst.includes(st) || st.includes(sst)
      })
    }

    if (query) {
      const q = query.toLowerCase().replace(/[''\u2018\u2019]/g, '').trim()
      schools = schools.filter(s => {
        const name = s.name.toLowerCase().replace(/[''\u2018\u2019]/g, '')
        const c = (s.country || '').toLowerCase()
        return name.includes(q) || c.includes(q)
      })
    }

    const seen = new Set()
    schools = schools.filter(s => {
      const key = s.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    res.json({ schools: schools.slice(0, 200) })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
