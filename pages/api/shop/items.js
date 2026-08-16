const badgeItems = [
  {
    id: 'badge_basic', name: 'Basic', price: 2000, durationMonths: 1, icon: '⭐', color: '#94A3B8',
    description: '1 month badge: write more and post video clips',
    maxWords: 80,
    maxChars: 2500,
    maxVideoSeconds: 30,
    canUploadVideo: true,
    hasPortfolio: true,
    dailyBotMessages: 30,
    features: [
      'Write 0 - 80 words per post',
      'Upload up to 30 seconds video',
      'Personalized Ads experience',
      'Student Portfolio access',
      'Badge displayed on your profile',
    ],
  },
  {
    id: 'badge_premium', name: 'Premium', price: 4500, durationMonths: 1, icon: '💎', color: '#008751',
    description: '1 month badge: creator perks, verified badge & monetization',
    maxWords: 1000,
    maxChars: 5000,
    maxVideoSeconds: 180,
    canUploadVideo: true,
    hasPortfolio: true,
    canMonetize: true,
    isVerifiedBadge: true,
    dailyBotMessages: 100,
    features: [
      'Everything in Basic',
      'Write up to 1,000 words per post',
      'Upload up to 3 minutes video',
      'Fewer Ads',
      'Get Paid (Monetization eligible)',
      'Green & White Scholar verification badge',
      'Send coins to other users',
    ],
  },
  {
    id: 'badge_extra_premium', name: 'Extra Premium', price: 7000, durationMonths: 1, icon: '👑', color: '#8B5CF6',
    description: '1 month badge: unlimited writing & long-form video power',
    maxWords: 999999,
    maxChars: 1000000,
    maxVideoSeconds: 1800,
    canUploadVideo: true,
    hasPortfolio: true,
    canMonetize: true,
    isVerifiedBadge: true,
    noAds: true,
    dailyBotMessages: 9999,
    features: [
      'Everything in Premium',
      'Unlimited characters & words per post',
      'Upload up to 30 minutes video',
      'Completely No Ads',
      'VIP Crown & Scholar Verified Badge',
      'Create and manage communities',
      'Highest Priority Support & Distribution',
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
