import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../Modal/Modal';
import { authService } from '@/services/authService';
import { useApp } from '@/store/context';
import { toast } from '@/utils/toast';
import './PasswordSetupDialog.css';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'setup' | 'change';
}

export function PasswordSetupDialog({ open, onClose, mode }: Props) {
  const { dispatch } = useApp();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { if (open) { setOldPw(''); setNewPw(''); setConfirm(''); setErr(''); } }, [open]);

  const submit = async () => {
    setErr('');
    if (newPw.length < 6) { setErr('密码至少 6 位'); return; }
    if (newPw !== confirm) { setErr('两次密码不一致'); return; }

    if (mode === 'setup') {
      await authService.setupPassword(newPw);
      dispatch({ type: 'UPDATE_AUTH_CONFIG', payload: { hasPassword: true } });
      dispatch({ type: 'SET_AUTH_MODE', payload: { mode: 'admin' } });
      authService.saveSession(0);
      toast.success('✅ 密码已设置，当前为管理员模式');
    } else {
      const ok = await authService.changePassword(oldPw, newPw);
      if (!ok) { setErr('原密码错误'); return; }
      toast.success('✅ 密码已修改');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      title={mode === 'setup' ? '🔐 设置管理员密码' : '✏ 修改密码'}
      onClose={onClose}
      width={420}
      footer={
        <>
          <button class="btn btn-ghost" onClick={onClose}>取消</button>
          <button class="btn btn-primary" onClick={submit}>确定</button>
        </>
      }>
      <div class="setup-form">
        {mode === 'setup' && (
          <div class="setup-hint">
            <div class="hint-title">💡 关于密码</div>
            <ul>
              <li>用于<b>解锁编辑权限</b>，访客只能浏览</li>
              <li>同时用于<b>加密云同步凭证</b></li>
              <li>密码<b>不可找回</b>，请妥善保管</li>
              <li>之后可通过连续点击 Logo 唤起解锁</li>
            </ul>
          </div>
        )}

        {mode === 'change' && (
          <label>
            <span>原密码</span>
            <input type="password" value={oldPw} autoFocus
              onInput={e => setOldPw((e.target as HTMLInputElement).value)} />
          </label>
        )}
        <label>
          <span>{mode === 'setup' ? '新密码' : '新密码'}</span>
          <input type="password" value={newPw}
            autoFocus={mode === 'setup'}
            onInput={e => setNewPw((e.target as HTMLInputElement).value)} />
        </label>
        <label>
          <span>确认密码</span>
          <input type="password" value={confirm}
            onInput={e => setConfirm((e.target as HTMLInputElement).value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </label>
        {err && <div class="form-error">{err}</div>}
      </div>
    </Modal>
  );
}