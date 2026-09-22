import { useMemo, useState, useEffect } from 'preact/hooks';
import type { Site } from '@/types';
import { Modal } from '../Modal/Modal';
import { generateShareLink, copyToClipboard } from '@/services/share';
import { toast } from '@/utils/toast';
import './ShareDialog.css';

interface Props {
  open: boolean;
  site: Site | null;
  onClose: () => void;
}

export function ShareDialog({ open, site, onClose }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const link = useMemo(() => site ? generateShareLink(site) : '', [site]);

  useEffect(() => {
    if (!open || !link) return;
    // 使用公共 API 生成二维码（也可用离线库）
    setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`);
  }, [open, link]);

  const copy = async () => {
    const ok = await copyToClipboard(link);
    ok ? toast.success('链接已复制') : toast.error('复制失败');
  };

  const nativeShare = async () => {
    if (!site) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: site.name, text: site.description, url: link });
      } catch { /* 用户取消 */ }
    } else {
      copy();
    }
  };

  if (!site) return null;

  return (
    <Modal open={open} title="分享网址" onClose={onClose} width={420}>
      <div class="share-dialog">
        <div class="share-preview">
          <div class="share-name">{site.name}</div>
          <div class="share-url">{site.url}</div>
        </div>

        {qrDataUrl && (
          <div class="share-qr">
            <img src={qrDataUrl} alt="二维码" />
            <div class="qr-hint">扫码打开并导入</div>
          </div>
        )}

        <div class="share-link-box">
          <input type="text" readonly value={link} onFocus={e => (e.target as HTMLInputElement).select()} />
        </div>

        <div class="share-actions">
          <button class="btn btn-primary" onClick={copy}>📋 复制链接</button>
          {typeof navigator.share === 'function' && (
            <button class="btn btn-ghost" onClick={nativeShare}>📤 系统分享</button>
          )}
        </div>

        <div class="share-hint">
          💡 对方打开链接后会自动弹出确认导入
        </div>
      </div>
    </Modal>
  );
}