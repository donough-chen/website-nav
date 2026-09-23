import type { Category } from '@/types';

export const BUILTIN_CATEGORY = {
  POPULAR: '__popular__',
  FAVORITES: '__favorites__',
} as const;

export const POPULAR_LIMIT = 30;

export const BUILTIN_CATEGORIES: Category[] = [
  {
    id: BUILTIN_CATEGORY.POPULAR,
    name: '常用',
    icon: '🔥',
    order: -2,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: BUILTIN_CATEGORY.FAVORITES,
    name: '收藏',
    icon: '❤️',
    order: -1,
    createdAt: 0,
    updatedAt: 0,
  },
];

export function isBuiltInCategory(id: string): boolean {
  return id === BUILTIN_CATEGORY.POPULAR || id === BUILTIN_CATEGORY.FAVORITES;
}