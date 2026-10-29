import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import PageMeta from "../../components/common/PageMeta";
import FixtureManagement from "../../components/management/FixtureManagement";

export default function FixturesManagementPage() {
  return (
    <>
      <PageMeta
        title="CoachMax | Fixtures Management"
        description="Manage your league match fixtures and scheduling"
      />
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Fixtures Management" />
        <FixtureManagement />
      </div>
    </>
  );
}
