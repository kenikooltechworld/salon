/**
 * Authentication validation utilities
 */
export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very Weak" | "Weak" | "Fair" | "Good" | "Strong";
  color: "red" | "orange" | "yellow" | "blue" | "green";
  percentage: number;
}

export const PASSWORD_RULES = {
  minLength: 8,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[^A-Za-z0-9]/,
};

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return /^\+?[0-9]{7,20}$/.test(cleaned);
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "").trim();
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (!password) return { score: 0, label: "Very Weak", color: "red", percentage: 0 };
  const req = getPasswordRequirements(password);
  if (req.length) score++;
  if (req.uppercase && req.lowercase) score++;
  if (req.number) score++;
  if (req.special) score++;
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
    length: password.length >= PASSWORD_RULES.minLength,
    uppercase: PASSWORD_RULES.uppercase.test(password),
    lowercase: PASSWORD_RULES.lowercase.test(password),
    number: PASSWORD_RULES.number.test(password),
    special: PASSWORD_RULES.special.test(password),
  };
}

export function validatePassword(password: string): string | null {
  const req = getPasswordRequirements(password);
  if (!req.length) return "Password must be at least 8 characters";
  if (!req.uppercase) return "Password must contain an uppercase letter";
  if (!req.lowercase) return "Password must contain a lowercase letter";
  if (!req.number) return "Password must contain a number";
  if (!req.special) return "Password must contain a special character";
  return null;
}

export function getApiErrorMessage(err: any, fallback = "Something went wrong. Please try again."): string {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: any) => {
        const loc = Array.isArray(d.loc) ? d.loc.filter((x: string) => x !== "body") : [];
        const field = loc.length ? `${loc[loc.length - 1].toString().replace(/_/g, " ")}: ` : "";
        return `${field}${d.msg || "Invalid value"}`;
      })
      .join(", ");
  }
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && typeof detail.message === "string") return detail.message;
  if (typeof err?.message === "string" && err.message) return err.message;
  return fallback;
}
