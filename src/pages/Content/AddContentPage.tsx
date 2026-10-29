import PageMeta from "../../components/common/PageMeta";
import AddContentForm from "../../components/ContentManagement/AddContentForm";
import PageBreadcrumb from "../../components/common/PageBreadcrumb";

export default function AddContentPage() {
  return (
    <>
      <PageMeta
        title="CoachMax | Create News Article"
        description="Publish breaking updates and news features instantly to your platform."
      />
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Create News Article" items={[{ name: "News & Updates", path: "/news" }]} subtitle="Publish breaking updates and news features instantly to your platform." />
        <AddContentForm />
      </div>
    </>
  );
}
