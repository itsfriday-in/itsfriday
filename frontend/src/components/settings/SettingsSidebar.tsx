"use client";

import { Settings, User } from "lucide-react";

export type SettingsTab = "general" | "account";

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

const menuItems = [
  { id: "general" as SettingsTab, label: "General", icon: Settings },
  { id: "account" as SettingsTab, label: "Account", icon: User },
];

export default function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <nav className="settings-sidebar">
      <ul className="settings-sidebar-menu">
        {menuItems.map((item) => (
          <li key={item.id}>
            <button
              className={`settings-sidebar-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => onTabChange(item.id)}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
