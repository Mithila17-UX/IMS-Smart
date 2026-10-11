import React, { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { settingsRepository } from "@/data/repositories/settingsRepository";
import { SETTINGS_TAB_REGISTRY, type SettingsTabId } from "@/registry/settingsTabs";
import type { SettingVersion } from "@/domain/settings";
import { VersionedFieldEditor } from "./VersionedFieldEditor";
import { LoadingSpinner } from "@/ui/components/LoadingSpinner";
import { isEnabled } from "@/domain/entitlements";
import { Settings, ShieldAlert } from "lucide-react";

export const SettingsPage: React.FC = () => {
  const { effectiveClientId, user, role, entitlements, isSupportMode } = useAuth();

  const [versions, setVersions] = useState<SettingVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTabId, setActiveTabId] = useState<SettingsTabId>("business");

  useEffect(() => {
    if (!effectiveClientId) return;

    const unsub = settingsRepository.subscribeSettingVersions(
      effectiveClientId,
      (data) => {
        setVersions(data);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load setting versions:", err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [effectiveClientId]);

  if (loading) {
    return <LoadingSpinner message="Loading client settings..." />;
  }

  // Cashiers cannot view settings
  if (role === "cashier") {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-400" />
        <h2 className="mt-4 text-lg font-bold text-white">Access Restricted</h2>
        <p className="mt-1 text-sm text-slate-400">
          Only administrators can access and modify configuration settings.
        </p>
      </div>
    );
  }

  // Filter tabs allowed by entitlements
  const visibleTabs = SETTINGS_TAB_REGISTRY.filter((tab) => {
    // If superadmin in non-support mode, show all
    if (role === "superadmin" && !isSupportMode) return true;
    if (!entitlements) return false;
    // Check if the tab switch is explicitly on in entitlements
    const isTabAllowed = entitlements.settingsTabs[tab.id] !== false;
    // If tab requires a module (e.g. deposits tab requires deposits module)
    const isModuleAllowed = !tab.requiredModule || isEnabled(entitlements, "module", tab.requiredModule);
    return isTabAllowed && isModuleAllowed;
  });

  const currentTab = visibleTabs.find((t) => t.id === activeTabId) || visibleTabs[0];

  const handleSaveVersion = async (newVersion: SettingVersion) => {
    if (!effectiveClientId) return;
    await settingsRepository.saveSettingVersion(effectiveClientId, newVersion);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-emerald-400" />
          <span>Settings</span>
        </h1>
        <p className="text-sm text-slate-400">
          Configure business rules, deposit policies, sales screens, and operational parameters.
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
        {visibleTabs.map((tab) => {
          const isActive = (currentTab?.id ?? activeTabId) === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`border-b-2 px-4 py-3 text-sm font-semibold transition shrink-0 ${
                isActive
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {tab.title}
            </button>
          );
        })}
      </div>

      {/* Active Tab Fields */}
      {currentTab && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="text-base font-bold text-white">{currentTab.title}</h2>
            <p className="text-xs text-slate-400">{currentTab.description}</p>
          </div>

          <div className="space-y-3">
            {currentTab.fields.map((field) => (
              <VersionedFieldEditor
                key={field.key}
                field={field}
                versions={versions}
                userId={user?.uid || "anonymous"}
                onSaveVersion={handleSaveVersion}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
