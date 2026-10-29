// Programs API types
export interface Program {
  _id: string;
  name: string;
  description: string;
  category: string;
  capacity: number;
  pricing: number;
  coaches: string[];
  schedule: {
    startTime: string;
    endTime: string;
    [key: string]: unknown;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ProgramsResponse {
  success: boolean;
  message: string;
  data: Program[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProgramResponse {
  success: boolean;
  message: string;
  data: Program;
}

export interface CreateProgramRequest {
  name: string;
  category: string;
  description?: string;
  capacity?: number;
  pricing?: number;
  coaches?: string[];
  schedule?: {
    startTime: string;
    endTime: string;
  };
}

export type UpdateProgramRequest = Partial<CreateProgramRequest>;
