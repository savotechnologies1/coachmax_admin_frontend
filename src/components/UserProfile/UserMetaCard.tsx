import { useProfile } from "../../hooks/useAuth";
import { getMediaUrl, getMediaFallback } from "../../utils/media";

export default function UserMetaCard() {
  const { data: profileData } = useProfile();

  const user = profileData?.data;
  const displayName = user?.name || "Super Admin";
  const displayRole = user?.role || "Admin";
  const avatarSrc = getMediaUrl(user?.profileImage, getMediaFallback(displayName));

  return (
    <div className="p-5 border border-gray-200 rounded-none dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
          <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
            <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getMediaFallback(displayName); }} />
          </div>
          <div>
            <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
              {displayName}
            </h4>
            <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {displayRole}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
