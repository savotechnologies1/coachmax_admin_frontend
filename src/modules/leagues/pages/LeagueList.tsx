import PageBreadcrumb from "../../../components/common/PageBreadcrumb";
import PageMeta from "../../../components/common/PageMeta";
import LeagueManagement from "../../../components/management/LeagueManagement";

export default function LeagueList() {
  return (
    <>
      <PageMeta
        title="CoachMax | Tournaments Management"
        description="Manage your academy's tournaments and competitions"
      />
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Tournaments Management" />
        <LeagueManagement />
      </div>
    </>
  );
}
