import apiClient from "./apiClient";

const BASE = "/api/admin/email-campaigns";

export const getEmailAudiences = async () => (await apiClient.get(`${BASE}/audiences`)).data;
export const getEmailAudiencePlayers = async (params: Record<string, unknown>) => (await apiClient.get(`${BASE}/recipients`, { params })).data;
export const previewEmailCampaign = async (payload: Record<string, unknown>) => (await apiClient.post(`${BASE}/preview`, payload)).data;
export const sendTestEmail = async (email: string) => (await apiClient.post(`${BASE}/test`, { email })).data;
export const createEmailCampaign = async (payload: Record<string, unknown>) => (await apiClient.post(BASE, payload)).data;
export const getEmailCampaigns = async (params: Record<string, unknown>) => (await apiClient.get(BASE, { params })).data;
export const getEmailCampaignDetails = async (campaignId: string, params: Record<string, unknown> = {}) => (await apiClient.get(`${BASE}/${campaignId}`, { params })).data;
export const retryFailedEmailRecipients = async (campaignId: string) => (await apiClient.post(`${BASE}/${campaignId}/retry-failed`)).data;
