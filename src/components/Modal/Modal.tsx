import { useEffect } from 'preact/hooks';
import { memo } from 'preact/compat';
import type { ComponentChildren } from 'preact';
import './Modal.css';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  footer?: ComponentChildren;
  width?: number | string;
}

function ModalBase({ open, title, onClose, children, footer, width = 480 }: Props) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div class="modal-mask" onClick={onClose}>
      <div class="modal" style={{ maxWidth: typeof width === 'number' ? `${width}px` : width }} onClick={e => e.stopPropagation()}>
        <div class="modal-header">
          <h3>{title}</h3>
          <button class="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div class="modal-body">{children}</div>
        {footer && <div class="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export const Modal = memo(ModalBase);