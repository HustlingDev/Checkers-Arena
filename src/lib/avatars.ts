import { AvatarOption } from '../types';

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'avatar-braids',
    name: 'Braided Champion',
    bgGradient: 'from-amber-600/30 to-amber-950/80',
    accentColor: '#f59e0b',
    iconSvg: 'braids',
  },
  {
    id: 'avatar-headwrap',
    name: 'Emerald Queen',
    bgGradient: 'from-emerald-600/30 to-green-950/80',
    accentColor: '#10b981',
    iconSvg: 'headwrap',
  },
  {
    id: 'avatar-bald-beard',
    name: 'Bald Warrior',
    bgGradient: 'from-amber-700/30 to-zinc-950/80',
    accentColor: '#d97706',
    iconSvg: 'bald-beard',
  },
  {
    id: 'avatar-cool-shades',
    name: 'Cool Shades',
    bgGradient: 'from-green-600/30 to-slate-950/80',
    accentColor: '#22c55e',
    iconSvg: 'cool-shades',
  },
  {
    id: 'avatar-purple-hair',
    name: 'Violet Chic',
    bgGradient: 'from-purple-600/30 to-slate-950/80',
    accentColor: '#a855f7',
    iconSvg: 'purple-hair',
  },
  {
    id: 'avatar-buzzcut',
    name: 'Sharp Buzzcut',
    bgGradient: 'from-amber-600/30 to-stone-950/80',
    accentColor: '#f59e0b',
    iconSvg: 'buzzcut',
  },
];

export function getAvatarById(id: string): AvatarOption {
  // Legacy mappings for backwards compatibility
  let normalizedId = id;
  if (id === 'avatar-crown') normalizedId = 'avatar-braids';
  else if (id === 'avatar-knight') normalizedId = 'avatar-headwrap';
  else if (id === 'avatar-ruby') normalizedId = 'avatar-bald-beard';
  else if (id === 'avatar-sapphire') normalizedId = 'avatar-cool-shades';
  else if (id === 'avatar-cyber') normalizedId = 'avatar-purple-hair';

  return AVATAR_OPTIONS.find((a) => a.id === normalizedId) || AVATAR_OPTIONS[0];
}

