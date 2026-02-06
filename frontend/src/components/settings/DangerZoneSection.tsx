"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import SettingsCard from "./SettingsCard";
import ConfirmDialog from "./ConfirmDialog";

interface DangerZoneSectionProps {
  onDeleteAccount: () => Promise<void>;
}

export default function DangerZoneSection({ onDeleteAccount }: DangerZoneSectionProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteAccount();
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <SettingsCard
        title="Danger Zone"
        description="Irreversible actions for your account"
        variant="danger"
      >
        <div className="danger-zone-content">
          <div className="danger-zone-item">
            <div className="danger-zone-info">
              <p className="danger-zone-label">Delete Account</p>
              <p className="danger-zone-description">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <button
              className="settings-btn settings-btn-danger"
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 size={14} />
              Delete Account
            </button>
          </div>
        </div>
      </SettingsCard>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Account"
        description="This will permanently delete your account, all your data, and remove access to all connected services. This action cannot be undone."
        confirmText="Delete My Account"
        confirmWord="DELETE"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
