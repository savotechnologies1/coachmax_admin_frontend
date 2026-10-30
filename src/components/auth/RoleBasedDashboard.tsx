import React from "react";
import Home from "../../pages/Dashboard/Home";
import CoachDashboard from "../../pages/Dashboard/CoachDashboard";
import { useCoachAccess } from "../../hooks/useCoachAccess";

const RoleBasedDashboard: React.FC = () => {
  const { isFull } = useCoachAccess();
  const userStr = localStorage.getItem("user");
  let user = null;

  try {
    if (userStr) {
      user = JSON.parse(userStr);
    }
  } catch (error) {
    console.error("Failed to parse user from local storage", error);
  }

  if (["SUPER_ADMIN", "ADMIN"].includes(user?.role) || isFull) {
    return <Home />;
  }

  // Default to Coach Dashboard for "COACH" or fallback
  return <CoachDashboard />;
};

export default RoleBasedDashboard;
