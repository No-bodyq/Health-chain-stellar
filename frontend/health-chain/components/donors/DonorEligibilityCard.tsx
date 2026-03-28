"use client";

import React from "react";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

interface DeferralRecord {
  id: string;
  reason: string;
  deferredUntil: string | null;
  notes: string | null;
  createdAt: string;
  isActive: boolean;
}

interface EligibilityResult {
  donorId: string;
  status: "eligible" | "deferred" | "permanently_excluded";
  nextEligibleDate: string | null;
  activeDeferrals: DeferralRecord[];
}

interface Props {
  eligibility: EligibilityResult;
}

const STATUS_CONFIG = {
  eligible: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", label: "Eligible" },
  deferred: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50", label: "Deferred" },
  permanently_excluded: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", label: "Permanently Excluded" },
};

export function DonorEligibilityCard({ eligibility }: Props) {
  const cfg = STATUS_CONFIG[eligibility.status];
  const Icon = cfg.icon;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${cfg.bg}`}>
        <Icon className={cfg.color} size={20} />
        <div>
          <p className={`font-semibold ${cfg.color}`}>{cfg.label}</p>
          {eligibility.nextEligibleDate && (
            <p className="text-xs text-gray-500">
              Next eligible: {new Date(eligibility.nextEligibleDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {eligibility.activeDeferrals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Deferrals</p>
          {eligibility.activeDeferrals.map((d) => (
            <div key={d.id} className="flex items-start gap-2 text-sm border border-yellow-100 bg-yellow-50 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-gray-700 capitalize">{d.reason.replace(/_/g, " ")}</p>
                {d.deferredUntil && (
                  <p className="text-xs text-gray-500">Until {new Date(d.deferredUntil).toLocaleDateString()}</p>
                )}
                {d.notes && <p className="text-xs text-gray-400 mt-0.5">{d.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
