import React, { useState, useEffect } from "react";
import type { Offer, OfferRuleType } from "@/data/schemas/offer.schema";
import { offersRepository } from "@/data/repositories/offersRepository";
import { parseToCents, centsToDecimalString } from "@/lib/money";
import { X, Loader2 } from "lucide-react";

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  offerToEdit?: Offer | null;
  onSaved?: () => void;
}

const DAY_LABELS = [
  { day: 0, label: "Sun" },
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
];

export const OfferModal: React.FC<OfferModalProps> = ({
  isOpen,
  onClose,
  clientId,
  offerToEdit,
  onSaved,
}) => {
  const [name, setName] = useState("");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("20:00");
  const [channels, setChannels] = useState<string[]>(["inside"]);
  const [ruleType, setRuleType] = useState<OfferRuleType>("amount_off");
  const [valueInput, setValueInput] = useState("100.00");
  const [priority, setPriority] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (offerToEdit) {
      setName(offerToEdit.name);
      setDays(offerToEdit.days);
      setStartTime(offerToEdit.startTime);
      setEndTime(offerToEdit.endTime);
      setChannels(offerToEdit.channels);
      setRuleType(offerToEdit.ruleType);
      setValueInput(
        offerToEdit.ruleType === "percent_off"
          ? String(offerToEdit.value)
          : centsToDecimalString(offerToEdit.value),
      );
      setPriority(offerToEdit.priority);
      setStartDate(offerToEdit.startDate || "");
      setEndDate(offerToEdit.endDate || "");
      setActive(offerToEdit.active);
    } else {
      setName("");
      setDays([1, 2, 3, 4, 5]);
      setStartTime("17:00");
      setEndTime("20:00");
      setChannels(["inside"]);
      setRuleType("amount_off");
      setValueInput("100.00");
      setPriority(1);
      setStartDate("");
      setEndDate("");
      setActive(true);
    }
    setError(null);
  }, [offerToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleDay = (d: number) => {
    if (days.includes(d)) {
      if (days.length <= 1) {
        setError("Offer must be active on at least one day.");
        return;
      }
      setDays(days.filter((item) => item !== d));
    } else {
      setDays([...days, d].sort());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Offer name is required.");
      return;
    }

    if (days.length === 0) {
      setError("Please select at least one day of the week.");
      return;
    }

    const numericValue =
      ruleType === "percent_off"
        ? Math.min(100, Math.max(1, Number(valueInput) || 0))
        : parseToCents(valueInput);

    if (numericValue <= 0) {
      setError("Please enter a valid discount value.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await offersRepository.saveOffer(
        clientId,
        {
          name: name.trim(),
          days,
          startTime,
          endTime,
          productIds: [], // applies to all eligible
          categoryIds: [],
          channels,
          ruleType,
          value: numericValue,
          priority: Math.max(1, Number(priority) || 1),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          active,
        },
        offerToEdit?.id,
      );

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save offer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white">
            {offerToEdit ? "Edit Offer / Happy Hour" : "Create Promotional Offer"}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Offer Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekday Happy Hour"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Days of Week */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Active Days of the Week *
            </label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((item) => (
                <button
                  key={item.day}
                  type="button"
                  onClick={() => toggleDay(item.day)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                    days.includes(item.day)
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time of Day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Start Time (24h) *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">End Time (24h) *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Rule Type & Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Rule Type *</label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as OfferRuleType)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="amount_off">Amount Off (Rs discount)</option>
                <option value="fixed_price">Fixed Price (Rs)</option>
                <option value="percent_off">Percent Off (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {ruleType === "percent_off" ? "Discount Percentage (%)" : "Value (LKR)"} *
              </label>
              <input
                type="number"
                step={ruleType === "percent_off" ? "1" : "0.01"}
                min="1"
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                placeholder={ruleType === "percent_off" ? "20" : "100.00"}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Priority & Channel */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Priority (Higher wins)
              </label>
              <input
                type="number"
                min="1"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Channel</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setChannels(
                      channels.includes("inside")
                        ? channels.filter((c) => c !== "inside")
                        : [...channels, "inside"],
                    )
                  }
                  className={`flex-1 rounded py-1.5 text-xs font-semibold ${
                    channels.includes("inside")
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  Inside
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setChannels(
                      channels.includes("outside")
                        ? channels.filter((c) => c !== "outside")
                        : [...channels, "outside"],
                    )
                  }
                  className={`flex-1 rounded py-1.5 text-xs font-semibold ${
                    channels.includes("outside")
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  Outside
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="offerActive"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="offerActive" className="text-xs font-medium text-slate-300">
              Active Offer (automatically applies to tally tickets during schedule)
            </label>
          </div>

          <div className="mt-5 flex gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-800 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {offerToEdit ? "Save Changes" : "Create Offer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
