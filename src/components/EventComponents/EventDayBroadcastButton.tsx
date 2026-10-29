import React from "react";
import { chatApi } from "../../services/chatApi";
import ChatActionButton from "../chat/ChatActionButton";

interface EventDayBroadcastButtonProps {
  eventId: string;
  sessionDate: string;
  campSessionId?: string;
  dayLabel?: string;
  className?: string;
}

/** Event-day group chat entry, scoped to the selected date and optional session. */
const EventDayBroadcastButton: React.FC<EventDayBroadcastButtonProps> = ({
  eventId,
  sessionDate,
  campSessionId,
  dayLabel = sessionDate,
  className = "",
}) => (
  <ChatActionButton
    contextLabel={`Holiday camp · ${dayLabel}`}
    buttonText="Day chat"
    className={className}
    title={`Chat with parents registered for ${dayLabel}`}
    ensureRoom={() => chatApi.openEventDayChat(eventId, {
      sessionDate,
      ...(campSessionId ? { campSessionId } : {}),
    })}
  />
);

export default EventDayBroadcastButton;
