export type Role = 'REPORTER' | 'TECHNICIAN' | 'COORDINATOR' | 'ADMIN';
export type Status =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED';
export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TradeUnit {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  defaultTradeUnit: TradeUnit;
}

export interface Location {
  id: string;
  building: string;
  floor: string;
  room: string;
}

export interface Photo {
  id: string;
  storageUrl: string;
}

export interface StatusLog {
  id: string;
  oldStatus: Status | null;
  newStatus: Status;
  remarks: string | null;
  createdAt: string;
}

export interface Technician {
  id: string;
  fullName: string;
  tradeUnit: TradeUnit | null;
}

export interface JobOrderBasic {
  id: string;
  jobOrderNo: string;
  reportId: string;
  tradeUnitId: string;
  technicianId: string | null;
  materialsNote: string | null;
  targetDate: string | null;
  status: Status;
  createdAt: string;
}

export interface Reporter {
  id: string;
  fullName: string;
  userType: string | null;
}

export interface Report {
  id: string;
  description: string;
  urgency: Urgency;
  status: Status;
  createdAt: string;
  category: { id: string; name: string };
  location: Location;
  proposedTradeUnit: TradeUnit;
  photos: Photo[];
  reporter: Reporter;
  jobOrder: JobOrderBasic | null;
  logs: StatusLog[];
}

export interface JobOrder extends JobOrderBasic {
  tradeUnit: TradeUnit;
  technician: { id: string; fullName: string } | null;
  report: {
    id: string;
    description: string;
    urgency: Urgency;
    status: Status;
    category: { id: string; name: string };
    location: Location;
    reporter: Reporter;
  };
}

export interface ReportOptions {
  categories: Category[];
  locations: Location[];
  urgencies: Urgency[];
}