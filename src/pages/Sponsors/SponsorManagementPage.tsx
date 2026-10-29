// src/pages/Sponsors/SponsorManagementPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import SponsorForm from "../../components/SponsorManagement/SponsorForm";
import SponsorTable from "../../components/SponsorManagement/SponsorTable";
import { getAllSponsors, Sponsor } from "../../api/sponsorApi";
import toast from "react-hot-toast";

const SponsorManagementPage: React.FC = () => {
 const [sponsors, setSponsors] = useState<Sponsor[]>([]);
 const [loading, setLoading] = useState(true);
 const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);

 const fetchSponsors = useCallback(async () => {
  setLoading(true);
  try {
   const data = await getAllSponsors();
   // Adjusting based on common API patterns, might need to change if data structure differs
   setSponsors(data.sponsors || data.data || []); 
  } catch (err) {
   console.error("Error fetching sponsors:", err);
   toast.error("Failed to load sponsors.");
  } finally {
   setLoading(false);
  }
 }, []);

 useEffect(() => {
  fetchSponsors();
 }, [fetchSponsors]);

 const handleFormSuccess = () => {
  fetchSponsors();
  setEditingSponsor(null);
 };

 const handleEdit = (sponsor: Sponsor) => {
  setEditingSponsor(sponsor);
  // Scroll to the top to see the edit form
  window.scrollTo({ top: 0, behavior: 'smooth' });
 };

 return (
  <>
   <PageMeta
    title="CoachMax | Sponsor Management"
    description="Manage sponsor banners and elite partnerships."
   />
   
   <div className="space-y-6">
    <PageBreadcrumb pageTitle="Sponsors Management" />
    
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Form Section */}
      <div className="lg:col-span-4">
       <SponsorForm 
        onSuccess={handleFormSuccess} 
        editingSponsor={editingSponsor}
        onCancelEdit={() => setEditingSponsor(null)}
       />
      </div>

      {/* Right Column: List Section */}
      <div className="lg:col-span-8 space-y-4">
       <div className="flex items-center justify-between">
        <h4 className="text-xl font-bold tracking-tighter text-gray-800 dark:text-white">
         Partnership <span className="text-brand-500 ">Inventory</span>
        </h4>
        <span className="text-[10px] font-bold text-gray-400 border px-3 py-1 rounded-full border-gray-100 bg-white shadow-sm">
         In Stock: {sponsors.length} Banners
        </span>
       </div>
       
       <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.05] rounded-none shadow-sm overflow-hidden">
         <SponsorTable 
          sponsors={sponsors} 
          loading={loading} 
          onEdit={handleEdit}
          onRefresh={fetchSponsors}
         />
       </div>
      </div>
    </div>
   </div>
  </>
 );
};

export default SponsorManagementPage;
