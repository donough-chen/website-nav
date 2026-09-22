import { storage, STORE_KEYS } from '@/adapters/storage';
import { makeVerifier, verifyPassword, encrypt, decrypt } from './crypto';
import { getDeviceId } from '@/utils/device';

const MP_VERIFIER_KEY = 'mp_verifier';

// 内存态：解锁后的密码（不持久化）
let currentPassword: string | null = null;

export const masterPassword = {
  /** 是否已设置主密码 */
  isSet(): boolean {
    return storage.get<string>(MP_VERIFIER_KEY) !== null;
  },

  /** 是否已解锁 */
  isUnlocked(): boolean {
    return currentPassword !== null;
  },

  /** 设置主密码 */
  async setup(password: string) {
    const v = await makeVerifier(password);
    storage.set(MP_VERIFIER_KEY, v);
    currentPassword = password;
  },

  /** 解锁 */
  async unlock(password: string): Promise<boolean> {
    const v = storage.get<string>(MP_VERIFIER_KEY);
    if (!v) return false;
    const ok = await verifyPassword(v, password);
    if (ok) currentPassword = password;
    return ok;
  },

  lock() {
    currentPassword = null;
  },

  /** 修改密码（需重新加密敏感数据） */
  async change(oldPw: string, newPw: string, reencryptCbs: Array<(from: string, to: string) => Promise<void>>): Promise<boolean> {
    const ok = await this.unlock(oldPw);
    if (!ok) return false;
    for (const cb of reencryptCbs) {
      await cb(oldPw, newPw);
    }
    const v = await makeVerifier(newPw);
    storage.set(MP_VERIFIER_KEY, v);
    currentPassword = newPw;
    return true;
  },

  /** 清除主密码（同时清除所有加密数据） */
  clear() {
    storage.remove(MP_VERIFIER_KEY);
    currentPassword = null;
  },

  /** 获取加密密钥（主密码 or 设备指纹兜底） */
  getKey(): string {
    return currentPassword ?? ('device:' + getDeviceId());
  },

  async encryptData(plain: string): Promise<string> {
    return encrypt(plain, this.getKey());
  },

  async decryptData(cipher: string): Promise<string> {
    return decrypt(cipher, this.getKey());
  },
};