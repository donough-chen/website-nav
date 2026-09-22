type ToastType = 'info' | 'success' | 'error' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let listeners: Array<(items: ToastItem[]) => void> = [];
let items: ToastItem[] = [];
let seq = 0;

function emit() {
  listeners.forEach(l => l([...items]));
}

export const toast = {
  show(message: string, type: ToastType = 'info', duration = 2500) {
    const item: ToastItem = { id: ++seq, message, type };
    items.push(item);
    emit();
    setTimeout(() => {
      items = items.filter(x => x.id !== item.id);
      emit();
    }, duration);
  },
  info(m: string) { this.show(m, 'info'); },
  success(m: string) { this.show(m, 'success'); },
  error(m: string) { this.show(m, 'error', 3500); },
  warning(m: string) { this.show(m, 'warning'); },
  subscribe(l: (items: ToastItem[]) => void) {
    listeners.push(l);
    l([...items]);
    return () => { listeners = listeners.filter(x => x !== l); };
  },
};

export type { ToastItem };