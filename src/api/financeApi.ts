import apiClient from "./apiClient";

export interface BankDetailsData {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  iban?: string;
  swiftCode?: string;
  branch?: string;
  instructions?: string;
  isActive?: boolean | string;
  qrCodeImage?: File | null;
}

export interface TermEarningsQueryParams {
  classId?: string;
  status?: string;
  compareTermId?: string;
  stream?: string;
}

export const getBankDetails = async () => {
  const response = await apiClient.get("/api/admin/bank-details");
  return response.data;
};

export const updateBankDetails = async (data: BankDetailsData) => {
  const formData = new FormData();
  if (data.accountName) formData.append("accountName", data.accountName);
  if (data.accountNumber) formData.append("accountNumber", data.accountNumber);
  if (data.bankName) formData.append("bankName", data.bankName);
  if (data.iban) formData.append("iban", data.iban);
  if (data.swiftCode) formData.append("swiftCode", data.swiftCode);
  if (data.branch) formData.append("branch", data.branch);
  if (data.instructions) formData.append("instructions", data.instructions);
  if (data.isActive !== undefined) formData.append("isActive", String(data.isActive));

  if (data.qrCodeImage) {
    formData.append("qrCodeImage", data.qrCodeImage);
  }

  const response = await apiClient.post("/api/admin/bank-details", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
};

/**
 * Fetch Term Earnings Report
 * GET /api/admin/term/:termId/earnings?classId=...&status=...&compareTermId=...
 */
export const getTermEarnings = async (termId: string, params?: TermEarningsQueryParams) => {
  const cleanParams: Record<string, string> = {};
  if (params?.classId && params.classId !== "ALL") {
    cleanParams.classId = params.classId;
  }
  if (params?.status && params.status !== "ALL") {
    cleanParams.status = params.status;
  }
  if (params?.compareTermId && params.compareTermId !== "NONE") {
    cleanParams.compareTermId = params.compareTermId;
  }
  if (params?.stream && params.stream !== "ALL") {
    cleanParams.stream = params.stream;
  }

  const response = await apiClient.get(`/api/admin/term/${termId}/earnings`, {
    params: cleanParams,
  });
  return response.data;
};