import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  setAnnouncements,
  setLoading,
  setBroadcastRooms,
  setActiveClassId,
} from "../../store/slices/broadcastSlice";
import { broadcastApi } from "../../services/broadcastApi";
import { BroadcastCard } from "../../components/chat/BroadcastCard";
import { Megaphone, RotateCw, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export const BroadcastList: React.FC = () => {
  const dispatch = useAppDispatch();
  const announcements = useAppSelector((state) => state.broadcast.announcements);
  const rooms = useAppSelector((state) => state.broadcast.broadcastRooms);
  const activeClassId = useAppSelector((state) => state.broadcast.activeClassId);
  const loading = useAppSelector((state) => state.broadcast.loading);

  const loadRooms = async () => {
    try {
      // Only list actual broadcast rooms. Falling back to a class ID makes the
      // room-message endpoint receive a class ID and produces a misleading
      // "room not found" state before a class chat has been created.
      const res = await broadcastApi.getBroadcastRooms();
      if (res.success && Array.isArray(res.data)) {
        const mapped = res.data
          .map((cls: any) => ({
            classId: cls._id || cls.broadcastChatRoomId || cls.broadcastRoomId,
            className: cls.name || cls.className || cls.context?.className || cls.scopeLabel || "Broadcast",
            type: cls.eventId || cls.eventSessionDate ? "EVENT" : cls.teamId ? "TEAM" : "CLASS",
          }))
          .filter((room: any) => room.classId);
        dispatch(setBroadcastRooms(mapped));
        if (mapped.length > 0 && !activeClassId) {
          dispatch(setActiveClassId(mapped[0].classId));
        }
      } else if (!res.success) {
        toast.error(res.message || "Failed to load classes.");
      }
    } catch (err: any) {
      console.error("Load broadcast rooms error:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to load classes.";
      toast.error(msg);
    }
  };


  const loadFeed = async (classId: string) => {
    dispatch(setLoading(true));
    try {
      const res = await broadcastApi.getBroadcastMessages(classId);
      if (res.success && res.data) {
        // Map messages into announcements format
        const mappedAnnouncements = res.data.map((msg: any) => ({
          _id: msg._id,
          classId: classId,
          className: rooms.find((r) => r.classId === classId)?.className || "Class Broadcast",
          text: msg.text,
          sender: msg.sender?.user || { fullName: "Coach" },
          createdAt: msg.createdAt,
        }));
        dispatch(setAnnouncements(mappedAnnouncements));
      } else {
        dispatch(setAnnouncements([]));
        if (!res.success && res.message) {
          toast.error(res.message);
        }
      }
    } catch (err: any) {
      console.error("Load announcements error:", err);
      const msg = err?.response?.data?.message || err?.message || "Failed to load announcements.";
      toast.error(msg);
    } finally {
      dispatch(setLoading(false));
    }
  };


  useEffect(() => {
    loadRooms();
  }, [dispatch]);

  useEffect(() => {
    if (activeClassId) {
      loadFeed(activeClassId);
    }
  }, [activeClassId]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Announcements Feed Header */}
      <div className="flex items-center justify-between pl-1 flex-wrap gap-2">
        <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Megaphone size={14} className="text-[#0047FF]" />
          <span>Announcements Feed</span>
        </h4>

        {rooms.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={activeClassId || ""}
              onChange={(e) => dispatch(setActiveClassId(e.target.value))}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-none px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-[#0047FF] cursor-pointer"
            >
              {rooms.map((room) => (
                <option key={room.classId} value={room.classId}>
                  {room.className}
                </option>
              ))}
            </select>

            <button
              onClick={() => activeClassId && loadFeed(activeClassId)}
              className="p-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-none border border-slate-200 dark:border-slate-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-theme-xs"
              title="Refresh feed"
            >
              <RotateCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        )}
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center rounded-none text-slate-500 dark:text-slate-400 text-xs shadow-theme-xs flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-[#0047FF]" />
          <span className="font-bold uppercase tracking-wider text-[11px]">Fetching announcements...</span>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-dashed p-12 text-center rounded-none text-slate-400 dark:text-slate-500 text-xs font-medium italic shadow-theme-xs">
          No announcements published in this room yet.
        </div>
      ) : (
        announcements.map((ann) => (
          <BroadcastCard key={ann._id} announcement={ann} />
        ))
      )}
    </div>
  );
};
export default BroadcastList;
