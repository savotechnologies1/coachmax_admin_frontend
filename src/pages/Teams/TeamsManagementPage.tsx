import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import PageMeta from "../../components/common/PageMeta";
import TeamManagement from "../../components/management/TeamManagement";

export default function TeamsManagementPage() {
  return (
    <>
      <PageMeta
        title="CoachMax | Teams Management"
        description="Manage your academy teams and their assigned coaches"
      />
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Teams Management" />
        <TeamManagement />
      </div>
    </>
  );
}
