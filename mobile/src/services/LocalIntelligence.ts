/**
 * LocalIntelligence Service
 * 
 * "Edge Brain" running on the device.
 * Filters noise and calculates urgency locally to save battery/data.
 */

export const LocalIntelligence = {
  /**
   * Check if a notification is likely noise (OTP, promo, system status)
   */
  isNoise: (title: string, body: string): boolean => {
    const text = (title + " " + body).toLowerCase();
    
    // Common noise patterns
    const noisePatterns = [
      'otp', 'code is', 'verification code',
      'download complete', 'updating',
      'battery low', 'usb debugging',
      'running in background',
      'backup complete',
      'promo', 'offer', 'discount', 'sale'
    ];

    return noisePatterns.some(pattern => text.includes(pattern));
  },

  /**
   * Calculate urgency score (0-10) based on keywords
   */
  calculateLocalUrgency: (title: string, body: string): number => {
    const text = (title + " " + body).toLowerCase();
    let score = 0;

    // Urgency keywords
    if (text.includes('urgent') || text.includes('asap') || text.includes('emergency')) score += 5;
    if (text.includes('tomorrow') || text.includes('today') || text.includes('tonight')) score += 3;
    if (text.includes('reminder') || text.includes('due')) score += 2;
    if (text.includes('?')) score += 1; // Questions might need answers

    return Math.min(score, 10);
  },

  /**
   * Detect category from text content
   */
  detectCategory: (title: string, description: string = ''): string | null => {
    const text = (title + " " + description).toLowerCase();
    
    const categories: Record<string, string[]> = {
      'Groceries': ['grocery', 'milk', 'bread', 'eggs', 'supermarket', 'food', 'fruit', 'vegetable'],
      'Pharmacy': ['pharmacy', 'medicine', 'drug', 'pill', 'prescription', 'doctor'],
      'Bank': ['bank', 'atm', 'cash', 'deposit', 'withdraw', 'money'],
      'Gym': ['gym', 'workout', 'exercise', 'fitness', 'training'],
      'Restaurant': ['restaurant', 'dinner', 'lunch', 'breakfast', 'eat', 'food'],
      'Coffee': ['coffee', 'cafe', 'latte', 'espresso', 'starbucks'],
      'Gas Station': ['gas', 'fuel', 'petrol', 'station'],
      'Work': ['meeting', 'office', 'work', 'presentation', 'boss', 'client']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return null;
  },

  /**
   * Map category to Google Places API type
   */
  getPlaceTypeForCategory: (category: string): string | null => {
    const typeMap: Record<string, string> = {
      'Groceries': 'grocery_or_supermarket',
      'Pharmacy': 'pharmacy',
      'Bank': 'bank',
      'Gym': 'gym',
      'Restaurant': 'restaurant',
      'Coffee': 'cafe',
      'Gas Station': 'gas_station'
    };
    
    return typeMap[category] || null;
  }
};
