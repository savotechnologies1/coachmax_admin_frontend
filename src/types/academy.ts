export interface AttendanceRecord {
  id: number;
  playerName: string;
  avatar: string;
  dob: string;
  medicalConditions: string;
  isMedicalCondition?: boolean;
  attendance: ("present" | "absent" | "late" | "none")[]; // 10 days of record
}

export interface ClassSchedule {
  id: number;
  time: string;
  ageGroup: string;
  coach: string;
  location: string;
  players: AttendanceRecord[];
}

export interface UnallocatedPlayer {
  _id?: string;
  id: string | number;
  name: string;
  avatar: string;
  details: string; // e.g. "U10 - Male"
  rating: number;
  requested: string;
  programCode: string;
  fullProgramName?: string;
  categoryName?: string;
  categoryId?: string;
  programId?: string;
  registrationRequestId?: string;
  paymentStatus?: string;
  assignedClasses?: Array<{
    _id?: string;
    name?: string;
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
    venue?: string;
    location?: string;
  }>;
  assignedTeams?: Array<{
    id?: string;
    name: string;
    ageGroup?: string;
  }>;
  termName?: string;
  termId?: string;
  isEvent?: boolean;
  preferredClasses?: Array<{
    id: string;
    name: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    location: string;
  }>;
  primaryClass?: {
    id: string;
    name: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    location?: string;
  };
}

export interface WaitlistItem {
  id: number;
  classTitle: string;
  count: number;
}

export interface TrialItem {
  id: number;
  name: string;
  avatar: string;
  details: string;
  requested: string;
  status: "Invite Sent" | "Trial Booked" | "Pending";
}
