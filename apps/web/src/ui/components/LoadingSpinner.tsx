import React from "react";
import { Loader2 } from "lucide-react";

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading..." }) => {
  return (
    <div className="flex min-h-[200px] w-full flex-col items-center justify-center gap-3 p-8 text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};
