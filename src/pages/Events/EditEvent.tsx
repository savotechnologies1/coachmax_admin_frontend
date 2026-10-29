// src/pages/Events/EditEvent.tsx
import { useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import AddEventForm from "../../components/EventComponents/AddEventForm";

export default function EditEvent() {
 const { id } = useParams();

 return (
  <>
   <PageMeta
    title="CoachMax | Edit Event"
    description="Modify and refine event details to ensure peak operational alignment."
   />
   <div className="space-y-6">
    <PageBreadcrumb pageTitle="Edit Event" items={[{ name: "Event Inventory", path: "/events" }]} />
    
    <div className="">
     <AddEventForm eventId={id} />
    </div>
   </div>
  </>
 );
}
