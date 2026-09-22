import { useApp } from '@/store/context';
import { useAuth } from '@/hooks/useAuth';
import './WelcomeBanner.css';

interface Props {
  onSetupPassword: () => void;
}

export function WelcomeBanner({ onSetupPassword }: Props) {
  const { dispatch } = useApp();
  const { needsWelcome } = useAuth();

  if (!needsWelcome) return null;

  const dismiss = () => dispatch({ type: 'DISMISS_WELCOME' });

  return (
    <div class="welcome-banner">
      <div class="wb-content">
        <div class="wb-icon">👋</div>
        <div class="wb-body">
          <div class="wb-title">欢迎使用 Nav 导航</div>
          <div class="wb-desc">
            当前为<b>开放模式</b>，任何人都可以编辑数据。若要发布给他人访问，建议设置密码启用只读保护。
          </div>
        </div>
        <div class="wb-actions">
          <button class="btn btn-primary" onClick={onSetupPassword}>🔐 设置密码</button>
          <button class="btn btn-ghost" onClick={dismiss}>跳过</button>
        </div>
      </div>
    </div>
  );
}