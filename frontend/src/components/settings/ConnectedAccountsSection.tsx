"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, RefreshCw, MoreHorizontal, ExternalLink, Unlink, RotateCw } from "lucide-react";
import {
  ConnectedAccount,
  ProviderType,
  SUPPORTED_PROVIDERS,
  getProviderFromConnection,
} from "@/types/settings";
import SettingsCard from "./SettingsCard";
import ProviderIcon from "./ProviderIcon";
import ConfirmDialog from "./ConfirmDialog";

interface ConnectedAccountsSectionProps {
  identities: ConnectedAccount[];
  onRefresh?: () => void;
}

// Provider management URLs
const PROVIDER_MANAGE_URLS: Record<string, string> = {
  google: "https://myaccount.google.com/connections",
  apple: "https://appleid.apple.com/account/manage",
};

export default function ConnectedAccountsSection({
  identities,
  onRefresh,
}: ConnectedAccountsSectionProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState<ConnectedAccount | null>(null);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const connectedProviders = new Set(
    identities.map((i) => getProviderFromConnection(i.connection))
  );
  const availableProviders = SUPPORTED_PROVIDERS.filter(
    (p) => !connectedProviders.has(p.type)
  );

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getProviderDisplayName = (provider: ProviderType): string => {
    const config = SUPPORTED_PROVIDERS.find((p) => p.type === provider);
    return config?.name || provider;
  };

  const getManageUrl = (provider: ProviderType): string | null => {
    return PROVIDER_MANAGE_URLS[provider] || null;
  };

  // Redirect to Auth0 login with specific connection to trigger linking
  const handleLinkAccount = (connection: string) => {
    window.location.href = `/auth/login?connection=${connection}&returnTo=/settings`;
  };

  // Reauthenticate with a specific provider
  const handleReauthenticate = (connection: string) => {
    setOpenMenu(null);
    window.location.href = `/auth/login?connection=${connection}&returnTo=/settings&prompt=login`;
  };

  // Open provider's account management page
  const handleManageProvider = (provider: ProviderType) => {
    setOpenMenu(null);
    const url = getManageUrl(provider);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Disconnect/unlink an account
  const handleUnlink = async (account: ConnectedAccount) => {
    setConfirmUnlink(null);
    setUnlinkingId(account.id);
    setUnlinkError(null);

    try {
      const response = await fetch("/api/account/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: account.connection,
          userId: account.userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setUnlinkError(data.error || "Failed to disconnect account");
      } else {
        if (onRefresh) onRefresh();
      }
    } catch {
      setUnlinkError("Failed to disconnect account");
    } finally {
      setUnlinkingId(null);
    }
  };

  const canUnlink = identities.length > 1;

  return (
    <SettingsCard
      title="Login Connections"
      description="Manage your linked sign-in methods"
    >
      {unlinkError && (
        <div className="settings-alert settings-alert-error">
          {unlinkError}
          <button className="settings-alert-close" onClick={() => setUnlinkError(null)}>×</button>
        </div>
      )}

      <div className="connected-accounts-list" ref={menuRef}>
        {identities.map((account) => {
          const manageUrl = getManageUrl(account.provider);
          const isUnlinking = unlinkingId === account.id;

          return (
            <div key={account.id} className="connected-account-item">
              <div className="connected-account-left">
                <div className="connected-account-icon">
                  <ProviderIcon provider={account.provider} size={20} />
                </div>
                <div className="connected-account-info">
                  <div className="connected-account-provider">
                    {getProviderDisplayName(account.provider)}
                  </div>
                  <div className="connected-account-email">{account.email}</div>
                </div>
              </div>

              <div className="connected-account-actions">
                {isUnlinking ? (
                  <div className="connected-account-loading">
                    <RefreshCw size={16} className="animate-spin" />
                  </div>
                ) : (
                  <div className="connected-account-menu-wrapper">
                    <button
                      className="connected-account-menu-btn"
                      onClick={() => setOpenMenu(openMenu === account.id ? null : account.id)}
                      aria-label="Account options"
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {openMenu === account.id && (
                      <div className="connected-account-dropdown">
                        {manageUrl && (
                          <button
                            className="dropdown-item"
                            onClick={() => handleManageProvider(account.provider)}
                          >
                            <ExternalLink size={14} />
                            <span>Manage in {getProviderDisplayName(account.provider)}</span>
                          </button>
                        )}

                        <button
                          className="dropdown-item"
                          onClick={() => handleReauthenticate(account.connection)}
                        >
                          <RotateCw size={14} />
                          <span>Reauthenticate</span>
                        </button>

                        {!account.isPrimary && canUnlink && (
                          <>
                            <div className="dropdown-divider" />
                            <button
                              className="dropdown-item dropdown-item-danger"
                              onClick={() => {
                                setOpenMenu(null);
                                setConfirmUnlink(account);
                              }}
                            >
                              <Unlink size={14} />
                              <span>Disconnect</span>
                            </button>
                          </>
                        )}

                        {account.isPrimary && (
                          <div className="dropdown-hint">
                            Primary account cannot be disconnected
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm unlink dialog */}
      <ConfirmDialog
        isOpen={confirmUnlink !== null}
        onClose={() => setConfirmUnlink(null)}
        onConfirm={() => confirmUnlink && handleUnlink(confirmUnlink)}
        title="Disconnect Account"
        description={confirmUnlink ? `Are you sure you want to disconnect ${getProviderDisplayName(confirmUnlink.provider)}? You can always reconnect it later.` : ""}
        confirmText="Disconnect"
        variant="danger"
      />

      {availableProviders.length > 0 && (
        <div className="link-account-section">
          <p className="link-account-title">Link another account</p>
          <div className="link-account-grid">
            {availableProviders.map((provider) => (
              <button
                key={provider.type}
                className="link-account-btn"
                onClick={() => handleLinkAccount(provider.connection)}
              >
                <ProviderIcon provider={provider.type} size={18} />
                <span>{provider.name}</span>
                <Plus size={14} className="link-account-plus" />
              </button>
            ))}
          </div>
        </div>
      )}
    </SettingsCard>
  );
}
