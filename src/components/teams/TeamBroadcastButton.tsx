import React from "react";
import { chatApi } from "../../services/chatApi";
import ChatActionButton from "../chat/ChatActionButton";

interface TeamBroadcastButtonProps {
  teamId: string;
  teamName?: string;
  className?: string;
}

/** Team-scoped chat entry: popup or the full Communication window. */
const TeamBroadcastButton: React.FC<TeamBroadcastButtonProps> = ({ teamId, teamName = "Team", className = "" }) => (
  <ChatActionButton
    contextLabel={teamName}
    buttonText="Team Chat"
    className={className}
    ensureRoom={() => chatApi.openTeamChat(teamId)}
  />
);

export default TeamBroadcastButton;
