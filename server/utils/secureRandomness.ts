import * as crypto from 'crypto';

export function secureRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const values = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += charset[values[i] % charset.length];
  }
  
  return result;
}

export function generateSecureSeed(length: number): string {
  return crypto.randomBytes(length).toString('hex');
}

export function createServerSeedHash(serverSeed: string): string {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}