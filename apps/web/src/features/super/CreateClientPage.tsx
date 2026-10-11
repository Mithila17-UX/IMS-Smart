import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientsRepository } from "@/data/repositories/clientsRepository";
import { BUILT_IN_PRESETS } from "@/registry/presets";
import { Building2, UserPlus, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export const CreateClientPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [presetId, setPresetId] = useState("full-bar");
  const [timezone, setTimezone] = useState("Asia/Colombo");
  const [currency, setCurrency] = useState("LKR");
  const [language, setLanguage] = useState("en-LK");
  const [accentColor, setAccentColor] = useState("#059669");
  const [billingNote, setBillingNote] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // First admin user credentials
  const [adminDisplayName, setAdminDisplayName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !adminEmail || !adminPassword || !adminDisplayName) {
      setError("Please fill out all required fields.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await clientsRepository.createClient({
        name: name.trim(),
        presetId,
        timezone,
        currency,
        language,
        accentColor,
        billingNote: billingNote.trim() || undefined,
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        adminDisplayName: adminDisplayName.trim(),
        adminEmail: adminEmail.trim(),
        adminPassword,
      });

      navigate(`/super/clients/${res.clientId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create client tenant");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Create Client Tenant</h1>
        <p className="text-sm text-slate-400">
          Onboard a new bar or business client, apply a switch preset, and provision their initial administrator.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Preset Selection */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-indigo-400" />
            <span>1. Choose a Starting Preset</span>
          </h2>
          <p className="text-xs text-slate-400">
            Presets configure the initial module and tile switches. You can customize any switch immediately after creation.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {BUILT_IN_PRESETS.map((p) => {
              const isSelected = presetId === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPresetId(p.id)}
                  className={`flex flex-col text-left rounded-lg p-4 border transition ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-950/40 text-white shadow-lg shadow-indigo-950/50"
                      : "border-slate-800 bg-slate-800/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  <span className="font-semibold text-sm">{p.name}</span>
                  <span className="mt-2 text-xs text-slate-400 leading-relaxed">{p.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Client Profile */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-400" />
            <span>2. Client Information</span>
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Client / Restaurant Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Colombo Harbor Bar & Grill"
                className="mt-1 block w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Timezone
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 block w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Currency Code
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 block w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Contact Person Name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Kasun Silva"
                className="mt-1 block w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Contact Phone
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+94 77 123 4567"
                className="mt-1 block w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="kasun@bar.lk"
                className="mt-1 block w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Language / Locale
              </label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-1 block w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Accent Branding Color
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded border border-slate-700 bg-slate-800 p-1"
                />
                <span className="text-xs font-mono text-slate-400">{accentColor}</span>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Billing Note (Private to Super Admin)
              </label>
              <textarea
                rows={2}
                value={billingNote}
                onChange={(e) => setBillingNote(e.target.value)}
                placeholder="Notes on agreement, billing frequency, offline invoice ref..."
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 3: First Client Administrator */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-indigo-400" />
            <span>3. Client Administrator Account</span>
          </h2>
          <p className="text-xs text-slate-400">
            This account will receive the `client_admin` claim and full management control of this tenant.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Admin Full Name *
              </label>
              <input
                type="text"
                required
                value={adminDisplayName}
                onChange={(e) => setAdminDisplayName(e.target.value)}
                placeholder="e.g. Kasun Silva"
                className="mt-1 block w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Admin Login Email *
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@colombobar.lk"
                className="mt-1 block w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Initial Password * (min 8 chars)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full min-h-[44px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate("/super")}
            className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Client Tenant...</span>
              </>
            ) : (
              <span>Create Client & Apply Preset</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
