// Products will be populated with category IDs during seeding
const products = [
  // Cold Drinks
  {
    name: 'Sparkling Water',
    description: 'Refreshing lime essence, zero calories. Perfect for staying hydrated.',
    price: 1.50,
    categorySlug: 'cold-drinks',
    image: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=400',
    size: '12oz',
    tags: ['zero-sugar', 'refreshing', 'hydration'],
    nutritionInfo: {
      calories: 0,
      sugar: '0g',
      protein: '0g',
      fat: '0g',
      carbs: '0g'
    },
    stock: 15,
    slotPosition: 'A1',
    isAvailable: true,
    isBestSeller: false,
    isChilled: true
  },
  {
    name: 'Cola Classic',
    description: 'The original taste you love. Ice cold and refreshing.',
    price: 2.00,
    categorySlug: 'cold-drinks',
    image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400',
    size: '12oz',
    tags: ['classic', 'popular'],
    nutritionInfo: {
      calories: 140,
      sugar: '39g',
      protein: '0g',
      fat: '0g',
      carbs: '39g'
    },
    stock: 20,
    slotPosition: 'A2',
    isAvailable: true,
    isBestSeller: true,
    isChilled: true
  },
  {
    name: 'Orange Juice',
    description: 'Fresh squeezed taste with 100% vitamin C.',
    price: 2.50,
    categorySlug: 'cold-drinks',
    image: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400',
    size: '10oz',
    tags: ['vitamin-c', 'natural', 'healthy'],
    nutritionInfo: {
      calories: 110,
      sugar: '22g',
      protein: '2g',
      fat: '0g',
      carbs: '26g'
    },
    stock: 12,
    slotPosition: 'A3',
    isAvailable: true,
    isBestSeller: false,
    isChilled: true
  },
  {
    name: 'Energy Drink',
    description: 'Get energized with our power-packed energy drink.',
    price: 3.00,
    categorySlug: 'cold-drinks',
    image: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=400',
    size: '16oz',
    tags: ['energy', 'caffeine', 'boost'],
    nutritionInfo: {
      calories: 110,
      sugar: '27g',
      protein: '0g',
      fat: '0g',
      carbs: '28g'
    },
    stock: 10,
    slotPosition: 'A4',
    isAvailable: true,
    isBestSeller: true,
    isChilled: true
  },
  {
    name: 'Iced Tea',
    description: 'Refreshing brewed iced tea with a hint of lemon.',
    price: 2.00,
    categorySlug: 'cold-drinks',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
    size: '16oz',
    tags: ['tea', 'refreshing', 'low-calorie'],
    nutritionInfo: {
      calories: 70,
      sugar: '17g',
      protein: '0g',
      fat: '0g',
      carbs: '18g'
    },
    stock: 14,
    slotPosition: 'A5',
    isAvailable: true,
    isBestSeller: false,
    isChilled: true
  },

  // Snacks
  {
    name: 'Classic Chips',
    description: 'Crispy, salty, and satisfying potato chips.',
    price: 1.75,
    categorySlug: 'snacks',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400',
    size: '1.5oz',
    tags: ['crispy', 'salty', 'classic'],
    nutritionInfo: {
      calories: 160,
      sugar: '1g',
      protein: '2g',
      fat: '10g',
      carbs: '15g'
    },
    stock: 18,
    slotPosition: 'B1',
    isAvailable: true,
    isBestSeller: true,
    isChilled: false
  },
  {
    name: 'Chocolate Bar',
    description: 'Rich milk chocolate for a sweet treat.',
    price: 2.00,
    categorySlug: 'snacks',
    image: 'https://images.unsplash.com/photo-1575377427642-087cf684f29d?w=400',
    size: '1.5oz',
    tags: ['chocolate', 'sweet', 'treat'],
    nutritionInfo: {
      calories: 210,
      sugar: '24g',
      protein: '3g',
      fat: '13g',
      carbs: '26g'
    },
    stock: 20,
    slotPosition: 'B2',
    isAvailable: true,
    isBestSeller: true,
    isChilled: false
  },
  {
    name: 'Trail Mix',
    description: 'A healthy mix of nuts, seeds, and dried fruits.',
    price: 2.50,
    categorySlug: 'snacks',
    image: 'https://images.unsplash.com/photo-1604054923567-d64a5d5c3c71?w=400',
    size: '2oz',
    tags: ['healthy', 'nuts', 'energy'],
    nutritionInfo: {
      calories: 140,
      sugar: '8g',
      protein: '4g',
      fat: '9g',
      carbs: '13g'
    },
    stock: 12,
    slotPosition: 'B3',
    isAvailable: true,
    isBestSeller: false,
    isChilled: false
  },
  {
    name: 'Cookies Pack',
    description: 'Delicious chocolate chip cookies.',
    price: 1.50,
    categorySlug: 'snacks',
    image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400',
    size: '2oz',
    tags: ['cookies', 'chocolate-chip', 'sweet'],
    nutritionInfo: {
      calories: 180,
      sugar: '12g',
      protein: '2g',
      fat: '9g',
      carbs: '25g'
    },
    stock: 15,
    slotPosition: 'B4',
    isAvailable: true,
    isBestSeller: false,
    isChilled: false
  },
  {
    name: 'Cheese Crackers',
    description: 'Savory cheese-flavored crackers.',
    price: 1.75,
    categorySlug: 'snacks',
    image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400',
    size: '1.5oz',
    tags: ['cheese', 'savory', 'crackers'],
    nutritionInfo: {
      calories: 150,
      sugar: '1g',
      protein: '3g',
      fat: '8g',
      carbs: '17g'
    },
    stock: 16,
    slotPosition: 'B5',
    isAvailable: true,
    isBestSeller: false,
    isChilled: false
  },

  // Hot Drinks
  {
    name: 'Hot Coffee',
    description: 'Freshly brewed premium coffee.',
    price: 2.50,
    categorySlug: 'hot-drinks',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
    size: '12oz',
    tags: ['coffee', 'hot', 'caffeine'],
    nutritionInfo: {
      calories: 5,
      sugar: '0g',
      protein: '0g',
      fat: '0g',
      carbs: '0g'
    },
    stock: 25,
    slotPosition: 'C1',
    isAvailable: true,
    isBestSeller: true,
    isChilled: false
  },
  {
    name: 'Hot Chocolate',
    description: 'Rich and creamy hot chocolate.',
    price: 2.50,
    categorySlug: 'hot-drinks',
    image: 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=400',
    size: '12oz',
    tags: ['chocolate', 'hot', 'creamy'],
    nutritionInfo: {
      calories: 190,
      sugar: '24g',
      protein: '2g',
      fat: '8g',
      carbs: '27g'
    },
    stock: 15,
    slotPosition: 'C2',
    isAvailable: true,
    isBestSeller: false,
    isChilled: false
  },
  {
    name: 'Green Tea',
    description: 'Soothing and healthy green tea.',
    price: 2.00,
    categorySlug: 'hot-drinks',
    image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400',
    size: '12oz',
    tags: ['tea', 'healthy', 'antioxidants'],
    nutritionInfo: {
      calories: 0,
      sugar: '0g',
      protein: '0g',
      fat: '0g',
      carbs: '0g'
    },
    stock: 18,
    slotPosition: 'C3',
    isAvailable: true,
    isBestSeller: false,
    isChilled: false
  },

  // Healthy
  {
    name: 'Protein Bar',
    description: 'High-protein bar for energy and muscle recovery.',
    price: 3.00,
    categorySlug: 'healthy',
    image: 'https://images.unsplash.com/photo-1622484212850-eb596d769eab?w=400',
    size: '2oz',
    tags: ['protein', 'energy', 'fitness'],
    nutritionInfo: {
      calories: 200,
      sugar: '5g',
      protein: '20g',
      fat: '7g',
      carbs: '22g'
    },
    stock: 14,
    slotPosition: 'D1',
    isAvailable: true,
    isBestSeller: true,
    isChilled: false
  },
  {
    name: 'Greek Yogurt',
    description: 'Creamy Greek yogurt with live cultures.',
    price: 2.75,
    categorySlug: 'healthy',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
    size: '5.3oz',
    tags: ['yogurt', 'probiotics', 'protein'],
    nutritionInfo: {
      calories: 120,
      sugar: '7g',
      protein: '15g',
      fat: '0g',
      carbs: '8g'
    },
    stock: 10,
    slotPosition: 'D2',
    isAvailable: true,
    isBestSeller: false,
    isChilled: true
  },
  {
    name: 'Fresh Apple',
    description: 'Crisp and fresh apple for a healthy snack.',
    price: 1.50,
    categorySlug: 'healthy',
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400',
    size: 'Medium',
    tags: ['fruit', 'fresh', 'natural'],
    nutritionInfo: {
      calories: 95,
      sugar: '19g',
      protein: '0g',
      fat: '0g',
      carbs: '25g'
    },
    stock: 8,
    slotPosition: 'D3',
    isAvailable: true,
    isBestSeller: false,
    isChilled: true
  },
  {
    name: 'Veggie Sticks',
    description: 'Fresh vegetable sticks with hummus dip.',
    price: 3.50,
    categorySlug: 'healthy',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
    size: '4oz',
    tags: ['vegetables', 'low-calorie', 'fresh'],
    nutritionInfo: {
      calories: 150,
      sugar: '5g',
      protein: '4g',
      fat: '10g',
      carbs: '12g'
    },
    stock: 6,
    slotPosition: 'D4',
    isAvailable: true,
    isBestSeller: false,
    isChilled: true
  },

  // Essentials
  {
    name: 'Pain Relief',
    description: 'Over-the-counter pain relief tablets.',
    price: 4.00,
    categorySlug: 'essentials',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
    size: '2 tablets',
    tags: ['medicine', 'pain-relief', 'essential'],
    nutritionInfo: {},
    stock: 20,
    slotPosition: 'E1',
    isAvailable: true,
    isBestSeller: false,
    isChilled: false
  },
  {
    name: 'Hand Sanitizer',
    description: 'Antibacterial hand sanitizer gel.',
    price: 2.50,
    categorySlug: 'essentials',
    image: 'https://images.unsplash.com/photo-1584483720412-ce931f4aefa8?w=400',
    size: '2oz',
    tags: ['hygiene', 'antibacterial', 'essential'],
    nutritionInfo: {},
    stock: 15,
    slotPosition: 'E2',
    isAvailable: true,
    isBestSeller: false,
    isChilled: false
  },
  {
    name: 'Tissues Pack',
    description: 'Soft facial tissues pack.',
    price: 1.50,
    categorySlug: 'essentials',
    image: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=400',
    size: '10 count',
    tags: ['tissues', 'hygiene', 'essential'],
    nutritionInfo: {},
    stock: 25,
    slotPosition: 'E3',
    isAvailable: true,
    isBestSeller: false,
    isChilled: false
  }
];

module.exports = products;
