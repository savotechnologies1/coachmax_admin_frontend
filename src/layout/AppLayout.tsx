import { useEffect } from "react";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useNavigate, useLocation } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import { useAppDispatch, useAppSelector } from "../store";
import { syncAuth } from "../store/slices/authSlice";
import { socketService } from "../services/socketService";
import { requiredPageAccess, useCoachAccess } from "../hooks/useCoachAccess";

const LayoutContent: React.FC = () => {
  const { isExpanded, isMobileOpen } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const coachAccess = useCoachAccess();
  const pageAccess = requiredPageAccess(location.pathname);
  const pageAllowed = coachAccess.role !== "COACH" || coachAccess.isFull || !pageAccess || coachAccess.can(pageAccess.module, pageAccess.action);

  const isEdgeToEdge = ["/communication", "/messages", "/announcements"].includes(location.pathname);

  useEffect(() => {
    dispatch(syncAuth());
  }, [dispatch]);

  useEffect(() => {
    if (token) {
      socketService.connect(token);
    } else {
      socketService.disconnect();
    }
  }, [token]);

  useEffect(() => {
    const localToken = localStorage.getItem("token");
    if (!localToken) {
      navigate("/signin");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col w-full min-w-0 overflow-x-hidden">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${isExpanded
          ? "lg:ml-[240px] 2xl:ml-[290px]"
          : "lg:ml-[80px] xl:ml-[90px]"
          } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div className={isEdgeToEdge ? "w-full h-[calc(100vh-76px)] overflow-hidden" : "p-4 w-full md:p-6"}>
          {coachAccess.role === "COACH" && coachAccess.isLoading ? (
            <div className="p-8 text-sm text-slate-500">Loading your access…</div>
          ) : pageAllowed ? <Outlet /> : (
            <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              <h1 className="text-lg font-bold">Access not enabled</h1>
              <p className="mt-2">Ask an administrator to enable this section in Coach Manage.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
