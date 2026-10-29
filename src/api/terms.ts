import apiClient from "./apiClient";
import { getTermsUrl } from "./adminApi";

export const getAllTerms = async (year?: number): Promise<any> => {
  const params = year ? { params: { year } } : {};
  const res = await apiClient.get(getTermsUrl(), params);
  return res.data;
};

const ensureSlashDate = (value?: string | null): string => {
  if (!value) return "";
  const str = String(value).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return str;
};

export const createTerm = async (data: {
  name: string;
  year: number;
  startDate: string;
  endDate: string;
}): Promise<any> => {
  const payload = {
    ...data,
    startDate: ensureSlashDate(data.startDate),
    endDate: ensureSlashDate(data.endDate),
  };
  const res = await apiClient.post("/api/admin/createTerm", payload);
  return res.data;
};

export const updateTerm = async (id: string, data: any): Promise<any> => {
  const payload = { ...data };
  if (payload.startDate) payload.startDate = ensureSlashDate(payload.startDate);
  if (payload.endDate) payload.endDate = ensureSlashDate(payload.endDate);
  const res = await apiClient.put(`/api/admin/updateTerm/${id}`, payload);
  return res.data;
};

export const deleteTerm = async (id: string): Promise<any> => {
  const res = await apiClient.delete(`/api/admin/deleteTerm/${id}`);
  return res.data;
};
