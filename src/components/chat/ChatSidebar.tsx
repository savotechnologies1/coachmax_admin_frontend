import React from "react";
import { ChatRoom } from "../../store/slices/chatSlice";
import { UnreadBadge } from "./UnreadBadge";
import { getMediaFallback, getMediaUrl } from "../../utils/media";

interface Contact {
  _id: string;
  fullName: string;
  role?: string;
  model: string;
  profileImage?: string;
}

interface ChatSidebarProps {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  contacts: Contact[];
  onStartChat: (targetId: string, model: string) => void;
  onRefreshContacts?: () => void;
  onStartChatModalOpen?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  rooms,
  activeRoomId,
  onSelectRoom,
  searchTerm,
  onSearchChange,
  contacts: _contacts,
  onStartChat: _onStartChat,
  onRefreshContacts: _onRefreshContacts,
  onStartChatModalOpen,
}) => {
  const [activeTab, setActiveTab] = React.useState<"All" | "Parent" | "Coach" | "Admin" | "Team" | "Class" | "League" | "Event">("All");

  // Find the current user's ID
  const userStr = localStorage.getItem("user");
  let currentUserId = "";
  if (userStr) {
    try {
      const parsed = JSON.parse(userStr);
      currentUserId = parsed?._id || parsed?.id || "";
    } catch (e) {
      console.error(e);
    }
  }

  const getRoomLabel = (room: ChatRoom, currentId: string) => {
    if (room.type === "BROADCAST") {
      if (room.scopeType === "EVENT_DAY" || room.eventId || room.eventSessionDate) return "EVENT";
      if (room.scopeType === "LEAGUE" || room.leagueId) return "LEAGUE";
      if (room.scopeType === "TEAM" || room.teamId) return "TEAM";
      return "CLASS";
    }
    if (room.type === "GROUP") return "TEAM";

    const partnerMember = room.members?.find((m) => {
      const memberUserId = m.user?._id || (m.user as any)?.id || m.user;
      return memberUserId && memberUserId.toString() !== currentId.toString();
    });

    if (partnerMember) {
      const memberModel = partnerMember.refModel || (partnerMember as any).model;
      if (memberModel === "Parent") return "PARENT";
      if (memberModel === "Admin") {
        const role = String((partnerMember.user as any)?.role || (partnerMember as any).role || "").toUpperCase();
        return role === "SUPER_ADMIN" || role === "ADMIN" ? "ADMIN" : "COACH";
      }
    }

    // Admin history viewers may not be members of a direct room. Classify
    // that conversation by its parent participant so counts remain meaningful.
    const participants = room.members || [];
    if (participants.some((member) => (member.refModel || (member as any).model) === "Parent")) return "PARENT";

    return null;
  };

  const getRefName = (ref: unknown, fallback = "") => {
    if (!ref || typeof ref === "string") return fallback;
    const value = ref as { name?: string; fullName?: string; title?: string; teamName?: string };
    return value.name || value.fullName || value.title || value.teamName || fallback;
  };

  const getRoomContext = (room: ChatRoom) => {
    const context = room.context || {};
    const label = getRoomLabel(room, currentUserId);
    const className = context.className || getRefName(room.classId);
    const teamName = context.teamName || getRefName(room.teamId);
    const leagueName = context.leagueName || getRefName(room.leagueId);
    const eventTitle = context.eventTitle || getRefName(room.eventId);
    const termRef = room.termId;
    const termName = context.termName || (termRef && typeof termRef === "object" ? [termRef.name, termRef.year].filter(Boolean).join(" · ") : "");
    const schedule = [
      context.dayOfWeek,
      context.startTime && context.endTime ? `${context.startTime}–${context.endTime}` : context.startTime,
    ].filter(Boolean).join(" · ");

    if (label === "EVENT") return [eventTitle || "Holiday Camp", room.eventSessionDate, termName, schedule].filter(Boolean).join(" · ");
    if (label === "TEAM") return teamName || room.name || "Team chat";
    if (label === "LEAGUE") return [leagueName || room.name || "League chat", termName].filter(Boolean).join(" · ");
    if (label === "CLASS") {
      return [className || room.name || "Class chat", context.programName, termName, schedule]
        .filter(Boolean)
        .join(" · ");
    }
    return "";
  };

  const getRoomName = (room: ChatRoom) => {
    if (room.type === "BROADCAST") return room.name || "Class Broadcast";

    // Check if the current user is a member of this room
    const isCurrentUserMember = room.members?.some((m) => {
      const memberUserId = m.user?._id || (m.user as any)?.id || m.user;
      return memberUserId && memberUserId.toString() === currentUserId.toString();
    });

    // If current user is not a member (e.g. Super Admin monitoring), show both names
    if (!isCurrentUserMember && room.type === "DIRECT") {
      const names = room.members
        ?.map((m) => m.user?.fullName || m.user?.name)
        .filter(Boolean);
      if (names && names.length > 0) {
        return names.join(" & ");
      }
    }

    // Find the member who is not the current user
    const partner = room.members?.find((m) => {
      const memberUserId = m.user?._id || (m.user as any)?.id || m.user;
      return memberUserId && memberUserId.toString() !== currentUserId.toString();
    });

    const displayMember = partner || room.members?.find((m) => m.user);
    return displayMember?.user?.fullName || displayMember?.user?.name || "Direct Chat";
  };

  // Rooms filtering logic based on selected Tab filter
  const filteredRooms = rooms.filter((room) => {
    const label = getRoomLabel(room, currentUserId);
    if (activeTab === "Parent" && label !== "PARENT") return false;
    if (activeTab === "Coach" && label !== "COACH") return false;
    if (activeTab === "Admin" && label !== "ADMIN") return false;
    if (activeTab === "Team" && label !== "TEAM") return false;
    if (activeTab === "Class" && label !== "CLASS") return false;
    if (activeTab === "League" && label !== "LEAGUE") return false;
    if (activeTab === "Event" && label !== "EVENT") return false;
    const roomName = getRoomName(room);
    const searchable = [roomName, getRoomContext(room), room.name, room.scopeLabel]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return !searchTerm.trim() || searchable.includes(searchTerm.trim().toLowerCase());
  });

  return (
    <div
      className="w-full md:w-[340px] border-r border-gray-200 dark:border-gray-800 flex flex-col h-full shrink-0 bg-white dark:bg-slate-900"
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col gap-3">
        <div className="flex justify-between items-center gap-3">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm tracking-wide">Conversations</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Parents, coaches, classes and events</p>
          </div>
          {onStartChatModalOpen && (
            <button
              type="button"
              onClick={onStartChatModalOpen}
              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-blue-700"
              title="Start a direct conversation"
            >
              <span className="text-sm leading-none">+</span>
              New chat
            </button>
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search person, class, team or event..."
            className="w-full text-xs py-2 pl-3 pr-8 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 text-slate-800 dark:text-slate-200 rounded-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="grid grid-cols-4 gap-1.5 px-3 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900">
        {([
          { id: "All", label: "All", count: rooms.length },
          { id: "Parent", label: "Parents", count: rooms.filter(r => getRoomLabel(r, currentUserId) === "PARENT").length },
          { id: "Coach", label: "Coaches", count: rooms.filter(r => getRoomLabel(r, currentUserId) === "COACH").length },
          { id: "Admin", label: "Admins", count: rooms.filter(r => getRoomLabel(r, currentUserId) === "ADMIN").length },
          { id: "Team", label: "Teams", count: rooms.filter(r => getRoomLabel(r, currentUserId) === "TEAM").length },
          { id: "Class", label: "Classes", count: rooms.filter(r => getRoomLabel(r, currentUserId) === "CLASS").length },
          { id: "League", label: "Leagues", count: rooms.filter(r => getRoomLabel(r, currentUserId) === "LEAGUE").length },
          { id: "Event", label: "Holiday / Event", count: rooms.filter(r => getRoomLabel(r, currentUserId) === "EVENT").length },
        ] as const).map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`min-w-0 px-2 py-1.5 text-[10px] font-bold rounded-md transition-all flex items-center justify-between gap-1 ${activeTab === id
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
              }`}
          >
            <span className="truncate">{label}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 ${activeTab === id ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto chat-scrollbar min-h-0 divide-y divide-gray-200/60 dark:divide-slate-800/40">
        {filteredRooms.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 leading-relaxed">
            No active conversations in this filter.
          </div>
        ) : (
          filteredRooms.map((room) => {
            const isBroadcast = room.type === "BROADCAST";
            const name = getRoomName(room);
            const context = getRoomContext(room);
            const isActive = room._id === activeRoomId;
            const label = getRoomLabel(room, currentUserId);
            const primaryMember = room.members?.find((member) => {
              const memberUserId = member.user?._id || (member.user as any)?.id || member.user;
              return memberUserId && memberUserId.toString() !== currentUserId.toString();
            });
            const avatarUrl = primaryMember?.user?.profileImage
              ? getMediaUrl(primaryMember.user.profileImage, getMediaFallback(name))
              : getMediaFallback(name);

            const lastMsgText =
              room.lastMessage?.text ||
              (room.lastMessage?.attachments?.length ? "📎 Attachment" : "No messages yet");
            const lastMessageTime = room.lastMessage?.createdAt || room.lastMessage?.timestamp;
            const timeStr = lastMessageTime
              ? new Date(lastMessageTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
              : "";

            // Render category Badge
            let badgeEl = null;
            if (label === "PARENT") {
              badgeEl = (
                <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-xs bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                  Parent
                </span>
              );
            } else if (label === "COACH") {
              badgeEl = (
                <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-xs bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20">
                  Coach
                </span>
              );
            } else if (label === "ADMIN") {
              badgeEl = (
                <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-xs bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/20">
                  Admin
                </span>
              );
            } else if (label === "TEAM") {
              badgeEl = (
                <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-xs bg-green-50 text-green-600 border border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20">
                  Team
                </span>
              );
            } else if (label === "CLASS") {
              badgeEl = (
                <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-xs bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                  Class
                </span>
              );
            } else if (label === "LEAGUE") {
              badgeEl = (
                <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-xs bg-cyan-50 text-cyan-700 border border-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/20">
                  League
                </span>
              );
            } else if (label === "EVENT") {
              badgeEl = (
                <span className="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-xs bg-orange-50 text-orange-600 border border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20">
                  Event day
                </span>
              );
            }

            return (
              <div
                key={room._id}
                onClick={() => onSelectRoom(room._id)}
                className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all duration-150 relative ${isActive
                    ? "bg-blue-500/10 border-l-4 border-blue-500"
                    : "hover:bg-gray-50 dark:hover:bg-slate-800/40 border-l-4 border-transparent"
                  }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={avatarUrl}
                    alt={`${name} avatar`}
                    className={`w-10 h-10 rounded-full object-cover border-2 ${isBroadcast ? "border-amber-300" : "border-blue-100"}`}
                    onError={(event) => { event.currentTarget.src = getMediaFallback(name); }}
                  />
                  {room.isPartnerOnline && !isBroadcast && (
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 absolute bottom-0 right-0 animate-pulse"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate block">
                      {name}
                    </span>
                    {badgeEl}
                    <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded border ${room.status === "ARCHIVED"
                      ? "bg-slate-100 text-slate-500 border-slate-200"
                      : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      }`}>
                      {room.status === "ARCHIVED" ? "Archived" : "Active"}
                    </span>
                  </div>
                  {context && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mb-1" title={context}>{context}</p>
                  )}
                  <div className="mb-1">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                      {lastMsgText}
                    </p>
                  </div>
                  {!isBroadcast && (
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${room.isPartnerOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-slate-700"}`} />
                      <span className="text-[9px] text-slate-400 font-medium">
                        {room.isPartnerOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0 ml-1.5">
                  {timeStr && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                      {timeStr}
                    </span>
                  )}
                  {room.unreadCount > 0 ? (
                    <UnreadBadge count={room.unreadCount} />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default ChatSidebar;
