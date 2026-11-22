/**
 * Authentication validation utilities
 */
export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very Weak" | "Weak" | "Fair" | "Good" | "Strong";
  color: "red" | "orange" | "yellow" | "blue" | "green";
  percentage: number;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (!password) return { score: 0, label: "Very Weak", color: "red", percentage: 0 };
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  score = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const map: Record<number, PasswordStrength> = {
    0: { score: 0, label: "Very Weak", color: "red", percentage: 20 },
    1: { score: 1, label: "Weak", color: "red", percentage: 40 },
    2: { score: 2, label: "Fair", color: "orange", percentage: 60 },
    3: { score: 3, label: "Good", color: "blue", percentage: 80 },
    4: { score: 4, label: "Strong", color: "green", percentage: 100 },
  };
  return map[score];
}

export function getPasswordRequirements(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };
}
