import { useEffect, useState } from 'preact/hooks';
import { toast, type ToastItem } from '@/utils/toast';
import './Toast.css';

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => toast.subscribe(setItems), []);

  return (
    <div class="toast-container">
      {items.map(t => (
        <div key={t.id} class={`toast toast-${t.type}`}>{t.message}</div>
      ))}
    </div>
  );
}