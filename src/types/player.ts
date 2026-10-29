export interface PlayerParent {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  emergencyContact: string;
  relationship: string;
}

export interface PlayerCategory {
  _id: string;
  name: string;
}

export interface PlayerProgram {
  _id: string;
  name: string;
}

export interface Player {
  _id: string;
  requestId?: string;
  playerStatus?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  dob: string;
  gender: string;
  profile: string;
  profileImage: string;
  parentId: PlayerParent | null;
  preferredFoot: string;
  weakFootRating: number;
  school: string;
  status: string;
  category?: PlayerCategory;
  program?: PlayerProgram;
  programs?: PlayerProgram[];
  term?: string;
  paymentStatus?: string;
  classPaymentStatuses?: {
    class?: any;
    paymentStatus?: string;
    _id?: string;
  }[];
  jerseyNumber: number;
  goals: number;
  assists: number;
  appearances: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  rejectReason: string | null;
  approvedBy: string | null;
  rejectedBy: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  isBlocked: boolean;
  adminNote: string;
  medicalConditions?: string;
  isMedicalCondition?: boolean;
  medicalConditionDetails?: string;
  skill?: string;
  rating?: number;
  prefferedFoot?: string;
  assignedClasses: any[];
  hasPendingRequest?: boolean;
  preferredTerm?: any;
  preferredClasses?: any[];
  requestType?: string;
  addedBy?: string;
  requestedBySource?: "APP" | "SUPER_ADMIN" | "COACH";
  createdBy?: string;
  assignedBy?: any;
  joinedDate: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface PlayerStats {
  totalCount: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  eliteCount: number;
  schoolCount: number;
  bothCount: number;
  unassignedCount: number;
}

export interface PlayersResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  users: Player[];
  stats?: PlayerStats;
}
