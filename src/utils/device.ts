import { nanoid } from 'nanoid';
import { storage, STORE_KEYS } from '@/adapters/storage';

export function getDeviceId(): string {
  let id = storage.get<string>(STORE_KEYS.DEVICE_ID);
  if (!id) {
    id = nanoid();
    storage.set(STORE_KEYS.DEVICE_ID, id);
  }
  return id;
}

export function hapticFeedback(pattern: number | number[] = 10) {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}