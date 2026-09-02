import React from 'react';
import { AuthModal } from './AuthModal';
import { UserProfile } from '../types';

interface BottomAuthSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  defaultEmail?: string;
  allowDismiss?: boolean;
}

export const BottomAuthSheet: React.FC<BottomAuthSheetProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  allowDismiss = false,
}) => {
  return (
    <AuthModal
      isOpen={isOpen}
      onClose={onClose}
      onAuthSuccess={onLoginSuccess}
      allowDismiss={allowDismiss}
      initialMode="signup"
    />
  );
};
