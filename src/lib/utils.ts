// src/lib/utils.ts

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  const intervals: { [key: string]: number } = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [name, secondsInInterval] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInInterval);
    if (interval >= 1) {
      return `${interval} ${name}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}

/**
 * Format price with currency
 */
export function formatPrice(
  price: number,
  currency: string = 'ZAR',
  locale: string = 'en-ZA'
): string {
  if (!price) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(price);
}

/**
 * Format number as percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert snake_case to Title Case
 */
export function snakeCaseToTitle(text: string): string {
  if (!text) return '';
  return text
    .split('_')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  feedback: string[];
} {
  const feedback: string[] = [];

  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain uppercase letters');
  }
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain lowercase letters');
  }
  if (!/[0-9]/.test(password)) {
    feedback.push('Password must contain numbers');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    feedback.push('Password must contain special characters (!@#$%^&*)');
  }

  const strength =
    feedback.length === 0 ? 'strong' : feedback.length <= 2 ? 'medium' : 'weak';

  return {
    isValid: feedback.length === 0,
    strength,
    feedback,
  };
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Generate initials from name
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((word) => word[0]?.toUpperCase())
    .join('')
    .slice(0, 2);
}

/**
 * Get status badge color
 */
export function getStatusColor(
  status: string
): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  const statusMap: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    completed: 'success',
    cancelled: 'default',
    active: 'success',
    inactive: 'default',
    verified: 'success',
    unverified: 'warning',
  };

  return statusMap[status.toLowerCase()] || 'default';
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: string): string {
  const roleMap: Record<string, string> = {
    user: 'User',
    admin: 'Administrator',
    superadmin: 'Super Administrator',
  };

  return roleMap[role.toLowerCase()] || role;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: any): boolean {
  return (
    obj === null ||
    obj === undefined ||
    (typeof obj === 'object' &&
      (Array.isArray(obj) ? obj.length === 0 : Object.keys(obj).length === 0))
  );
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue)
      ) {
        result[key] = deepMerge(
          targetValue as any,
          sourceValue as any
        );
      } else {
        result[key] = sourceValue as any;
      }
    }
  }

  return result;
}

/**
 * Build query string from filters
 */
export function buildQueryString(filters: Record<string, any>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  }

  return params.toString();
}

/**
 * Parse query string to object
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};

  params.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Compare two objects for equality
 */
export function isEqual(obj1: any, obj2: any): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}