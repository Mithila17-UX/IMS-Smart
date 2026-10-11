import React, { useState } from "react";
import type { SettingFieldDefinition } from "@/registry/settingsTabs";
import type { SettingVersion } from "@/domain/settings";
import {
  getCurrentSetting,
  getVersionHistory,
  validateNewVersion,
  buildNewVersion,
} from "@/domain/settings";
import { formatMoney } from "@/lib/money";
import { History, Check, AlertTriangle, X } from "lucide-react";

interface Props {
  field: SettingFieldDefinition;
  versions: readonly SettingVersion[];
  userId: string;
  onSaveVersion: (newVersion: SettingVersion) => Promise<void>;
}

export const VersionedFieldEditor: React.FC<Props> = ({
  field,
  versions,
  userId,
  onSaveVersion,
}) => {
  const currentValue = getCurrentSetting(field.key, versions, field.defaultValue);

  const [draftValue, setDraftValue] = useState<boolean | number | string>(currentValue);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [effectiveMode, setEffectiveMode] = useState<"now" | "scheduled">("now");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [saving, setSaving] = useState(false);

  const hasChanged = draftValue !== currentValue;

  const validation = validateNewVersion(field.key, draftValue, currentValue, {
    min: field.min,
    max: field.max,
    warnThresholdPercent: field.warnThresholdPercent,
  });

  const handleOpenPreview = () => {
    if (validation.error) {
      alert(validation.error);
      return;
    }
    setShowPreviewModal(true);
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    try {
      const effectiveDate =
        effectiveMode === "now" || !scheduledDateTime
          ? new Date()
          : new Date(scheduledDateTime);

      const newVer = buildNewVersion(
        field.key,
        draftValue,
        userId,
        effectiveDate,
        changeReason.trim() || undefined,
      );

      await onSaveVersion(newVer);
      setShowPreviewModal(false);
      setChangeReason("");
    } catch (err: unknown) {
      alert("Failed to save setting version: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const history = getVersionHistory(field.key, versions);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-white">{field.label}</label>
            {field.versioned && (
              <span className="rounded bg-indigo-950/60 border border-indigo-800/40 px-1.5 py-0.2 text-[10px] font-medium text-indigo-400">
                Versioned
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">{field.description}</p>
        </div>

        {field.versioned && (
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="flex min-h-[36px] items-center gap-1 text-xs text-slate-400 hover:text-white"
            title="View change history"
          >
            <History className="h-3.5 w-3.5" />
            <span>History ({history.length})</span>
          </button>
        )}
      </div>

      {/* Input controls based on field type */}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {field.type === "boolean" && (
          <button
            type="button"
            onClick={() => {
              const nextVal = !draftValue;
              setDraftValue(nextVal);
            }}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              draftValue ? "bg-emerald-600" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                draftValue ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        )}

        {field.type === "integer" && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={field.min}
              max={field.max}
              value={draftValue as number}
              onChange={(e) => setDraftValue(Number(e.target.value))}
              className="w-32 min-h-[40px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
            {field.key.toLowerCase().includes("cents") && (
              <span className="text-xs text-slate-400 font-mono">
                ≈ {formatMoney(Number(draftValue))}
              </span>
            )}
          </div>
        )}

        {field.type === "string" && (
          <input
            type="text"
            value={draftValue as string}
            onChange={(e) => setDraftValue(e.target.value)}
            className="w-full max-w-sm min-h-[40px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
          />
        )}

        {field.type === "time" && (
          <input
            type="time"
            value={draftValue as string}
            onChange={(e) => setDraftValue(e.target.value)}
            className="w-32 min-h-[40px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
          />
        )}

        {field.type === "select" && field.options && (
          <select
            value={draftValue as string}
            onChange={(e) => setDraftValue(e.target.value)}
            className="min-h-[40px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {hasChanged && (
          <button
            type="button"
            onClick={handleOpenPreview}
            className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 active:scale-95"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Review & Save</span>
          </button>
        )}
      </div>

      {/* Validation Warning */}
      {validation.warning && (
        <div className="mt-2 flex items-center gap-2 text-xs text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{validation.warning}</span>
        </div>
      )}

      {/* Preview and Confirmation Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Review Setting Change</h3>
            <p className="mt-1 text-xs text-slate-400">
              Changes apply strictly forward from the effective time and never rewrite historical sales.
            </p>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-800/40 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Setting:</span>
                <span className="font-semibold text-white">{field.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Current Value:</span>
                <span className="font-mono text-slate-300">{String(currentValue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">New Value:</span>
                <span className="font-mono text-emerald-400 font-bold">{String(draftValue)}</span>
              </div>
            </div>

            {/* Effective From Selector */}
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold uppercase text-slate-300">
                Effective From
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="effectiveMode"
                    value="now"
                    checked={effectiveMode === "now"}
                    onChange={() => setEffectiveMode("now")}
                    className="text-indigo-600"
                  />
                  <span>Immediately (Now)</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="effectiveMode"
                    value="scheduled"
                    checked={effectiveMode === "scheduled"}
                    onChange={() => setEffectiveMode("scheduled")}
                    className="text-indigo-600"
                  />
                  <span>Scheduled Date & Time</span>
                </label>
              </div>

              {effectiveMode === "scheduled" && (
                <input
                  type="datetime-local"
                  required
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                />
              )}
            </div>

            {/* Reason */}
            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase text-slate-300">
                Reason for change (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Government tax rate revision"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmSave}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Confirm & Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl max-h-[80vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Version History: {field.label}</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
              {history.map((ver, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5 text-xs text-slate-300 space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-emerald-400 text-sm font-mono">{String(ver.value)}</span>
                    <span className="text-slate-400 font-normal">
                      {new Date(ver.effectiveFrom).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    Changed by user: <span className="text-slate-200">{ver.changedBy}</span>
                  </div>
                  {ver.changeReason && (
                    <div className="text-slate-400 italic">"{ver.changeReason}"</div>
                  )}
                </div>
              ))}

              {history.length === 0 && (
                <div className="py-8 text-center text-slate-500">
                  No previous versions recorded. Currently using default.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
