const SALT = new TextEncoder().encode('nav-hub-salt-v1');
const ITERATIONS = 100_000;

async function deriveKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt']
  );
}

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

function b64ToBuf(b64: string): Uint8Array {
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

export async function encrypt(plain: string, password: string): Promise<string> {
  const key = await deriveKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key,
    new TextEncoder().encode(plain),
  );
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return bufToB64(combined.buffer);
}

export async function decrypt(cipherB64: string, password: string): Promise<string> {
  const key = await deriveKey(password);
  const combined = b64ToBuf(cipherB64);
  const iv = combined.slice(0, 12);
  const cipher = combined.slice(12);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

// 主密码校验：加密固定串，读取时尝试解密验证
const VERIFY_TOKEN = 'nav-hub-verify-v1';

export async function makeVerifier(password: string): Promise<string> {
  return encrypt(VERIFY_TOKEN, password);
}

export async function verifyPassword(verifier: string, password: string): Promise<boolean> {
  try {
    const plain = await decrypt(verifier, password);
    return plain === VERIFY_TOKEN;
  } catch {
    return false;
  }
}