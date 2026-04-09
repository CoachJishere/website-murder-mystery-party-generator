export interface DiscountInfo {
  promoCode: string;
  expiresAt: string;
}

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  totalMs: number;
  expired: boolean;
}

export const ORIGINAL_PRICE = 24.99;
export const DISCOUNT_PERCENT = 20;
export const DISCOUNTED_PRICE = Math.round(ORIGINAL_PRICE * (1 - DISCOUNT_PERCENT / 100) * 100) / 100; // $19.99

export function getTimeRemaining(expiresAt: string): TimeRemaining {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const totalMs = expiry - now;

  if (totalMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, totalMs: 0, expired: true };
  }

  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, totalMs, expired: false };
}

export function isDiscountActive(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > new Date().getTime();
}

export function formatTimeRemaining(time: TimeRemaining): string {
  if (time.expired) return '';

  const parts: string[] = [];
  if (time.days > 0) parts.push(`${time.days}d`);
  if (time.hours > 0) parts.push(`${time.hours}h`);
  if (time.days === 0) parts.push(`${time.minutes}m`);

  return parts.join(' ');
}
