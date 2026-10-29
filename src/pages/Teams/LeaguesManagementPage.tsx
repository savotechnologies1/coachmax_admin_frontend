import PageBreadcrumb from "../../components/common/PageBreadcrumb";
import PageMeta from "../../components/common/PageMeta";
import LeagueManagement from "../../components/management/LeagueManagement";

export default function LeaguesManagementPage() {
  return (
    <>
      <PageMeta
        title="CoachMax | Leagues Management"
        description="Manage your academy's leagues and competitions"
      />
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Leagues Management" />
        <LeagueManagement />
      </div>
    </>
  );
}
