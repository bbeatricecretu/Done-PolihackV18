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
  }
};
