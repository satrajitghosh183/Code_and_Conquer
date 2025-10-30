export const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  priceId: import.meta.env.VITE_STRIPE_PRICE_ID,
  products: {
    premium: {
      name: 'Premium',
      price: 5.00,
      interval: 'month',
      features: [
        'Unlimited coding problems',
        '2x XP rewards',
        'All premium towers',
        'Ad-free experience',
        'Priority matchmaking',
        'Exclusive badges'
      ]
    }
  }
}

export const TIER_LIMITS = {
  free: {
    maxProblems: 50,
    xpMultiplier: 1,
    towers: ['basic_tower', 'archer_tower'],
    hasAds: true
  },
  premium: {
    maxProblems: Infinity,
    xpMultiplier: 2,
    towers: ['basic_tower', 'archer_tower', 'wizard_tower', 'dragon_tower', 'legendary_tower'],
    hasAds: false
  }
}
