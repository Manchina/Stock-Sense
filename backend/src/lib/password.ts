import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hashes a plain-text password using bcrypt with 10 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plain-text password against a hashed password.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
