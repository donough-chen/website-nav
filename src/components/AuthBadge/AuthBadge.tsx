import { useEffect, useState } from 'preact/hooks';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { useApp } from '@/store/context';
import { toast } from '@/utils/toast';
import './AuthBadge.css';

export function AuthBadge() {
  const { isAdmin, sessionExpireAt } = useAuth();
  const { dispatch } = useApp();
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!isAdmin || !sessionExpireAt) { setRemaining(''); return; }
    const update = () => {
      const diff = sessionExpireAt - Date.now();
      if (diff <= 0) { setRemaining('即将锁定'); return; }
      const min = Math.floor(diff / 60_000);
      const sec = Math.floor((diff % 60_000) / 1000);
      setRemaining(min > 0 ? `${min}分` : `${sec}秒`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [isAdmin, sessionExpireAt]);

  const handleLock = () => {
    authService.lock();
    dispatch({ type: 'SET_AUTH_MODE', payload: { mode: 'guest' } });
    toast.info('🔒 已锁定');
  };

  if (!isAdmin) return null;

  return (
    <div class="auth-badge">
      <span class="badge-icon">👑</span>
      <span class="badge-label">管理员</span>
      {remaining && <span class="badge-remaining">· {remaining}</span>}
      <button class="badge-lock" onClick={handleLock} title="立即锁定">🔒</button>
    </div>
  );
}