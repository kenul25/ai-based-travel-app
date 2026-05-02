export const normalizePhoneNumber = (value = '') => value.replace(/\D/g, '').slice(0, 10);

export const validatePhoneNumber = (value = '') => {
  const digits = normalizePhoneNumber(value);
  if (!digits) return 'Phone number is required.';
  if (digits.length !== 10) return 'Phone number must be exactly 10 digits.';
  if (!digits.startsWith('0')) return 'Use a valid local phone number starting with 0.';
  return '';
};

export const validateEmail = (value = '') => {
  if (!value.trim()) return 'Email address is required.';
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(value.trim()) ? '' : 'Enter a valid email address.';
};

export const validateRequiredName = (value = '', label = 'Name') => (
  value.trim().length >= 2 ? '' : `${label} must be at least 2 characters.`
);

export const getPasswordStrength = (password = '') => {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  if (!password) {
    return { score: 0, label: 'Enter a password', colorKey: 'textMuted', message: 'Use at least 8 characters.' };
  }
  if (score <= 2) {
    return { score, label: 'Weak', colorKey: 'error', message: 'Add uppercase, lowercase, number, and symbol.' };
  }
  if (score <= 4) {
    return { score, label: 'Good', colorKey: 'amber', message: 'A symbol and mixed characters make it stronger.' };
  }
  return { score, label: 'Strong', colorKey: 'success', message: 'Strong password.' };
};

export const validatePassword = (password = '') => {
  if (!password) return 'Password is required.';
  const strength = getPasswordStrength(password);
  return strength.score >= 4 ? '' : 'Use at least 8 characters with uppercase, lowercase, and a number.';
};

export const validatePasswordMatch = (password = '', confirmPassword = '') => {
  if (!confirmPassword) return 'Confirm your password.';
  return password === confirmPassword ? '' : 'Passwords do not match.';
};
