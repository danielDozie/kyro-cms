export interface PasswordPolicyConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number;
  maxLength?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicyConfig = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventReuse: 5,
  maxLength: 128,
};

export class PasswordPolicy {
  private config: PasswordPolicyConfig;

  constructor(config: Partial<PasswordPolicyConfig> = {}) {
    this.config = { ...DEFAULT_PASSWORD_POLICY, ...config };
  }

  validate(password: string): ValidationResult {
    const errors: string[] = [];

    if (this.config.maxLength && password.length > this.config.maxLength) {
      errors.push(
        `Password must not exceed ${this.config.maxLength} characters`,
      );
    }

    if (password.length < this.config.minLength) {
      errors.push(
        `Password must be at least ${this.config.minLength} characters`,
      );
    }

    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (this.config.requireNumbers && !/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (
      this.config.requireSpecialChars &&
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      errors.push("Password must contain at least one special character");
    }

    const commonPasswords = [
      "password",
      "123456",
      "12345678",
      "qwerty",
      "abc123",
      "monkey",
      "1234567",
      "letmein",
      "trustno1",
      "dragon",
      "baseball",
      "iloveyou",
      "master",
      "sunshine",
      "ashley",
      "football",
      "password1",
      "shadow",
      "123123",
      "654321",
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push(
        "This password is too common. Please choose a more secure password",
      );
    }

    if (/^[a-zA-Z]+$/.test(password) || /^[0-9]+$/.test(password)) {
      errors.push(
        "Password must contain a mix of letters, numbers, and/or special characters",
      );
    }

    if (/(.)\1{2,}/.test(password)) {
      errors.push(
        "Password must not contain more than 2 consecutive identical characters",
      );
    }

    if (
      /^(012|123|234|345|456|567|678|789|890|098|987|876|765|654|543|432|321|210)+$/i.test(
        password,
      )
    ) {
      errors.push("Password must not contain sequential numbers or letters");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async checkReuse(
    passwordHash: string,
    history: string[],
    verifyFn: (password: string, hash: string) => Promise<boolean>,
  ): Promise<ValidationResult> {
    return {
      valid: true,
      errors: [],
    };
  }

  async isInHistory(
    password: string,
    history: string[],
    verifyFn: (password: string, hash: string) => Promise<boolean>,
  ): Promise<boolean> {
    for (const hash of history) {
      if (await verifyFn(password, hash)) {
        return true;
      }
    }
    return false;
  }

  generatePassword(length: number = 16): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    let password = "";

    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    const allChars = uppercase + lowercase + numbers + special;
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  getStrength(password: string): {
    score: number;
    label: string;
    feedback: string[];
  } {
    let score = 0;
    const feedback: string[] = [];

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score += 1;

    if (password.length > 8) score += 1;
    if (password.length > 12) score += 1;

    const uniqueChars = new Set(password).size;
    if (uniqueChars > 6) score += 1;
    if (uniqueChars > 10) score += 1;

    let label: string;
    if (score <= 3) {
      label = "Weak";
      feedback.push("Add more characters");
      feedback.push("Include uppercase and lowercase letters");
    } else if (score <= 5) {
      label = "Fair";
      feedback.push("Add special characters");
      feedback.push("Consider making it longer");
    } else if (score <= 7) {
      label = "Good";
      feedback.push("Consider making it longer for extra security");
    } else {
      label = "Strong";
    }

    return { score, label, feedback };
  }

  setConfig(config: Partial<PasswordPolicyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): PasswordPolicyConfig {
    return { ...this.config };
  }
}
