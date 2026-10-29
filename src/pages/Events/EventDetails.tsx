import React from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import EventDetailsComp from "../../components/EventComponents/EventDetailsComp";

const EventDetails: React.FC = () => {
 return (
  <>
   <PageMeta
    title="CoachMax | Event Comprehensive Intel"
    description="Detailed diagnostics and attendee analytics for the selected tournament."
   />
   <div className="[&>div]:!mb-2.5">
     <PageBreadcrumb 
      pageTitle="Event Intelligence" 
      items={[
        { name: "Events", path: "/events" },
        { name: "Inventory", path: "/events" }
      ]}
     />
   </div>
   <EventDetailsComp />
  </>
 );
};

export default EventDetails;
