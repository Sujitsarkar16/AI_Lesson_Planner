/**
 * Document Expiry Utility
 * Calculates document expiry status for 3-day auto-deletion
 */

export interface ExpiryInfo {
  daysRemaining: number;
  hoursRemaining: number;
  isExpiringSoon: boolean; // Less than 24 hours
  isExpired: boolean;
  expiryDate: Date;
  createdAt: Date;
  warningLevel: 'none' | 'info' | 'warning' | 'critical';
}

/**
 * Calculate document expiry information
 * Documents are automatically deleted after 3 days
 */
export function calculateDocumentExpiry(dateCreated: string): ExpiryInfo {
  const createdAt = new Date(dateCreated);
  const now = new Date();
  const expiryDate = new Date(createdAt.getTime() + (3 * 24 * 60 * 60 * 1000)); // +3 days
  
  const timeRemaining = expiryDate.getTime() - now.getTime();
  const hoursRemaining = Math.max(0, timeRemaining / (1000 * 60 * 60));
  const daysRemaining = Math.max(0, hoursRemaining / 24);
  
  const isExpired = timeRemaining <= 0;
  const isExpiringSoon = hoursRemaining < 24 && !isExpired;
  
  let warningLevel: 'none' | 'info' | 'warning' | 'critical' = 'none';
  
  if (isExpired) {
    warningLevel = 'critical';
  } else if (hoursRemaining < 12) {
    warningLevel = 'critical';
  } else if (hoursRemaining < 24) {
    warningLevel = 'warning';
  } else if (daysRemaining < 2) {
    warningLevel = 'info';
  }
  
  return {
    daysRemaining: Number(daysRemaining.toFixed(1)),
    hoursRemaining: Number(hoursRemaining.toFixed(1)),
    isExpiringSoon,
    isExpired,
    expiryDate,
    createdAt,
    warningLevel
  };
}

/**
 * Format time remaining as human-readable string
 */
export function formatTimeRemaining(expiry: ExpiryInfo): string {
  if (expiry.isExpired) {
    return 'Expired';
  }
  
  if (expiry.hoursRemaining < 1) {
    const minutes = Math.floor(expiry.hoursRemaining * 60);
    return `${minutes}m remaining`;
  }
  
  if (expiry.hoursRemaining < 24) {
    return `${Math.floor(expiry.hoursRemaining)}h remaining`;
  }
  
  return `${expiry.daysRemaining.toFixed(1)}d remaining`;
}

/**
 * Get warning message based on expiry status
 */
export function getExpiryWarningMessage(expiry: ExpiryInfo): string | null {
  if (expiry.isExpired) {
    return '⚠️ This document has expired and will be deleted soon';
  }
  
  if (expiry.hoursRemaining < 12) {
    return `🔴 Expires in ${Math.floor(expiry.hoursRemaining)} hours! Export now to save.`;
  }
  
  if (expiry.hoursRemaining < 24) {
    return `⏰ Expires in ${Math.floor(expiry.hoursRemaining)} hours. Consider exporting.`;
  }
  
  if (expiry.daysRemaining < 2) {
    return `📅 Expires in ${expiry.daysRemaining.toFixed(1)} days`;
  }
  
  return null;
}

/**
 * Get CSS classes for expiry badge based on warning level
 */
export function getExpiryBadgeClasses(warningLevel: ExpiryInfo['warningLevel']): string {
  switch (warningLevel) {
    case 'critical':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-500';
    case 'warning':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-500';
    case 'info':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-500';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300';
  }
}
