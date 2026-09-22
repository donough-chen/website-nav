import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../Modal/Modal';
import { useApp } from '@/store/context';
import { authService } from '@/services/authService';
import { toast } from '@/utils/toast';
import './UnlockDialog.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REMEMBER_OPTIONS = [
  { value: 0, label: '不记住（关闭标签页失效）' },
  { value: 15, label: '15 分钟' },
  { value: 30, label: '30 分钟' },
  { value: 60, label: '1 小时' },
  { value: 240, label: '4 小时' },
];

export function UnlockDialog({ open, onClose, onSuccess }: Props) {
  const { state, dispatch } = useApp();
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(state.authConfig.rememberDuration);
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [lockRemaining, setLockRemaining] = useState(0);
  const [showReset, setShowReset] = useState(false);
  const [resetInput, setResetInput] = useState('');

  useEffect(() => {
    if (!open) return;
    setPassword(''); setErr(''); setShowReset(false); setResetInput('');
    const fail = authService.getFailState();
    if (fail.lockedUntil > Date.now()) {
      setLockRemaining(Math.ceil((fail.lockedUntil - Date.now()) / 1000));
    }
  }, [open]);

  // 锁定倒计时
  useEffect(() => {
    if (lockRemaining <= 0) return;
    const id = setInterval(() => {
      setLockRemaining(r => {
        if (r <= 1) { clearInterval(id); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lockRemaining]);

  const submit = async () => {
    if (lockRemaining > 0) return;
    if (!password) { setErr('请输入密码'); return; }

    const result = await authService.unlock(password);
    if (result.ok) {
      dispatch({ type: 'SET_AUTH_MODE', payload: { mode: 'admin', sessionExpireAt: remember > 0 ? Date.now() + remember * 60_000 : null } });
      dispatch({ type: 'UPDATE_AUTH_CONFIG', payload: { rememberDuration: remember } });
      if (remember > 0) authService.saveSession(remember);
      else authService.saveSession(0); // 页面生命周期
      dispatch({ type: 'SET_AUTH_FAIL', payload: { failedAttempts: 0, lockedUntil: 0 } });
      toast.success('🔓 已解锁管理员模式');
      onSuccess();
      onClose();
    } else {
      if (result.lockRemaining) {
        setLockRemaining(result.lockRemaining);
        setErr(`失败次数过多，请 ${result.lockRemaining} 秒后重试`);
      } else {
        setErr(`密码错误（${result.failedAttempts}/5）`);
      }
      setPassword('');
    }
  };

  const handleReset = () => {
    if (resetInput !== 'delete-all-my-data') {
      setErr('校验字符不匹配');
      return;
    }
    authService.emergencyReset();
  };

  return (
    <Modal open={open} title="🔐 解锁管理员" onClose={onClose} width={420}
      footer={
        <>
          <button class="btn btn-ghost" onClick={onClose}>取消</button>
          <button class="btn btn-primary" onClick={submit} disabled={lockRemaining > 0}>
            {lockRemaining > 0 ? `锁定中 ${lockRemaining}s` : '解锁'}
          </button>
        </>
      }>
      <div class="unlock-form">
        <div class="unlock-hint">输入管理员密码以启用编辑功能</div>

        <label class="pw-field">
          <span>密码</span>
          <div class="pw-input-wrap">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              autoFocus
              disabled={lockRemaining > 0}
              onInput={e => setPassword((e.target as HTMLInputElement).value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
            <button type="button" class="pw-toggle" onClick={() => setShowPw(!showPw)}>
              {showPw ? '🙈' : '👁'}
            </button>
          </div>
        </label>

        <label class="pw-field">
          <span>记住会话</span>
          <select value={remember} onChange={e => setRemember(Number((e.target as HTMLSelectElement).value))}>
            {REMEMBER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        {err && <div class="form-error">{err}</div>}

        {!showReset ? (
          <button class="forgot-link" onClick={() => setShowReset(true)}>忘记密码？</button>
        ) : (
          <div class="reset-box">
            <div class="reset-warn">⚠ 密码无法找回。可清除本地所有数据后重新开始。</div>
            <input type="text" placeholder="输入 delete-all-my-data 确认"
              value={resetInput} onInput={e => setResetInput((e.target as HTMLInputElement).value)} />
            <div class="reset-actions">
              <button class="btn btn-ghost" onClick={() => setShowReset(false)}>返回</button>
              <button class="btn btn-danger" onClick={handleReset} disabled={resetInput !== 'delete-all-my-data'}>
                清除全部数据
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}