import { formatDateTime } from "../../utils/dateTime";
import React, { useState } from "react";
import { Modal } from "../ui/modal";
import { Sponsor } from "../../api/sponsorApi";
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Calendar, 
  User, 
  Globe, 
  Info,
  CheckCircle,
  XCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { getMediaUrl, MEDIA_PLACEHOLDER } from "../../utils/media";

interface SponsorDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sponsor: Sponsor | null;
}

const SponsorDetailsModal: React.FC<SponsorDetailsModalProps> = ({ isOpen, onClose, sponsor }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!sponsor) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success(`${fieldName} copied to clipboard!`);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      return formatDateTime(dateStr);
    } catch (e) {
      return dateStr;
    }
  };

  const isActive = sponsor.isActive === "active" || sponsor.isActive === "Active" || sponsor.isActive === true;
  const imageSrc = getMediaUrl(sponsor?.image);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl">
      {/* Header with gradient */}
      <div className="bg-[#031549] text-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
              Elite Partnership Details
            </span>
            <h3 className="text-lg font-bold tracking-tight mt-0.5 text-white">
              {sponsor.title}
            </h3>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900">
        {/* Banner Preview */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
            Banner Preview
          </span>
          <div className="relative group overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-center p-6 rounded-none">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={sponsor.title}
                className="max-h-48 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = MEDIA_PLACEHOLDER;
                }}
              />
            ) : (
              <div className="py-12 text-slate-400 text-xs font-semibold">No Banner Image available</div>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title & Subtitle Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-3 rounded-none">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <Info size={12} className="text-slate-400" />
                <span>Partner Info</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="text-sm font-bold text-slate-800 dark:text-white/90">
                  {sponsor.title}
                </div>
                <div className="text-xs text-brand-500 font-semibold">
                  {sponsor.subtitle || "No subtitle/offer"}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Status
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                  isActive 
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                }`}>
                  {isActive ? (
                    <CheckCircle size={10} className="text-emerald-500 animate-pulse" />
                  ) : (
                    <XCircle size={10} className="text-slate-400" />
                  )}
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {/* Links & IDs Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-3 rounded-none">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <Globe size={12} className="text-slate-400" />
                <span>Destination</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-2 text-xs rounded-none">
                <span className="truncate text-slate-600 dark:text-slate-300 font-mono flex-1">
                  {sponsor.link}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyToClipboard(sponsor.link, "Target URL")}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title="Copy Link"
                  >
                    {copiedField === "Target URL" ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                  <a
                    href={sponsor.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
                    title="Open Link"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Partner ID
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] max-w-[120px] truncate">
                    {sponsor._id}
                  </span>
                  <button
                    onClick={() => copyToClipboard(sponsor._id, "Partner ID")}
                    className="p-0.5 hover:text-slate-600 dark:hover:text-slate-300 text-slate-400 transition-colors"
                    title="Copy ID"
                  >
                    {copiedField === "Partner ID" ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Details */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-3">
            System Information
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2.5 p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-slate-800/40 rounded-none">
              <User size={14} className="text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">Created By</span>
                {sponsor.createdBy ? (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 truncate max-w-[80px]" title={sponsor.createdBy}>
                      {sponsor.createdBy}
                    </span>
                    <button
                      onClick={() => copyToClipboard(sponsor.createdBy || "", "Creator ID")}
                      className="text-slate-400 hover:text-slate-600 p-0.5 transition-colors"
                      title="Copy Creator ID"
                    >
                      {copiedField === "Creator ID" ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 mt-1 block">N/A</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-slate-800/40 rounded-none">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">Created At</span>
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 block mt-1">
                  {formatDate(sponsor.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-slate-800/40 rounded-none">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">Updated At</span>
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 block mt-1">
                  {formatDate(sponsor.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 dark:bg-slate-900/60 px-6 py-4 border-t border-slate-150 dark:border-slate-800/80 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

export default SponsorDetailsModal;
