"use client";

import { ConnectedAccount, UserProfile } from "@/types/settings";
import ProfileSection from "./ProfileSection";
import ConnectedAccountsSection from "./ConnectedAccountsSection";
import DangerZoneSection from "./DangerZoneSection";

interface AccountSectionProps {
  profile: UserProfile | null;
  identities: ConnectedAccount[];
  onUpdateName: (name: string) => Promise<void>;
  onUpdatePicture: (pictureData: string) => Promise<void>;
  onRemovePicture: () => Promise<void>;
  onRefreshIdentities: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

export default function AccountSection({
  profile,
  identities,
  onUpdateName,
  onUpdatePicture,
  onRemovePicture,
  onRefreshIdentities,
  onDeleteAccount,
}: AccountSectionProps) {
  return (
    <div className="settings-section-content">
      <ProfileSection
        profile={profile}
        onUpdateName={onUpdateName}
        onUpdatePicture={onUpdatePicture}
        onRemovePicture={onRemovePicture}
      />

      <ConnectedAccountsSection
        identities={identities}
        onRefresh={onRefreshIdentities}
      />

      <DangerZoneSection onDeleteAccount={onDeleteAccount} />
    </div>
  );
}
