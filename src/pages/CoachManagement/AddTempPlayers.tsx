import PageMeta from "../../components/common/PageMeta";
import AddTempPlayerscomp from "../../components/CoachManagement/AddTempPlayerscomp";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";

export default function AddTempPlayers() {
  return (
    <>
      <PageMeta
        title="CoachMax | Add Player"
        description="Add a trial player to the system"
      />
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Add Player" items={[{ name: "Players Management", path: "/players" }]} subtitle="Register a trial player and assign a class session." />
        <AddTempPlayerscomp />
      </div>
    </>
  );
}
