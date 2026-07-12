const axios = require('axios')
const prisma = require('../../../lib/prisma')
const { getAllNigerianUniversities } = require('../../../lib/nigerianUniversities')
const { getAllSecondarySchools } = require('../../../lib/africanSecondarySchools')
const { getUniversitiesForCountry } = require('../../../lib/africanUniversities')
const { getWAECSchools } = require('../../../lib/waecSchools')

const AFRICAN_COUNTRIES = new Set([
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
  'Cameroon', 'Cape Verde', 'Central African Republic', 'Chad',
  'Comoros', 'Congo', 'Côte d\'Ivoire', 'Democratic Republic of the Congo',
  'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini',
  'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau',
  'Ivory Coast', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar',
  'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique',
  'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'São Tomé and Príncipe',
  'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa',
  'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda',
  'Zambia', 'Zimbabwe',
])

function normalizeCountry(country) {
  if (!country) return country
  const c = country.trim()
  const map = {
    "côte d'ivoire": "Côte d'Ivoire",
    "ivory coast": "Côte d'Ivoire",
    "democratic republic of congo": 'Democratic Republic of the Congo',
    "drc": 'Democratic Republic of the Congo',
    "dr congo": 'Democratic Republic of the Congo',
    "republic of congo": 'Congo',
    "congo brazzaville": 'Congo',
    "congo drc": 'Democratic Republic of the Congo',
    "são tomé and príncipe": 'São Tomé and Príncipe',
    "sao tome and principe": 'São Tomé and Príncipe',
    "cape verde": 'Cape Verde',
    "eswatini": 'Eswatini',
    "swaziland": 'Eswatini',
    "burkina faso": 'Burkina Faso',
    "central african republic": 'Central African Republic',
    "equatorial guinea": 'Equatorial Guinea',
    "guinea bissau": 'Guinea-Bissau',
    "sierra leone": 'Sierra Leone',
    "south sudan": 'South Sudan',
    "ivory coast": 'Côte d\'Ivoire',
  }
  return map[c.toLowerCase()] || c
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    let { country, level, query, state } = req.query
    if (!country) return res.status(400).json({ message: 'Country is required' })
    country = normalizeCountry(country)
    level = level?.toLowerCase() || 'university'

    let schools = []

    if (level === 'secondary') {
      schools = getAllSecondarySchools(country)
      if (country === 'Nigeria') schools = schools.concat(getWAECSchools())
    } else if (country === 'Nigeria') {
      schools = getAllNigerianUniversities()
    } else if (AFRICAN_COUNTRIES.has(country)) {
      schools = getUniversitiesForCountry(country)
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

    const approved = await prisma.schoolRequest.findMany({
      where: {
        level: { in: [level.charAt(0).toUpperCase() + level.slice(1), level] },
        status: 'approved',
        location: { contains: country, mode: 'insensitive' },
      }
    })
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
