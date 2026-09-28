import { Modal } from '../Modal/Modal';
import './ModeSelectDialog.css';

interface Props {
  open: boolean;
  onSelect: (mode: 'guest' | 'open') => void;
}

export function ModeSelectDialog({ open, onSelect }: Props) {
  return (
    <Modal open={open} title="欢迎使用" onClose={() => {}} width={520} closable={false}>
      <div class="mode-select">
        <div class="mode-intro">请选择使用方式</div>

        <button class="mode-card" onClick={() => onSelect('guest')}>
          <div class="mc-icon">👁</div>
          <div class="mc-body">
            <div class="mc-title">访客模式</div>
            <div class="mc-desc">浏览公开分享的导航数据，只读</div>
            <ul class="mc-features">
              <li>✅ 浏览与搜索</li>
              <li>✅ 收藏喜欢的网址（本地）</li>
              <li>❌ 无编辑权限</li>
            </ul>
          </div>
        </button>

        <button class="mode-card" onClick={() => onSelect('open')}>
          <div class="mc-icon">🔓</div>
          <div class="mc-body">
            <div class="mc-title">开放模式</div>
            <div class="mc-desc">在本地建立自己的导航站</div>
            <ul class="mc-features">
              <li>✅ 添加/编辑/删除网址与分类</li>
              <li>✅ 导入导出、深链接分享</li>
              <li>✅ 数据完全存储在本地</li>
            </ul>
          </div>
        </button>

        <div class="mode-hint">💡 选择后可在设置中随时切换</div>
      </div>
    </Modal>
  );
}