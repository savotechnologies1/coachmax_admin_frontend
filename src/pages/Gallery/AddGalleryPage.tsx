import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import AddGalleryForm from "../../components/Gallery/AddGalleryForm";

export default function AddGalleryPage() {
 return (
  <>
   <PageMeta
    title="CoachMax | Add New Gallery"
    description="Launch and manage elite athletes via new tournaments and events."
   />
   <div className="space-y-6">
    <PageBreadcrumb pageTitle="Open New Gallery" />
    
    <div className="pb-12">
     <AddGalleryForm />
    </div>
   </div>
  </>
 );
}
