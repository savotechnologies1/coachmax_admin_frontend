import React from "react";
import { useAppDispatch } from "../../store";
import { useLocation } from "react-router";
import { ChatList } from "./ChatList";
import { BroadcastList } from "./BroadcastList";
import { BroadcastComposer } from "./BroadcastComposer";
import { setAnnouncements } from "../../store/slices/broadcastSlice";
import { broadcastApi } from "../../services/broadcastApi";
import PageMeta from "../../components/common/PageMeta";
import { isCoachOrAdmin } from "../../services/chatApi";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";

export const CommunicationPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();

  const isBroadcastRoute = location.pathname === "/announcements";

  const refreshAnnouncements = async () => {
    try {
      const activeClassId = (await broadcastApi.getBroadcastRooms()).data?.[0]?._id;
      if (activeClassId) {
        const res = await broadcastApi.getBroadcastMessages(activeClassId);
        if (res.success && res.data) {
          dispatch(
            setAnnouncements(
              res.data.map((msg: any) => ({
                _id: msg._id,
                classId: activeClassId,
                text: msg.text,
                sender: msg.sender?.user || { fullName: "Coach" },
                createdAt: msg.createdAt,
              }))
            )
          );
        }
      }
    } catch (e) {
      console.error("Error refreshing announcements:", e);
    }
  };

  return (
    <>
      <PageMeta
        title={
          isBroadcastRoute
            ? "Announcements Broadcast | CoachMax"
            : "Direct & Group Messages | CoachMax"
        }
        description="Live chat and announcement broadcasting dashboard."
      />

      <div className="w-full h-full text-slate-100">
        {isBroadcastRoute ? (
          <div className="w-full">
            <PageBreadcrumb 
              pageTitle="Class Broadcast Announcements" 
              items={[{ name: "Communication", path: "/communication" }]} 
            />
            <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
              {isCoachOrAdmin() && (
                <BroadcastComposer onSuccess={refreshAnnouncements} />
              )}
              <BroadcastList />
            </div>
          </div>
        ) : (
          <ChatList />
        )}
      </div>
    </>
  );
};
export default CommunicationPage;
