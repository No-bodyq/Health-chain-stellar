export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export interface BloodBankInfo {
  id: string;
  name: string;
  location: string;
}

export interface HospitalInfo {
  id: string;
  name: string;
  location: string;
}

export interface RiderInfo {
  id: string;
  name: string;
  phone: string;
}

export interface Order {
  id: string;
  bloodType: BloodType;
  quantity: number;
  bloodBank: BloodBankInfo;
  hospital: HospitalInfo;
  status: OrderStatus;
  rider: RiderInfo | null;
  placedAt: Date;
  deliveredAt: Date | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
