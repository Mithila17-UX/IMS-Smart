import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { clientsRepository } from "@/data/repositories/clientsRepository";
import { entitlementsRepository } from "@/data/repositories/entitlementsRepository";
import { usersRepository } from "@/data/repositories/usersRepository";
import type { Client } from "@/data/schemas/client.schema";
import type { AppUser } from "@/data/schemas/user.schema";
import type { ClientEntitlements } from "@/domain/entitlements";
import { getMissingDependencies, isDayCloseDependencySatisfied } from "@/domain/entitlements";
import { MODULE_REGISTRY, type ModuleId } from "@/registry/modules";
import { TILE_REGISTRY, type TileId } from "@/registry/tiles";
import { REPORT_REGISTRY, type ReportId } from "@/registry/reports";
import { SETTINGS_TAB_REGISTRY, type SettingsTabId } from "@/registry/settingsTabs";
import { BUILT_IN_PRESETS } from "@/registry/presets";
import {
  Sliders,
  LayoutGrid,
  FileText,
  Settings2,
  Users,
  Save,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { LoadingSpinner } from "@/ui/components/LoadingSpinner";

export const ClientDetailPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();

  const [client, setClient] = useState<Client | null>(null);
  const [, setEntitlements] = useState<ClientEntitlements | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"modules" | "tiles" | "reports" | "tabs" | "users" | "limits">("modules");

  // Local draft of entitlements while editing switches
  const [draftEntitlements, setDraftEntitlements] = useState<ClientEntitlements | null>(null);

  // New user modal state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserDisplayName, setNewUserDisplayName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"client_admin" | "cashier">("cashier");
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    if (!clientId) return;

    let mounted = true;

    // Load client doc
    void clientsRepository.getClient(clientId).then((c) => {
      if (mounted) setClient(c);
    });

    // Subscribe to entitlements
    const unsubEnt = entitlementsRepository.subscribeEntitlements(clientId, (ent) => {
      if (mounted) {
        setEntitlements(ent);
        setDraftEntitlements((current) => current || ent);
      }
    });

    // Subscribe to users
    const unsubUsers = usersRepository.subscribeUsers(clientId, (u) => {
      if (mounted) {
        setUsers(u);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubEnt();
      unsubUsers();
    };
  }, [clientId]);

  if (loading || !client || !draftEntitlements) {
    return <LoadingSpinner message="Loading client configuration & switches..." />;
  }

  // Toggle a module switch with dependency validation
  const handleToggleModule = (modId: ModuleId) => {
    const isCurrentlyOn = draftEntitlements.modules[modId] === true;
    const newModules = { ...draftEntitlements.modules, [modId]: !isCurrentlyOn };

    if (!isCurrentlyOn) {
      // User is turning it ON: Check dependencies
      const missing = getMissingDependencies(newModules, modId, MODULE_REGISTRY);

      if (modId === "dayClose" && !isDayCloseDependencySatisfied(newModules)) {
        if (!newModules["stock"]) missing.push("stock");
        if (!newModules["liveOrders"] && !newModules["dailyEntry"]) missing.push("liveOrders");
      }

      if (missing.length > 0) {
        const confirmAutoEnable = window.confirm(
          `Module "${modId}" requires the following dependency module(s) to be active: ${missing.join(", ")}.\n\nWould you like to automatically switch them on as well?`,
        );

        if (confirmAutoEnable) {
          missing.forEach((dep) => {
            newModules[dep] = true;
          });
        } else {
          return; // Cancel switch
        }
      }
    }

    setDraftEntitlements({
      ...draftEntitlements,
      modules: newModules,
    });
  };

  const handleToggleTile = (tileId: TileId) => {
    setDraftEntitlements({
      ...draftEntitlements,
      tiles: {
        ...draftEntitlements.tiles,
        [tileId]: !draftEntitlements.tiles[tileId],
      },
    });
  };

  const handleToggleReport = (reportId: ReportId) => {
    setDraftEntitlements({
      ...draftEntitlements,
      reports: {
        ...draftEntitlements.reports,
        [reportId]: !draftEntitlements.reports[reportId],
      },
    });
  };

  const handleToggleSettingsTab = (tabId: SettingsTabId) => {
    setDraftEntitlements({
      ...draftEntitlements,
      settingsTabs: {
        ...draftEntitlements.settingsTabs,
        [tabId]: !draftEntitlements.settingsTabs[tabId],
      },
    });
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = BUILT_IN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    if (!window.confirm(`Apply preset "${preset.name}"? This will update the draft switch configuration.`)) {
      return;
    }

    setDraftEntitlements({
      ...draftEntitlements,
      modules: { ...preset.modules },
      tiles: { ...preset.tiles },
      reports: { ...preset.reports },
      settingsTabs: { ...preset.settingsTabs },
    });
  };

  const handleSaveEntitlements = async () => {
    if (!clientId || !draftEntitlements) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      await entitlementsRepository.updateEntitlements(clientId, draftEntitlements);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      alert("Failed to save entitlements: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setCreatingUser(true);

    try {
      await usersRepository.createUser(clientId, {
        email: newUserEmail.trim(),
        displayName: newUserDisplayName.trim(),
        password: newUserPassword,
        role: newUserRole,
      });

      setShowAddUser(false);
      setNewUserEmail("");
      setNewUserDisplayName("");
      setNewUserPassword("");
    } catch (err: unknown) {
      alert("Failed to create user: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCreatingUser(false);
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    if (!clientId) return;
    if (!window.confirm(`Send password reset or generate link for ${email}?`)) return;

    try {
      const res = await usersRepository.resetPassword(clientId, userId);
      if (res.passwordResetLink) {
        window.prompt("Password reset link generated:", res.passwordResetLink);
      } else {
        alert("Password reset initiated successfully.");
      }
    } catch (err: unknown) {
      alert("Password reset error: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Back and Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/super"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>All Clients</span>
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{client.name}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                client.status === "active"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : client.status === "read_only"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {client.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Tenant ID: <span className="font-mono text-slate-300">{client.id}</span> · Limit: {draftEntitlements.maxUsers} users
          </p>
        </div>

        {/* Save button and Presets */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset dropdown */}
          <select
            onChange={(e) => {
              if (e.target.value) handleApplyPreset(e.target.value);
              e.target.value = "";
            }}
            defaultValue=""
            className="min-h-[40px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none"
          >
            <option value="" disabled>
              Apply Preset...
            </option>
            {BUILT_IN_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleSaveEntitlements}
            disabled={saving}
            className="flex min-h-[40px] items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="h-4 w-4 text-white" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Switches"}</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab("modules")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === "modules"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Modules ({Object.values(draftEntitlements.modules).filter(Boolean).length})</span>
        </button>

        <button
          onClick={() => setActiveTab("tiles")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === "tiles"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          <span>Tiles ({Object.values(draftEntitlements.tiles).filter(Boolean).length})</span>
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === "reports"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Reports ({Object.values(draftEntitlements.reports).filter(Boolean).length})</span>
        </button>

        <button
          onClick={() => setActiveTab("tabs")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === "tabs"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Settings2 className="h-4 w-4" />
          <span>Settings Tabs</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === "users"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Staff Accounts ({users.length})</span>
        </button>
      </div>

      {/* Tab 1: Module Switches */}
      {activeTab === "modules" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Switching a module off immediately hides its routes and menus, and prevents writes via security rules. Existing data is preserved and restored when toggled back on.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {MODULE_REGISTRY.map((mod) => {
              const isEnabled = draftEntitlements.modules[mod.id] === true;
              return (
                <div
                  key={mod.id}
                  className={`flex items-start justify-between rounded-xl border p-4 transition ${
                    isEnabled
                      ? "border-emerald-500/30 bg-emerald-950/10"
                      : "border-slate-800 bg-slate-900/40 opacity-75"
                  }`}
                >
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{mod.title}</span>
                      {mod.isCoreModule && (
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                          Core
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{mod.description}</p>
                    {mod.dependencies.length > 0 && (
                      <p className="text-[11px] text-slate-500">
                        Requires: {mod.dependencies.join(", ")}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={mod.isCoreModule}
                    onClick={() => handleToggleModule(mod.id)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                      isEnabled ? "bg-emerald-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Dashboard Tile Switches */}
      {activeTab === "tiles" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TILE_REGISTRY.map((tile) => {
            const isTileOn = draftEntitlements.tiles[tile.id] === true;
            return (
              <div
                key={tile.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div>
                  <div className="font-semibold text-white text-sm">{tile.title}</div>
                  <div className="text-xs text-slate-400">{tile.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleTile(tile.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isTileOn ? "bg-indigo-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isTileOn ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Report Switches */}
      {activeTab === "reports" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REPORT_REGISTRY.map((report) => {
            const isReportOn = draftEntitlements.reports[report.id] === true;
            return (
              <div
                key={report.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div>
                  <div className="font-semibold text-white text-sm">{report.title}</div>
                  <div className="text-xs text-slate-400">{report.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleReport(report.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isReportOn ? "bg-indigo-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isReportOn ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 4: Settings Tab Switches */}
      {activeTab === "tabs" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SETTINGS_TAB_REGISTRY.map((tab) => {
            const isTabOn = draftEntitlements.settingsTabs[tab.id] !== false;
            return (
              <div
                key={tab.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div>
                  <div className="font-semibold text-white text-sm">{tab.title}</div>
                  <div className="text-xs text-slate-400">{tab.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSettingsTab(tab.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isTabOn ? "bg-indigo-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isTabOn ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 5: Users */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Staff User Accounts</h2>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex min-h-[36px] items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              Add Staff User
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3">Name & Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{u.displayName}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize">{u.role.replace("_", " ")}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleResetPassword(u.id, u.email)}
                        className="flex min-h-[32px] items-center gap-1 ml-auto rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        <span>Reset Pass</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Create Staff User</h2>
            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newUserDisplayName}
                  onChange={(e) => setNewUserDisplayName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as "client_admin" | "cashier")}
                  className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                >
                  <option value="cashier">Cashier</option>
                  <option value="client_admin">Client Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  {creatingUser ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
