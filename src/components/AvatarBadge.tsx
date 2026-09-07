import React from 'react';
import { getAvatarById } from '../lib/avatars';
import { CartoonAvatar } from './CartoonAvatars';

interface AvatarBadgeProps {
  avatarId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  status?: 'online' | 'in-game' | 'away';
  className?: string;
  color?: string;
}

export const AvatarBadge: React.FC<AvatarBadgeProps> = ({
  avatarId,
  size = 'md',
  showStatus = false,
  status = 'online',
  className = '',
}) => {
  const avatar = getAvatarById(avatarId);

  function getPixelSize() {
    switch (size) {
      case 'sm':
        return 32;
      case 'md':
        return 44;
      case 'lg':
        return 64;
      case 'xl':
        return 96;
    }
  }

  function getDimensions() {
    switch (size) {
      case 'sm':
        return 'w-8 h-8 rounded-full border border-amber-500/60';
      case 'md':
        return 'w-11 h-11 rounded-xl border-2 border-amber-500/70';
      case 'lg':
        return 'w-16 h-16 rounded-2xl border-2 border-amber-500/80';
      case 'xl':
        return 'w-24 h-24 rounded-3xl border-2 border-amber-500';
    }
  }

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      <div
        className={`bg-slate-950 flex items-center justify-center shadow-lg overflow-hidden ${getDimensions()}`}
      >
        <CartoonAvatar avatarId={avatar.id} size={getPixelSize()} />
      </div>

      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-slate-900 ${
            size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4'
          } ${
            status === 'online'
              ? 'bg-emerald-500'
              : status === 'in-game'
              ? 'bg-amber-500'
              : 'bg-slate-500'
          }`}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
};
