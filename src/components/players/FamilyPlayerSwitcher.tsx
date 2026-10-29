import { useNavigate } from "react-router";
import { Users } from "lucide-react";

type Child = { _id: string; fullName?: string; profileImage?: string | null; playerStatus?: string | null };

export default function FamilyPlayerSwitcher({ children, selectedId }: { children: Child[]; selectedId: string }) {
  const navigate = useNavigate();
  if (children.length < 2) return null;

  return <div className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 bg-white px-4 py-2.5">
    <div className="flex items-center gap-2 text-sm font-semibold text-[#07194f]"><Users size={16} className="text-blue-600" /> Children in this family</div>
    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">Viewing
      <select value={String(selectedId)} onChange={(event) => navigate(`/player/${event.target.value}`)} className="min-w-44 border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-blue-600">
        {children.map((child) => <option key={child._id} value={String(child._id)}>{child.fullName || "Player"}</option>)}
      </select>
    </label>
  </div>;
}
