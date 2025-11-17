'use client'
import { useAuth } from '@/hooks/useAuth';

interface ProfileButtonProps {
  onAuthModalOpen: () => void;
}

export default function ProfileButton({ onAuthModalOpen }: ProfileButtonProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400 truncate max-w-[150px]">
          {user.email}
        </span>
        <button
          onClick={onAuthModalOpen}
          className="text-sm text-purple-500 hover:text-purple-400 transition-colors"
        >
          Profile
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onAuthModalOpen}
      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm transition-colors"
    >
      Sign In / Sign Up
    </button>
  );
}
