import { useEffect } from "react";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet, useNavigate, useLocation } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import { useAppDispatch, useAppSelector } from "../store";
import { syncAuth } from "../store/slices/authSlice";
import { socketService } from "../services/socketService";

const LayoutContent: React.FC = () => {
  const { isExpanded, isMobileOpen } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);

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
          <Outlet />
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
