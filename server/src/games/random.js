// TikiCasino - Centralized Random Number Generation
// Uses Node.js crypto module for better randomness in simulations.
// IMPORTANT: This is purely for simulation/entertainment purposes.
// No real money, gambling, or prizes are involved.
import crypto from 'crypto';

/**
 * Returns a cryptographically random integer in [min, max]
 */
export function randomInt(min, max) {
  if (min >= max) return min;
  const range = max - min + 1;
  const bytes = crypto.randomBytes(4);
  const val = bytes.readUInt32BE(0);
  return min + (val % range);
}

/**
 * Returns a random float in [0, 1) using crypto
 */
export function randomFloat() {
  const bytes = crypto.randomBytes(4);
  return bytes.readUInt32BE(0) / 0x100000000;
}

/**
 * Returns a random float in [min, max)
 */
export function randomFloatRange(min, max) {
  return min + randomFloat() * (max - min);
}

/**
 * Shuffle an array using Fisher-Yates with crypto random
 */
export function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Pick a random element from an array
 */
export function randomElement(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

/**
 * Weighted random pick from items with weights
 * items: [{ value, weight }]
 */
export function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = randomFloat() * totalWeight;
  
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item.value;
  }
  
  return items[items.length - 1].value;
}

/**
 * Generate crash multiplier using exponential distribution
 * This is a SIMULATION only - pure entertainment, no real money
 */
export function generateCrashPoint() {
  // House edge simulation: ~4%
  const houseEdge = 0.04;
  const r = randomFloat();
  
  if (r < houseEdge) {
    return 1.00; // Instant crash (house edge)
  }
  
  // Exponential distribution for crash point
  const p = randomFloat();
  const crashPoint = Math.floor(100 / (1 - p)) / 100;
  return Math.max(1.00, Math.min(crashPoint, 1000.00));
}
