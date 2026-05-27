const badgeItems = [
  {
    id: 'badge_basic', name: 'Basic', price: 3000, durationMonths: 1, icon: '⭐', color: '#94A3B8',
    description: '1 month badge — get started with the basics',
    features: [
      'Badge displayed on your profile',
      'Access to badge system',
      'Basic supporter tag',
    ],
  },
  {
    id: 'badge_premium', name: 'Premium', price: 10000, durationMonths: 3, icon: '💎', color: '#F59E0B',
    description: '3 months badge — unlock more perks',
    features: [
      'Everything in Basic',
      'Send coins to other users',
      'Badge with gold highlight',
    ],
  },
  {
    id: 'badge_extra_premium', name: 'Extra Premium', price: 20000, durationMonths: 12, icon: '👑', color: '#8B5CF6',
    description: '12 months badge — the ultimate experience',
    features: [
      'Everything in Premium',
      'Create and manage communities',
      'Priority support',
      'Exclusive purple badge',
      'Early access to new features',
    ],
  },
]

const airtimeItems = [
  { id: 'airtime_50', name: '₦50 Airtime', price: 50, network: 'any' },
  { id: 'airtime_100', name: '₦100 Airtime', price: 100, network: 'any' },
  { id: 'airtime_200', name: '₦200 Airtime', price: 200, network: 'any' },
  { id: 'airtime_500', name: '₦500 Airtime', price: 500, network: 'any' },
  { id: 'airtime_1000', name: '₦1000 Airtime', price: 1000, network: 'any' },
]

const dataItems = [
  { id: 'data_500mb_daily', name: '500MB Daily', price: 250, validity: '1 day', networks: ['mtn', 'glo', 'airtel'] },
  { id: 'data_1gb_weekly', name: '1GB Weekly (7 days)', price: 350, validity: '7 days', networks: ['mtn', 'glo', 'airtel'] },
  { id: 'data_2gb_weekly', name: '2GB (7 days)', price: 650, validity: '7 days', networks: ['mtn', 'glo', 'airtel'] },
  { id: 'data_500mb_30d', name: '500MB (30 days)', price: 400, validity: '30 days', networks: ['mtn', 'glo', 'airtel'] },
  { id: 'data_2gb_30d', name: '2GB (30 days)', price: 900, validity: '30 days', networks: ['mtn', 'glo', 'airtel'] },
  { id: 'data_1gb_monthly', name: '1GB Monthly', price: 500, validity: '30 days', networks: ['mtn', 'glo', 'airtel'] },
  { id: 'data_3gb_monthly', name: '3GB Monthly', price: 1200, validity: '30 days', networks: ['mtn', 'glo', 'airtel'] },
  { id: 'data_5gb_monthly', name: '5GB Monthly', price: 1800, validity: '30 days', networks: ['mtn', 'glo', 'airtel'] },
  { id: 'data_10gb_30d', name: '10GB (30 days)', price: 3200, validity: '30 days', networks: ['mtn', 'glo', 'airtel'] },
]

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  res.json({ badges: badgeItems, airtime: airtimeItems, data: dataItems })
}
