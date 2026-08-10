import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey() {
  const secret = process.env.AI_KEYS_ENCRYPTION_KEY?.trim();
  if (!secret) throw new Error('AI_KEYS_ENCRYPTION_KEY is not configured.');
  return createHash('sha256').update(secret, 'utf8').digest();
}

export function encryptAiKey(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedKey: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptAiKey(input: { encryptedKey: string; iv: string; authTag: string }) {
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(input.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(input.authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(input.encryptedKey, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
