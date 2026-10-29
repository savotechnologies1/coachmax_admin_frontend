import { Component, Suspense, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router";

class PageErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return (
      <div role="alert" className="mx-auto max-w-lg p-8 text-center text-slate-700 dark:text-slate-200">
        <h1 className="text-lg font-semibold">This page could not be loaded</h1>
        <p className="mt-2 text-sm">Reload the page to try again.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-4 border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600">Reload page</button>
      </div>
    );
    return this.props.children;
  }
}

/** The layout remains visible while only the selected route's code loads. */
export default function PageLoadBoundary() {
  const location = useLocation();
  return (
    <PageErrorBoundary key={location.pathname}>
      <Suspense fallback={<div role="status" aria-live="polite" className="p-8 text-center text-sm text-slate-500">Loading page…</div>}>
        <Outlet />
      </Suspense>
    </PageErrorBoundary>
  );
}
