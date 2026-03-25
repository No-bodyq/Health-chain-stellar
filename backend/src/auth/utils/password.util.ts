import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const [salt, existingHash] = encodedHash.split(':');
  if (!salt || !existingHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const existingBuffer = Buffer.from(existingHash, 'hex');

  if (existingBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(existingBuffer, derivedKey);
}
