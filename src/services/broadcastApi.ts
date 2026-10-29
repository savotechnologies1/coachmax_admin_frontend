import { chatApi, SendClassBroadcastPayload } from "./chatApi";

export const broadcastApi = {
  getBroadcastRooms: async () => {
    // Rooms of type 'BROADCAST' are returned in the rooms list
    const data = await chatApi.getRooms();
    if (data.success && Array.isArray(data.data)) {
      return {
        success: true,
        data: data.data.filter((r: any) => r.type === "BROADCAST"),
      };
    }
    return data;
  },

  getBroadcastMessages: async (roomId: string) => {
    return await chatApi.getRoomMessages(roomId);
  },

  sendClassBroadcast: async (payload: SendClassBroadcastPayload, classIdInUrl?: string) => {
    return await chatApi.sendClassBroadcast(payload, classIdInUrl);
  },

  publishAnnouncement: async (payload: SendClassBroadcastPayload | string, text?: string) => {
    if (typeof payload === "string") {
      return await chatApi.sendClassBroadcast({ text: text || "" }, payload);
    }
    return await chatApi.sendClassBroadcast(payload);
  },
};
