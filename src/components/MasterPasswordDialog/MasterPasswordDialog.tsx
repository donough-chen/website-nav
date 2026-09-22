import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../Modal/Modal';
import { masterPassword } from '@/services/masterPassword';
import { toast } from '@/utils/toast';
import './MasterPasswordDialog.css';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'setup' | 'unlock' | 'change';
}

export function MasterPasswordDialog({ open, onClose, mode }: Props) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setOldPw(''); setNewPw(''); setConfirmPw(''); setErr(''); }
  }, [open]);

  const title = mode === 'setup' ? '设置主密码' : mode === 'unlock' ? '解锁主密码' : '修改主密码';

  const submit = async () => {
    setErr('');
    if (mode === 'unlock') {
      if (!newPw) { setErr('请输入密码'); return; }
      const ok = await masterPassword.unlock(newPw);
      if (!ok) { setErr('密码错误'); return; }
      toast.success('已解锁'); onClose();
      return;
    }
    if (newPw.length < 6) { setErr('密码至少 6 位'); return; }
    if (newPw !== confirmPw) { setErr('两次密码不一致'); return; }
    if (mode === 'setup') {
      await masterPassword.setup(newPw);
      toast.success('主密码已设置');
    } else {
      const ok = await masterPassword.change(oldPw, newPw, []);
      if (!ok) { setErr('原密码错误'); return; }
      toast.success('密码已修改');
    }
    onClose();
  };

  return (
    <Modal open={open} title={title} onClose={onClose} width={400}
      footer={
        <>
          <button class="btn btn-ghost" onClick={onClose}>取消</button>
          <button class="btn btn-primary" onClick={submit}>确定</button>
        </>
      }>
      <div class="mp-form">
        {mode !== 'setup' && mode === 'change' && (
          <label>
            <span>原密码</span>
            <input type="password" value={oldPw} onInput={e => setOldPw((e.target as HTMLInputElement).value)} />
          </label>
        )}
        <label>
          <span>{mode === 'unlock' ? '主密码' : '新密码'}</span>
          <input type="password" value={newPw} autoFocus
            onInput={e => setNewPw((e.target as HTMLInputElement).value)}
            onKeyDown={e => e.key === 'Enter' && mode === 'unlock' && submit()} />
        </label>
        {mode !== 'unlock' && (
          <label>
            <span>确认密码</span>
            <input type="password" value={confirmPw} onInput={e => setConfirmPw((e.target as HTMLInputElement).value)}
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </label>
        )}
        {err && <div class="form-error">{err}</div>}
        {mode === 'setup' && (
          <div class="mp-hint">
            ⚠ 主密码用于加密云同步凭证，<b>丢失后无法找回</b>，请妥善保管。
          </div>
        )}
      </div>
    </Modal>
  );
}