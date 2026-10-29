import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import AddEventForm from "../../components/EventComponents/AddEventForm";

export default function AddEvent() {
 return (
  <>
   <PageMeta
    title="CoachMax | Add New Event"
    description="Launch and manage elite athletes via new tournaments and events."
   />
   <div className="space-y-6">
    <PageBreadcrumb pageTitle="Add New Event" items={[{ name: "Event Inventory", path: "/events" }]} />
    
    {/* Main Content Card - Removed border/bg to allow form's inner cards to shine */}
    <div className="">
     <AddEventForm />
    </div>
   </div>
  </>
 );
}
