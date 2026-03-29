export interface OperationalPolicyRules {
  anomaly: {
    duplicateEmergencyMinCount: number;
    riderMinOrders: number;
    riderCancellationRatioThreshold: number;
    disputeCountThreshold: number;
    stockSwingWindowMinutes: number;
    stockSwingMinOrders: number;
  };
  dispatch: {
    acceptanceTimeoutMs: number;
    distanceWeight: number;
    workloadWeight: number;
    ratingWeight: number;
  };
  inventory: {
    expiringSoonHours: number;
  };
  notification: {
    defaultQuietHoursEnabled: boolean;
    defaultQuietHoursStart: string;
    defaultQuietHoursEnd: string;
    defaultEmergencyBypassTier: 'normal' | 'urgent' | 'critical';
  };
}

export interface ActivePolicySnapshot {
  policyVersionId: string;
  version: number;
  policyName: string;
  rules: OperationalPolicyRules;
}
