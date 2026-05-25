const shopItems = [
  { id: 'activate_badge', name: 'Badge System', description: 'Unlock ability to buy & gift badges to others', price: 500, icon: '🎖️', category: 'activation' },
  { id: 'activate_transfer', name: 'Coin Transfer', description: 'Unlock ability to send coins to other users', price: 500, icon: '💸', category: 'activation' },
  { id: 'activate_community', name: 'Create Community', description: 'Create your own community for others to join', price: 100, icon: '🌍', category: 'activation' },
  { id: 'airtime', name: 'Buy Airtime/Data', description: 'Convert coins to airtime or mobile data', price: 0, icon: '📱', category: 'coming_soon' },
  { id: 'cashout', name: 'Convert to Cash', description: 'Withdraw your coins as cash', price: 0, icon: '💰', category: 'coming_soon' },
]

const badgeItems = [
  { id: 'badge_1', name: 'Scholar', description: 'For academic excellence', price: 100, icon: '🎓', category: 'achievement' },
  { id: 'badge_2', name: 'Helper', description: 'For helping others', price: 100, icon: '🤝', category: 'social' },
  { id: 'badge_3', name: 'Innovator', description: 'For creative ideas', price: 150, icon: '💡', category: 'achievement' },
  { id: 'badge_4', name: 'Athlete', description: 'For sports participation', price: 100, icon: '🏅', category: 'sports' },
  { id: 'badge_5', name: 'Leader', description: 'For leadership qualities', price: 200, icon: '👑', category: 'achievement' },
  { id: 'badge_6', name: 'Artist', description: 'For creative expression', price: 100, icon: '🎨', category: 'creative' },
  { id: 'badge_7', name: 'MVP', description: 'Most Valuable Participant', price: 300, icon: '⭐', category: 'achievement' },
  { id: 'badge_8', name: 'Veteran', description: 'Long-standing member', price: 250, icon: '🏆', category: 'achievement' },
]

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  res.json({ activations: shopItems, badges: badgeItems })
}
