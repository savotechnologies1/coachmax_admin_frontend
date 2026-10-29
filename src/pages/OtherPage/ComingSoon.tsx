import GridShape from "../../components/common/GridShape";
import PageMeta from "../../components/common/PageMeta";

export default function ComingSoon() {
  return (
    <>
      <PageMeta
        title="Coming Soon | CoachMax"
        description="This feature is coming soon."
      />
      <div className="relative flex flex-col items-center justify-center min-h-[70vh] p-6 overflow-hidden z-1">
        <GridShape />
        <div className="mx-auto w-full max-w-[472px] text-center">
          <h1 className="mb-4 font-bold text-gray-800 text-title-xl dark:text-white/90">
            Coming Soon
          </h1>

          <p className="mt-4 mb-6 text-base text-gray-700 dark:text-gray-400 sm:text-lg">
            We are working hard to bring this feature to you. Stay tuned!
          </p>
        </div>
      </div>
    </>
  );
}
