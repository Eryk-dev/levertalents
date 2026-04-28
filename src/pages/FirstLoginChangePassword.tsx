import { FirstLoginChangePasswordCard } from '@/components/FirstLoginChangePasswordCard';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function FirstLoginChangePasswordPage() {
  const { data: profile, isLoading } = useUserProfile();

  if (isLoading) return null; // ProtectedRoute already shows loading

  const expiresAt = profile?.temp_password_expires_at
    ? new Date(profile.temp_password_expires_at)
    : null;
  const expired = expiresAt != null && expiresAt < new Date(); // D-24

  return <FirstLoginChangePasswordCard tempPasswordExpired={expired} />;
}
