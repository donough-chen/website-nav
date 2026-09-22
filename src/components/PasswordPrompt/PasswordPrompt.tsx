import { useState, useEffect } from 'preact/hooks';
import { Modal } from '../Modal/Modal';

interface Props {
  open: boolean;
  title: string;
  hint?: string;
  needConfirm?: boolean;
  onSubmit: (pw: string) => void;
  onCancel: () => void;
}

export function PasswordPrompt({ open, title, hint, needConfirm, onSubmit, onCancel }: Props) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { if (open) { setPw(''); setConfirm(''); setErr(''); } }, [open]);

  const submit = () => {
    if (!pw) { setErr('请输入密码'); return; }
    if (needConfirm) {
      if (pw.length < 6) { setErr('至少 6 位'); return; }
      if (pw !== confirm) { setErr('两次密码不一致'); return; }
    }
    onSubmit(pw);
  };

  return (
    <Modal open={open} title={title} onClose={onCancel} width={380}
      footer={
        <>
          <button class="btn btn-ghost" onClick={onCancel}>取消</button>
          <button class="btn btn-primary" onClick={submit}>确定</button>
        </>
      }>
      <div class="mp-form">
        {hint && <div class="mp-hint">{hint}</div>}
        <label>
          <span>密码</span>
          <input type="password" value={pw} autoFocus
            onInput={e => setPw((e.target as HTMLInputElement).value)}
            onKeyDown={e => e.key === 'Enter' && !needConfirm && submit()} />
        </label>
        {needConfirm && (
          <label>
            <span>确认密码</span>
            <input type="password" value={confirm}
              onInput={e => setConfirm((e.target as HTMLInputElement).value)}
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </label>
        )}
        {err && <div class="form-error">{err}</div>}
      </div>
    </Modal>
  );
}