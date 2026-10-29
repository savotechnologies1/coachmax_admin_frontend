import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  setRooms,
  setSearchTerm,
  setActiveRoomId,
  setLoadingRooms,
} from "../../store/slices/chatSlice";
import { chatApi, isCoachOrAdmin } from "../../services/chatApi";
import { ChatSidebar } from "../../components/chat/ChatSidebar";
import { ChatWindow } from "./ChatWindow";
import { toast } from "react-hot-toast";
import { useTerms } from "../../hooks/useTerms";

export const ChatList: React.FC = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const rooms = useAppSelector((state) => state.chat.rooms);
  const activeRoomId = useAppSelector((state) => state.chat.activeRoomId);
  const searchTerm = useAppSelector((state) => state.chat.searchTerm);

  const [contacts, setContacts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [manualUserId, setManualUserId] = useState("");
  const [termFilter, setTermFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { terms } = useTerms({ isEvent: "all" });
  const storedRole = (() => {
    try { return String(JSON.parse(localStorage.getItem("user") || "{}").role || "").toUpperCase(); }
    catch { return ""; }
  })();
  const canViewHistory = ["ADMIN", "SUPER_ADMIN"].includes(storedRole);
  const requestedRoomId = new URLSearchParams(location.search).get("roomId");

  const getRoomTermId = (room: any) => {
    const term = room?.termId;
    return typeof term === "object" ? term?._id : term;
  };

  const filteredRooms = useMemo(() => rooms.filter((room: any) => {
    if (termFilter !== "ALL" && getRoomTermId(room) !== termFilter) return false;
    if (statusFilter !== "ALL") {
      const status = room.status === "ARCHIVED" || room.entityStatus === "COMPLETED" ? "COMPLETED" : "ACTIVE";
      if (status !== statusFilter) return false;
    }
    return true;
  }), [rooms, termFilter, statusFilter]);

  const visibleTerms = canViewHistory
    ? terms
    : terms.filter((term: any) => rooms.some((room: any) => getRoomTermId(room) === term._id));

  useEffect(() => {
    if (requestedRoomId && filteredRooms.some((room) => room._id === requestedRoomId)) {
      if (activeRoomId !== requestedRoomId) dispatch(setActiveRoomId(requestedRoomId));
      return;
    }
    if (activeRoomId && !filteredRooms.some((room) => room._id === activeRoomId)) {
      dispatch(setActiveRoomId(filteredRooms[0]?._id || null));
    } else if (!activeRoomId && filteredRooms.length > 0) {
      dispatch(setActiveRoomId(filteredRooms[0]._id));
    }
  }, [activeRoomId, filteredRooms, requestedRoomId, dispatch]);

  // Load Rooms list
  const loadRooms = async () => {
    dispatch(setLoadingRooms(true));
    try {
      const res = await chatApi.getRooms();
      if (res.success && res.data) {
        dispatch(setRooms(res.data));
        const roomIdFromUrl = new URLSearchParams(window.location.search).get("roomId");
        if (roomIdFromUrl && res.data.some((room: any) => room._id === roomIdFromUrl)) {
          dispatch(setActiveRoomId(roomIdFromUrl));
        }
        // Auto select first room if none active
        if (res.data.length > 0 && !activeRoomId) {
          dispatch(setActiveRoomId(res.data[0]._id));
        }
      }
    } catch (err: any) {
      console.error("Load rooms error:", err);
      toast.error("Failed to load conversations.");
    } finally {
      dispatch(setLoadingRooms(false));
    }
  };

  // Load Quick Contacts based on role
  const loadQuickContacts = async () => {
    try {
      if (!isCoachOrAdmin()) {
        // Parent: Fetch classes and extract coaches
        const res = await chatApi.getClasses();
        if (res.success && Array.isArray(res.data)) {
          const coachesMap = new Map();
          res.data.forEach((c: any) => {
            if (c.coach && c.coach._id) {
              coachesMap.set(c.coach._id.toString(), {
                _id: c.coach._id,
                fullName: c.coach.fullName || "Coach",
                role: "COACH",
                model: "Admin",
              });
            }
          });
          setContacts(Array.from(coachesMap.values()));
        }
      } else {
        // Coach / Admin: load parents from every assigned class so New chat is not limited
        // to the first class returned by the API.
        const classesRes = await chatApi.getClasses();
        if (classesRes.success && Array.isArray(classesRes.data) && classesRes.data.length > 0) {
          const parentResults = await Promise.all(
            classesRes.data
              .map((c: any) => c._id || c.classId)
              .filter(Boolean)
              .map((classId: string) => chatApi.getClassParents(classId).catch(() => ({ success: false, data: [] })))
          );
          const parents = new Map<string, any>();
          parentResults.forEach((parentsRes: any) => {
            if (parentsRes.success && Array.isArray(parentsRes.data)) {
              parentsRes.data.forEach((p: any) => {
                const id = p._id?.toString();
                if (id && !parents.has(id)) {
                  parents.set(id, {
                    _id: p._id,
                    fullName: p.fullName || "Parent",
                    profileImage: p.profileImage,
                    role: "PARENT",
                    model: "Parent",
                  });
                }
              });
            }
          });
          setContacts(Array.from(parents.values()));
        }
      }
    } catch (err) {
      console.error("Error loading quick contacts:", err);
    }
  };

  useEffect(() => {
    loadRooms();
    loadQuickContacts();
  }, [dispatch]);

  const handleStartChat = async (targetId: string, model: string) => {
    if (!targetId) return;
    try {
      const res = await chatApi.createRoom(targetId, model);
      if (res.success && res.data) {
        toast.success("Chat room initialized.");
        await loadRooms();
        dispatch(setActiveRoomId(res.data._id));
        setIsModalOpen(false);
        setSelectedContactId("");
        setManualUserId("");
      } else {
        toast.error(res.message || "Failed to initialize room.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error starting conversation.");
    }
  };

  const handleManualSubmit = () => {
    const target = manualUserId.trim() || selectedContactId;
    if (!target) {
      toast.error("Please select a contact or enter a User ID.");
      return;
    }
    const model = isCoachOrAdmin() ? "Parent" : "Admin";
    handleStartChat(target, model);
  };

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-none overflow-hidden h-full shadow-lg relative">
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Communication centre</p>
            <p className="mt-1 text-xs text-slate-500">Choose a term first, then open a class, team, league, holiday camp or direct chat.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="chat-term-filter">Term</label>
            <select
              id="chat-term-filter"
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
              className="h-9 min-w-[180px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="ALL">All terms / history</option>
              {visibleTerms.map((term: any) => (
                <option key={term._id} value={term._id}>
                  {term.name || "Term"}{term.year ? ` · ${term.year}` : ""}{term.status === "COMPLETED" ? " · Completed" : ""}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="chat-status-filter">Chat status</label>
            <select
              id="chat-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 min-w-[145px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active chats</option>
              {canViewHistory && <option value="COMPLETED">Completed history</option>}
            </select>
            {(termFilter !== "ALL" || statusFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => { setTermFilter("ALL"); setStatusFilter("ALL"); }}
                className="h-9 px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{filteredRooms.length} shown</span>
          {canViewHistory && <span>Choose “All terms / history” to review completed conversations.</span>}
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
      {/* Sidebar */}
      <div className={`h-full ${activeRoomId ? "hidden md:flex" : "flex w-full md:w-[340px]"}`}>
        <ChatSidebar
          rooms={filteredRooms}
          activeRoomId={activeRoomId}
          onSelectRoom={(id) => dispatch(setActiveRoomId(id))}
          searchTerm={searchTerm}
          onSearchChange={(val) => dispatch(setSearchTerm(val))}
          contacts={contacts}
          onStartChat={handleStartChat}
          onRefreshContacts={loadQuickContacts}
          onStartChatModalOpen={() => setIsModalOpen(true)}
        />
      </div>

      {/* Active Conversation log */}
      {activeRoomId ? (
        <div className="flex-1 flex flex-col h-full min-w-0">
          <ChatWindow roomId={activeRoomId} />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 bg-slate-950/60 flex-col items-center justify-center text-slate-500 gap-2">
          <div className="text-4xl">💬</div>
          <h4 className="font-bold text-slate-350">No Conversation Selected</h4>
          <p className="text-xs">Pick a room on the left sidebar to start messaging.</p>
        </div>
      )}
      </div>

      {/* Start Chat Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-none w-full max-w-md p-6 shadow-2xl flex flex-col gap-5 text-slate-800 dark:text-slate-100 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Start Direct Chat</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white text-base font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Select Contact:</label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 text-slate-750 dark:text-slate-200 rounded-none px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Contact --</option>
                  {contacts.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.fullName} ({c.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center text-slate-400 dark:text-slate-500 text-xs font-bold py-1">— OR —</div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Enter User ID Manually:</label>
                <input
                  type="text"
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  placeholder="Enter User ObjectId..."
                  className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 text-slate-800 dark:text-slate-100 rounded-none px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-250 hover:bg-gray-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-none transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSubmit}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-none transition-colors"
              >
                Start Conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ChatList;
