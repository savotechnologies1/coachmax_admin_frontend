import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { MessageCircle, MessagesSquare, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../store";
import { setActiveRoomId, setRooms } from "../../store/slices/chatSlice";
import { ChatWindow } from "../../pages/Communication/ChatWindow";

interface ChatActionButtonProps {
  contextLabel: string;
  ensureRoom: () => Promise<any>;
  buttonText?: string;
  className?: string;
  title?: string;
}

/** A single entry point for a contextual conversation: quick popup or full chat page. */
const ChatActionButton: React.FC<ChatActionButtonProps> = ({
  contextLabel,
  ensureRoom,
  buttonText = "Chat",
  className = "",
  title,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const rooms = useAppSelector((state) => state.chat.rooms);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [quickRoomId, setQuickRoomId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const selectOption = async (option: "quick" | "window") => {
    try {
      setOpening(true);
      const response = await ensureRoom();
      const body = response?.data?.success !== undefined ? response.data : response;
      const room = body?.data?.room || body?.data || body?.room;
      if (!body?.success || !room?._id) {
        throw new Error(body?.message || `Unable to open ${contextLabel} chat.`);
      }

      dispatch(setRooms([...rooms.filter((item) => item._id !== room._id), room]));
      setChoiceOpen(false);
      if (option === "quick") {
        setQuickRoomId(room._id);
        return;
      }

      dispatch(setActiveRoomId(room._id));
      const userRole = (() => {
        try { return String(JSON.parse(localStorage.getItem("user") || "{}").role || "").toUpperCase(); }
        catch { return ""; }
      })();
      const path = userRole === "COACH" ? "/messages" : "/communication";
      navigate(`${path}?roomId=${encodeURIComponent(room._id)}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || `Unable to open ${contextLabel} chat.`);
    } finally {
      setOpening(false);
    }
  };

  return (
    <>
      <button
        type="button"
        title={title || `${contextLabel} chat`}
        aria-label={`${contextLabel} chat options`}
        onClick={(event) => { event.stopPropagation(); setChoiceOpen(true); }}
        className={className || "inline-flex items-center gap-1.5 rounded border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-[#0047FF] transition-colors hover:bg-blue-100"}
      >
        <MessageCircle size={14} />
        {buttonText}
      </button>

      {choiceOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/45 p-4" role="presentation" onMouseDown={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) setChoiceOpen(false); }}>
          <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="chat-action-title">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="chat-action-title" className="text-base font-bold text-slate-900 dark:text-white">{contextLabel} chat</h2>
                <p className="mt-1 text-xs text-slate-500">Choose how you want to open this conversation.</p>
              </div>
              <button type="button" onClick={() => setChoiceOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-2">
              <button type="button" disabled={opening} onClick={() => void selectOption("quick")} className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-left transition hover:border-blue-400 hover:bg-blue-100 disabled:opacity-60 dark:border-blue-900 dark:bg-blue-950/30 dark:hover:bg-blue-950/60">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white"><MessageCircle size={17} /></span>
                <span><span className="block text-sm font-bold text-slate-900 dark:text-white">Quick chat</span><span className="mt-0.5 block text-xs text-slate-500">Open only this conversation in a popup.</span></span>
              </button>
              <button type="button" disabled={opening} onClick={() => void selectOption("window")} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><MessagesSquare size={17} /></span>
                <span><span className="block text-sm font-bold text-slate-900 dark:text-white">Open chat window</span><span className="mt-0.5 block text-xs text-slate-500">Go to Communication with this chat selected.</span></span>
              </button>
            </div>
            {opening && <p className="mt-3 text-center text-xs font-medium text-slate-500">Opening conversation…</p>}
          </section>
        </div>,
        document.body
      )}

      {quickRoomId && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) setQuickRoomId(null); }}>
          <section className="flex h-[min(82vh,760px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true" aria-label={`${contextLabel} quick chat`}>
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
              <div className="flex items-center gap-2"><MessageCircle size={16} className="text-blue-600" /><span className="text-sm font-bold text-slate-800 dark:text-white">Quick chat · {contextLabel}</span></div>
              <button type="button" onClick={() => setQuickRoomId(null)} aria-label="Close quick chat" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><X size={18} /></button>
            </div>
            <div className="flex min-h-0 flex-1"><ChatWindow key={quickRoomId} roomId={quickRoomId} onClose={() => setQuickRoomId(null)} /></div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
};

export default ChatActionButton;
