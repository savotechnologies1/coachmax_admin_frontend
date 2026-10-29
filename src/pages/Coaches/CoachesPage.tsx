import React from "react";
import PageMeta from "../../components/common/PageMeta";
import CoachManagement from "../../components/management/CoachManagement";

const CoachesPage: React.FC = () => {
  return (
    <>
      <PageMeta title="CoachMax | Coach Manage" description="Manage certified academy coaches" />
      <div className="space-y-6">
        <CoachManagement />
      </div>
    </>
  );
};

export default CoachesPage;
