export const useLeaguePermissions = () => {
  let user: any = null;
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      user = JSON.parse(userStr);
    }
  } catch (e) {
    console.error("Failed to parse user", e);
  }

  const role = user?.role || "SUPER_ADMIN";
  const isCoach = role === "COACH";
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

  return {
    role,
    isSuperAdmin,
    isCoach,
    canEdit: !isCoach,
    canManageMatches: !isCoach,
    canManageTeams: !isCoach,
    canEnterResults: !isCoach,
    canDelete: isSuperAdmin,
  };
};
