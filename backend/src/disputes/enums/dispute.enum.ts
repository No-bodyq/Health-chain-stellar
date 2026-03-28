export enum DisputeStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum DisputeSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum DisputeReasonTaxonomy {
  FAILED_DELIVERY = 'failed_delivery',
  TEMPERATURE_EXCURSION = 'temperature_excursion',
  PAYMENT_CONTESTED = 'payment_contested',
  WRONG_ITEM = 'wrong_item',
  DAMAGED_GOODS = 'damaged_goods',
  LATE_DELIVERY = 'late_delivery',
  OTHER = 'other',
}
