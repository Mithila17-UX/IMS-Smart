import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clientsRepository } from "@/data/repositories/clientsRepository";
import type { Client } from "@/data/schemas/client.schema";
import { useAuth } from "@/features/auth/useAuth";
import {
  Eye,
  Sliders,
  AlertCircle,
  CheckCircle2,
  Ban,
  Search,
} from "lucide-react";
import { LoadingSpinner } from "@/ui/components/LoadingSpinner";

export const ClientsListPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { enterSupportMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = clientsRepository.subscribeAllClients(
      (data) => {
        setClients(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  const handleSupportMode = (clientId: string) => {
    enterSupportMode(clientId);
    navigate("/dashboard");
  };

  const handleStatusChange = async (client: Client, newStatus: "active" | "read_only" | "blocked") => {
    const reason = window.prompt(
      `Change status of "${client.name}" to ${newStatus.toUpperCase()}? Optional reason:`,
      client.statusReason || "",
    );
    if (reason === null) return; // user cancelled prompt

    try {
      await clientsRepository.setClientStatus(client.id, newStatus, reason.trim() || undefined);
    } catch (err: unknown) {
      alert("Failed to update client status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return <LoadingSpinner message="Loading client tenants..." />;
  }

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Client Tenants</h1>
          <p className="text-sm text-slate-400">
            Manage multi-tenant clients, entitlements, module switches and status.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[40px] rounded-lg border border-slate-800 bg-slate-900/90 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Clients Table / Cards */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Activity</th>
                <th className="px-6 py-4">Billing Note</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredClients.map((client) => {
                const isActive = client.status === "active";
                const isReadOnly = client.status === "read_only";
                const isBlocked = client.status === "blocked";

                return (
                  <tr key={client.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white font-bold"
                          style={{ backgroundColor: client.accentColor || "#3b82f6" }}
                        >
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{client.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{client.id}</div>
                          <div className="text-[11px] text-slate-500">
                            {client.timezone} · {client.currency}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            isActive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : isReadOnly
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {isActive && <CheckCircle2 className="h-3 w-3" />}
                          {isReadOnly && <Eye className="h-3 w-3" />}
                          {isBlocked && <Ban className="h-3 w-3" />}
                          <span className="capitalize">{client.status.replace("_", " ")}</span>
                        </span>

                        {client.statusReason && (
                          <span className="text-[11px] text-slate-400 italic">
                            "{client.statusReason}"
                          </span>
                        )}

                        {/* Quick Status Toggle */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <span>Set:</span>
                          <button
                            onClick={() => handleStatusChange(client, "active")}
                            className="text-emerald-400 hover:underline"
                            disabled={isActive}
                          >
                            Active
                          </button>
                          <span>·</span>
                          <button
                            onClick={() => handleStatusChange(client, "read_only")}
                            className="text-amber-400 hover:underline"
                            disabled={isReadOnly}
                          >
                            Read Only
                          </button>
                          <span>·</span>
                          <button
                            onClick={() => handleStatusChange(client, "blocked")}
                            className="text-red-400 hover:underline"
                            disabled={isBlocked}
                          >
                            Block
                          </button>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-400">
                      <div>Entries/day: <span className="text-slate-200 font-semibold">{client.entriesPerDay || 0}</span></div>
                      <div>Last login: <span className="text-slate-200">{client.lastLoginAt ? new Date(client.lastLoginAt).toLocaleDateString() : "Never"}</span></div>
                      <div>Backup: <span className="text-slate-200">{client.lastBackupAt ? new Date(client.lastBackupAt).toLocaleDateString() : "Pending"}</span></div>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-400 max-w-xs truncate">
                      {client.billingNote || <span className="text-slate-600">—</span>}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSupportMode(client.id)}
                          className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white"
                          title="View client as they see it (Read-Only Support Mode)"
                        >
                          <Eye className="h-3.5 w-3.5 text-amber-400" />
                          <span>Support</span>
                        </button>

                        <Link
                          to={`/super/clients/${client.id}`}
                          className="flex min-h-[36px] items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          <span>Switches</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No client tenants found. Create a client to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
