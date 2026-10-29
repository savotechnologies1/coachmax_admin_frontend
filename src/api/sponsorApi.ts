import apiClient from "./apiClient";

const ENDPOINTS = {
  CREATE_SPONSOR: "/api/admin/createBanner",
  UPDATE_SPONSOR: "/api/admin/updateBanner",
  GET_ALL_SPONSORS: "/api/admin/getAllBanners",
  DELETE_SPONSOR: "/api/admin/deleteBanner",
  TOGGLE_BANNER_STATUS: "/api/admin/toggleBannerStatus",
};

export interface Sponsor {
  _id: string;
  title: string;
  subtitle: string;
  link: string;
  imageUrl?: string;
  bannerImg?: string;
  image?: string;
  isActive?: boolean | string;
  status?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const getAllSponsors = async () => {
  const response = await apiClient.get(ENDPOINTS.GET_ALL_SPONSORS);
  return response.data;
};

export const createSponsor = async (data: any) => {
  const response = await apiClient.post(ENDPOINTS.CREATE_SPONSOR, data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const updateSponsor = async (id: string, data: any) => {
  const response = await apiClient.put(`${ENDPOINTS.UPDATE_SPONSOR}/${id}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const deleteSponsor = async (id: string) => {
  const response = await apiClient.delete(`${ENDPOINTS.DELETE_SPONSOR}/${id}`);
  return response.data;
};

export const toggleBannerStatus = async (id: string) => {
  const response = await apiClient.patch(`${ENDPOINTS.TOGGLE_BANNER_STATUS}/${id}`);
  return response.data;
};
