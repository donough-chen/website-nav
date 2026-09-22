import { masterPassword } from './masterPassword';
import { sessionStore, storage, STORE_KEYS } from '@/adapters/storage';

const FAIL_LIMIT = 5;
const LOCK_DURATION_MS = 30_000;
const SESSION_KEY = 'auth_session';
const FAIL_KEY = 'auth_fail';

interface Session {
  unlockedAt: number;
  expireAt: number; // 0 = 不过期（页面生命周期内）
}

interface FailState {
  count: number;
  lockedUntil: number;
}

export interface UnlockResult {
  ok: boolean;
  lockRemaining?: number;
  failedAttempts?: number;
}

export const authService = {
  /** 是否已设置密码 */
  hasPassword(): boolean {
    return masterPassword.isSet();
  },

  /** 首次设置密码 */
  async setupPassword(password: string): Promise<void> {
    await masterPassword.setup(password);
  },

  /** 修改密码（需知晓原密码；同时重新加密云同步凭证） */
  async changePassword(
    oldPw: string, newPw: string,
    reencryptCbs: Array<(from: string, to: string) => Promise<void>> = []
  ): Promise<boolean> {
    return masterPassword.change(oldPw, newPw, reencryptCbs);
  },

  /** 尝试解锁 */
  async unlock(password: string): Promise<UnlockResult> {
    const fail = this.getFailState();
    const now = Date.now();
    if (fail.lockedUntil > now) {
      return { ok: false, lockRemaining: Math.ceil((fail.lockedUntil - now) / 1000), failedAttempts: fail.count };
    }

    const ok = await masterPassword.unlock(password);
    if (ok) {
      this.clearFailState();
      return { ok: true };
    }

    const nextCount = fail.count + 1;
    const nextLock = nextCount >= FAIL_LIMIT ? now + LOCK_DURATION_MS : 0;
    this.setFailState({ count: nextCount, lockedUntil: nextLock });
    return {
      ok: false,
      failedAttempts: nextCount,
      lockRemaining: nextLock > 0 ? Math.ceil(LOCK_DURATION_MS / 1000) : undefined,
    };
  },

  /** 主动锁定 */
  lock() {
    masterPassword.lock();
    sessionStore.remove(SESSION_KEY);
  },

  /** 保存会话（记住 N 分钟） */
  saveSession(rememberMin: number) {
    const now = Date.now();
    const session: Session = {
      unlockedAt: now,
      expireAt: rememberMin > 0 ? now + rememberMin * 60_000 : 0,
    };
    sessionStore.set(SESSION_KEY, session);
  },

  /** 恢复会话（页面加载时调用；若需要密码则返回 null） */
  getSession(): Session | null {
    const s = sessionStore.get<Session>(SESSION_KEY);
    if (!s) return null;
    if (s.expireAt > 0 && s.expireAt < Date.now()) {
      sessionStore.remove(SESSION_KEY);
      return null;
    }
    return s;
  },

  clearSession() {
    sessionStore.remove(SESSION_KEY);
  },

  /** 失败状态管理 */
  getFailState(): FailState {
    return sessionStore.get<FailState>(FAIL_KEY) ?? { count: 0, lockedUntil: 0 };
  },
  setFailState(state: FailState) {
    sessionStore.set(FAIL_KEY, state);
  },
  clearFailState() {
    sessionStore.remove(FAIL_KEY);
  },

  /** 紧急重置：清空所有数据 */
  emergencyReset() {
    // 清空全部 nav_ 开头的 localStorage
    for (const k of storage.keys()) {
      storage.remove(k);
    }
    sessionStorage.clear();
    location.reload();
  },
};