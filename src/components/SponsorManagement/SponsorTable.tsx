// src/components/SponsorManagement/SponsorTable.tsx
import React from "react";
import {
 Table,
 TableBody,
 TableCell,
 TableHeader,
 TableRow,
} from "../ui/table";
import { MoreVertical } from "lucide-react";
import { Sponsor, deleteSponsor, toggleBannerStatus } from "../../api/sponsorApi";
import toast from "react-hot-toast";
import ConfirmDeleteModal from "../ui/modal/ConfirmDeleteModal";
import SponsorDetailsModal from "./SponsorDetailsModal";
import { getMediaUrl, MEDIA_PLACEHOLDER } from "../../utils/media";

interface SponsorTableProps {
 sponsors: Sponsor[];
 loading: boolean;
 onEdit: (sponsor: Sponsor) => void;
 onRefresh: () => void;
}

const SponsorTable: React.FC<SponsorTableProps> = ({ sponsors, loading, onEdit, onRefresh }) => {
 const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
 const [deleteModalId, setDeleteModalId] = React.useState<string | null>(null);
 const [isDeleting, setIsDeleting] = React.useState(false);
 const [viewingSponsor, setViewingSponsor] = React.useState<Sponsor | null>(null);

 const handleDeleteClick = (id: string) => {
  setDeleteModalId(id);
  setOpenMenuId(null);
 };

 const confirmDelete = async () => {
  if (!deleteModalId) return;
  setIsDeleting(true);
  try {
   await deleteSponsor(deleteModalId);
   toast.success("Sponsor deleted successfully!");
   onRefresh();
  } catch (err) {
   console.error("Error deleting sponsor:", err);
   toast.error("Failed to delete sponsor.");
  } finally {
   setIsDeleting(false);
   setDeleteModalId(null);
  }
 };


 const handleToggleStatus = async (id: string) => {
  try {
   await toggleBannerStatus(id);
   toast.success("Status updated!");
   onRefresh();
  } catch (err) {
   console.error("Error toggling status:", err);
   toast.error("Failed to toggle status.");
  }
 };

 return (
  <>
    <Table>
     <TableHeader>
      <TableRow>
       <TableCell isHeader className="px-5">Banner</TableCell>
       <TableCell isHeader className="px-5">Title & Subtitle</TableCell>
       <TableCell isHeader className="px-5">Target Link</TableCell>
       <TableCell isHeader className="px-5">Status</TableCell>
       <TableCell isHeader className="px-5">Action</TableCell>
      </TableRow>
     </TableHeader>
     <TableBody>
      {loading ? (
       <TableRow>
        <TableCell colSpan={5} className="py-20 text-center">
         <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent align-[-0.125em]" />
        </TableCell>
       </TableRow>
      ) : sponsors.length > 0 ? (
       sponsors.map((sponsor) => (
        <TableRow 
          key={sponsor._id}
          onClick={() => setViewingSponsor(sponsor)}
          className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
        >
         <TableCell className="px-5">
          <img
           src={getMediaUrl(sponsor.image, MEDIA_PLACEHOLDER)}
           alt={sponsor.title}
           className="h-12 w-24 object-cover rounded-none border border-gray-100 dark:border-white/10 shadow-sm"
           onError={(e) => {
            (e.target as HTMLImageElement).src = MEDIA_PLACEHOLDER;
           }}
          />
         </TableCell>
         <TableCell className="px-5">
          <div className="flex flex-col">
           <span className="font-bold text-gray-800 text-sm dark:text-white/90  tracking-tighter">
            {sponsor.title}
           </span>
           <span className="text-[10px] font-bold text-brand-500 ">
            {sponsor.subtitle}
           </span>
          </div>
         </TableCell>
         <TableCell className="px-5">
          <a
           href={sponsor.link}
           target="_blank"
           rel="noopener noreferrer"
           onClick={(e) => e.stopPropagation()}
           className="text-xs font-medium text-blue-500 hover:underline truncate max-w-[150px] block font-mono"
          >
           {sponsor.link}
          </a>
         </TableCell>
         <TableCell className="px-5">
          <div className="flex items-center gap-2">
           <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStatus(sponsor._id);
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${(sponsor.isActive === "active" || sponsor.isActive === "Active" || sponsor.isActive === true)
             ? "bg-success-500"
             : "bg-gray-200 dark:bg-gray-700"
             }`}
           >
            <span
             className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${(sponsor.isActive === "active" || sponsor.isActive === "Active" || sponsor.isActive === true)
              ? "translate-x-5"
              : "translate-x-1"
              }`}
            />
           </button>
           <span className={`text-[9px] font-bold  ${(sponsor.isActive === "active" || sponsor.isActive === "Active" || sponsor.isActive === true)
            ? "text-success-600"
            : "text-gray-400 font-bold"
            }`}>
            {(sponsor.isActive === "active" || sponsor.isActive === "Active" || sponsor.isActive === true) ? "Active" : "Deactive"}
           </span>
          </div>
         </TableCell>
         <TableCell className="px-5 text-center relative">
          <div className="flex items-center justify-center" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
           <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(openMenuId === sponsor._id ? null : sponsor._id);
            }}
            className="inline-flex items-center justify-center w-7 h-7 bg-white border border-slate-200 hover:bg-slate-50 text-slate-400 transition-colors shadow-sm"
           >
            <MoreVertical size={16} />
           </button>
          </div>

          {openMenuId === sponsor._id && (
            <div className="absolute right-12 top-1/2 -translate-y-1/2 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 py-1.5 overflow-hidden">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(null);
                  setViewingSponsor(sponsor);
                }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                View Details
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(null);
                  onEdit(sponsor);
                }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-[#0047FF] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700 mt-1 pt-1.5"
              >
                Edit
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(null);
                  handleDeleteClick(sponsor._id);
                }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-t border-slate-100 dark:border-slate-700 mt-1 pt-2"
              >
                Delete
              </button>
            </div>
          )}
         </TableCell>
        </TableRow>
       ))
      ) : (
       <TableRow>
        <TableCell colSpan={5} className="px-5 py-16 text-center text-gray-400 font-bold  text-[10px]">
         No sponsors found.
        </TableCell>
       </TableRow>
      )}
     </TableBody>
    </Table>
    <ConfirmDeleteModal
    isOpen={!!deleteModalId}
    onClose={() => setDeleteModalId(null)}
    onConfirm={confirmDelete}
    loading={isDeleting}
    title="Delete Sponsor"
    message="Are you sure you want to delete this sponsor? This action cannot be undone."
   />
   <SponsorDetailsModal
    isOpen={!!viewingSponsor}
    onClose={() => setViewingSponsor(null)}
    sponsor={viewingSponsor}
   />
   </>
  );
};

export default SponsorTable;
