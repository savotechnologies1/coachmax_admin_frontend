import React, { useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  Message,
  setMessages,
  setLoadingMessages,
  addPendingMessage,
  removePendingMessage,
  markPendingMessageFailed,
  setActiveRoomId,
} from "../../store/slices/chatSlice";
import { chatApi, isCoachOrAdmin } from "../../services/chatApi";
import { socketService } from "../../services/socketService";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { TypingIndicator } from "../../components/chat/TypingIndicator";
import { ChatHeader } from "../../components/chat/ChatHeader";
import { toast } from "react-hot-toast";
import { normalizeUploadImage, validateUploadFile } from "../../utils/fileValidation";

interface ChatWindowProps {
  roomId: string;
  onClose?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ roomId, onClose }) => {
  const dispatch = useAppDispatch();
  const messages = useAppSelector((state) => state.chat.messages);
  const loading = useAppSelector((state) => state.chat.loadingMessages);
  const rooms = useAppSelector((state) => state.chat.rooms);
  const user = useAppSelector((state) => state.auth.user);
  const typingStatus = useAppSelector((state) => state.chat.typingStatus[roomId]);

  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const room = rooms.find((r) => r._id === roomId);

  const getPartnerMember = () => {
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

    const partnerMember = room?.members?.find((m) => {
      const memberUserId = m.user?._id || (m.user as any)?.id || m.user;
      return memberUserId && memberUserId.toString() !== currentUserId.toString();
    });

    return partnerMember || room?.members?.find((m) => m.user);
  };

  const partner = getPartnerMember();

  const getRoomTitle = () => {
    if (room?.type === "BROADCAST") return room.name || "Class Broadcast";

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

    const isCurrentUserMember = room?.members?.some((m) => {
      const memberUserId = m.user?._id || (m.user as any)?.id || m.user;
      return memberUserId && memberUserId.toString() === currentUserId.toString();
    });

    if (!isCurrentUserMember && room?.type === "DIRECT") {
      const names = room?.members
        ?.map((m) => m.user?.fullName || m.user?.name)
        .filter(Boolean);
      if (names && names.length > 0) {
        return names.join(" & ");
      }
    }

    return partner?.user?.fullName || partner?.user?.name || "Direct Chat";
  };

  const roomTitle = getRoomTitle();
  const partnerSubtitle = room?.isPartnerOnline ? "🟢 Online now" : "Offline";
  const partnerAccountRole = String((partner?.user as any)?.role || "").toUpperCase();
  const partnerRole = room?.type === "BROADCAST"
    ? (room.eventId || room.eventSessionDate ? "Event Day" : room.leagueId ? "League Chat" : room.teamId ? "Team Chat" : "Class Chat")
    : partnerAccountRole === "SUPER_ADMIN" ? "Super Admin"
      : partnerAccountRole === "ADMIN" ? "Admin"
        : partnerAccountRole === "COACH" ? "Coach"
          : partner?.refModel || "User";
  const roomContext = room?.type === "BROADCAST"
    ? [
        room.context?.className || (room.classId && typeof room.classId === "object" ? room.classId.name : ""),
        room.context?.teamName || (room.teamId && typeof room.teamId === "object" ? (room.teamId.teamName || (room.teamId as any).name) : ""),
        room.context?.eventTitle || (room.eventId && typeof room.eventId === "object" ? (room.eventId.title || (room.eventId as any).name) : ""),
        room.eventSessionDate,
        room.context?.programName,
        room.context?.termName,
        room.context?.dayOfWeek,
        room.context?.startTime && room.context?.endTime ? `${room.context.startTime}–${room.context.endTime}` : room.context?.startTime,
      ].filter(Boolean).join(" · ") || room?.scopeLabel || room?.name || "Broadcast"
    : undefined;
  const partnerProfileImage = partner?.user?.profileImage;

  // Fetch messages when roomId changes
  useEffect(() => {
    const loadMessages = async () => {
      dispatch(setLoadingMessages(true));
      try {
        const res = await chatApi.getRoomMessages(roomId);
        if (res.success && res.data) {
          dispatch(setMessages(res.data));
        } else {
          dispatch(setMessages([]));
        }
      } catch (err: any) {
        console.error("Failed to load messages:", err);
        toast.error("Failed to fetch messages.");
      } finally {
        dispatch(setLoadingMessages(false));
      }
    };

    loadMessages();

    // Join room in socket
    socketService.joinRoom(roomId);
    socketService.markRead(roomId);
  }, [roomId, dispatch]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 50);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 150);
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, [roomId]);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, typingStatus]);

  useEffect(() => {
    const handleImageLoad = () => {
      scrollToBottom("smooth");
    };
    document.addEventListener("chat-image-loaded", handleImageLoad);
    return () => {
      document.removeEventListener("chat-image-loaded", handleImageLoad);
    };
  }, []);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Emit socket typing event
    socketService.sendTyping(roomId, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketService.sendTyping(roomId, false);
    }, 2000);
  };

  const handleSend = async (textToSend?: string, pendingIdToRetry?: string, fileToRetry?: File | null) => {
    const text = textToSend !== undefined ? textToSend : inputText.trim();
    const file = fileToRetry !== undefined ? fileToRetry : selectedFile;
    if (!text && !file) return;

    // Create a local pending message object
    const pendingMsgId = pendingIdToRetry || `pending-${Date.now()}`;
    const myId = user?.id || user?._id || "me";

    let fileTypeEnum: "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | null = null;
    let localUrl = "";
    if (file) {
      const mime = file.type.toLowerCase();
      if (mime.startsWith("image/")) {
        fileTypeEnum = "IMAGE";
      } else if (mime.startsWith("video/")) {
        fileTypeEnum = "VIDEO";
      } else if (mime.startsWith("audio/")) {
        fileTypeEnum = "AUDIO";
      } else {
        fileTypeEnum = "FILE";
      }
      localUrl = URL.createObjectURL(file);
    }

    const pendingMsg: Message = {
      _id: pendingMsgId,
      roomId,
      text,
      sender: {
        user: { _id: myId, fullName: user?.fullName || user?.name || "Me" },
        refModel: isCoachOrAdmin() ? "Admin" : "Parent",
      },
      tickStatus: "SENT",
      createdAt: new Date().toISOString(),
      attachments: file
        ? [
          {
            url: localUrl,
            fileType: fileTypeEnum!,
            fileName: file.name,
          },
        ]
        : [],
      isPending: true,
    };

    // Add local pending message to store (if not a retry)
    if (!pendingIdToRetry) {
      dispatch(addPendingMessage(pendingMsg));
      setInputText("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    // Send through HTTP REST API (handles file uploads via multipart/form-data)
    try {
      const res = await chatApi.sendMessage(roomId, text, file, fileTypeEnum);
      if (res.success) {
        dispatch(removePendingMessage(pendingMsgId));
        // Refresh messages log
        const updated = await chatApi.getRoomMessages(roomId);
        if (updated.success && updated.data) {
          dispatch(setMessages(updated.data));
        }
      } else {
        dispatch(markPendingMessageFailed(pendingMsgId));
        toast.error(res.message || "Failed to send message.");
      }
    } catch (err: any) {
      dispatch(markPendingMessageFailed(pendingMsgId));
      toast.error("Failed to send message. Please retry.");
    }
  };

  const handleRetry = (msg: Message) => {
    // Remove failed tag
    dispatch(removePendingMessage(msg._id));
    handleSend(msg.text, msg._id, null);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      const isVideo = file.type.toLowerCase().startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
      const policy = isVideo ? "chatVideo" : "chatImage";
      if (!isVideo) {
        try { file = await normalizeUploadImage(file); } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Could not convert this image."); e.target.value = ""; return; }
      }
      const validationError = await validateUploadFile(file, policy);
      if (validationError) {
        toast.error(validationError);
        e.target.value = "";
        return;
      }
      setSelectedFile(file);
      toast.success(`File attached: ${file.name}`);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-gray-900 overflow-hidden h-full">
      {/* Header */}
      <ChatHeader
        title={roomTitle}
        subtitle={partnerSubtitle}
        roleText={partnerRole}
        isOnline={room?.isPartnerOnline}
        profileImage={partnerProfileImage}
        contextLabel={roomContext}
        onBack={onClose || (() => dispatch(setActiveRoomId("")))}
      />

      {/* Messages log */}
      <div className="flex-1 overflow-y-auto chat-scrollbar p-4 flex flex-col space-y-4 min-h-0 bg-[#eff6ff] dark:bg-slate-950">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
            <span className="animate-spin mr-2">🌀</span> Loading conversation messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 max-w-sm mx-auto text-center gap-2">
            <div className="text-3xl">💬</div>
            <h5 className="font-semibold text-slate-350">No Messages</h5>
            <p className="text-xs">Send a text below to initiate the chat.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const senderObj = typeof msg.sender?.user === "string" ? { _id: msg.sender.user } : msg.sender?.user;
            const senderId = senderObj?._id || "";
            const isSelf = senderId === user?.id || senderId === user?._id;
            const senderName = senderObj?.fullName || senderObj?.name || "User";

            return (
              <MessageBubble
                key={msg._id}
                message={msg}
                isSelf={isSelf}
                senderName={senderName}
                onRetry={handleRetry}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Live Typing Indicator */}
      <TypingIndicator userName={typingStatus?.isTyping ? typingStatus.userName : undefined} />

      {/* Input Box */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center gap-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.mp4,.webm,.mov,image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif,video/mp4,video/webm,video/quicktime"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-none border border-gray-200 dark:border-slate-700/50 transition-colors"
          title="Attach File"
        >
          📎
        </button>

        {selectedFile && (
          <div className="text-xs bg-gray-50 border border-gray-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-none px-2 py-1 max-w-[120px] truncate">
            {selectedFile.name}
            <button
              onClick={() => setSelectedFile(null)}
              className="ml-1.5 text-red-400 font-bold hover:text-red-300"
            >
              ✕
            </button>
          </div>
        )}

        <input
          type="text"
          value={inputText}
          onChange={handleTyping}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Type your message here..."
          className="flex-1 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 text-slate-800 dark:text-slate-200 rounded-none px-4 py-2.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <button
          onClick={() => handleSend()}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-none transition-colors shrink-0 shadow-lg flex items-center justify-center"
          title="Send message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
export default ChatWindow;
