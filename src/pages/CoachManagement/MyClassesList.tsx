import PageMeta from "../../components/common/PageMeta";
import MyClassesListComp from "../../components/CoachManagement/MyClassesListComp";

export default function MyClassesList() {
  return (
    <>
      <PageMeta
        title="CoachMax | My Classes"
        description="Assigned coaching classes schedule"
      />
      <div className="space-y-6">
        <MyClassesListComp />
      </div>
    </>
  );
}
