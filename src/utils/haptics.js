/**
 * Haptics Utility
 * Provides a safe wrapper for navigator.vibrate
 */

export const haptics = {
  /**
   * Safe vibration call
   * @param {number|number[]} pattern - Vibration duration in ms or pattern array
   */
  vibrate: (pattern = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        console.warn('Haptics not supported or blocked:', e);
      }
    }
  },

  /**
   * Predefined patterns
   */
  success: () => haptics.vibrate([10, 30, 10]),
  warning: () => haptics.vibrate([30, 50, 30]),
  error: () => haptics.vibrate([50, 100, 50, 100, 50]),
  light: () => haptics.vibrate(10),
  medium: () => haptics.vibrate(30),
  heavy: () => haptics.vibrate(60)
};
