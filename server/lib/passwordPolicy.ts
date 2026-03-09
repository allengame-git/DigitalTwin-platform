export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
}

export function validatePassword(password: string, email: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('密碼長度至少 8 字元');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('密碼需包含至少一個大寫字母');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('密碼需包含至少一個小寫字母');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('密碼需包含至少一個數字');
    }
    if (password.toLowerCase() === email.toLowerCase()) {
        errors.push('密碼不能與 Email 相同');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Generate a random temporary password meeting policy requirements
 */
export function generateTempPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const all = upper + lower + digits;

    // Ensure at least one of each required type
    let password = '';
    password += upper[Math.floor(Math.random() * upper.length)];
    password += lower[Math.floor(Math.random() * lower.length)];
    password += digits[Math.floor(Math.random() * digits.length)];

    // Fill remaining 7 chars
    for (let i = 0; i < 7; i++) {
        password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle
    return password.split('').sort(() => Math.random() - 0.5).join('');
}
