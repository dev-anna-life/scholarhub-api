const shopItems = [
  { id: 'badge_1', name: 'Scholar', description: 'For academic excellence', price: 100, icon: '🎓', category: 'achievement' },
  { id: 'badge_2', name: 'Helper', description: 'For helping others', price: 100, icon: '🤝', category: 'social' },
  { id: 'badge_3', name: 'Innovator', description: 'For creative ideas', price: 150, icon: '💡', category: 'achievement' },
  { id: 'badge_4', name: 'Athlete', description: 'For sports participation', price: 100, icon: '🏅', category: 'sports' },
  { id: 'badge_5', name: 'Leader', description: 'For leadership qualities', price: 200, icon: '👑', category: 'achievement' },
  { id: 'badge_6', name: 'Artist', description: 'For creative expression', price: 100, icon: '🎨', category: 'creative' },
  { id: 'badge_7', name: 'MVP', description: 'Most Valuable Participant', price: 300, icon: '⭐', category: 'achievement' },
  { id: 'badge_8', name: 'Veteran', description: 'Long-standing member', price: 250, icon: '🏆', category: 'achievement' },
  { id: 'cosmetic_1', name: 'Gold Frame', description: 'Premium profile frame', price: 500, icon: '🖼️', category: 'cosmetic' },
  { id: 'cosmetic_2', name: 'Neon Tag', description: 'Glowing username tag', price: 750, icon: '✨', category: 'cosmetic' },
  { id: 'boost_1', name: 'XP Boost', description: 'Double XP for 24 hours', price: 200, icon: '⚡', category: 'boost' },
  { id: 'boost_2', name: 'Visibility Boost', description: 'Featured profile for 24h', price: 300, icon: '🔍', category: 'boost' },
]

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  res.json(shopItems)
}
