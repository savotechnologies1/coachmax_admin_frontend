import { useEffect, useId, useMemo, useState } from "react";
import AnimatedNumber from "../../components/common/AnimatedNumber";
import {
  ArrowDown,
  CheckCircle2,
  Clock,
  PieChart,
  TrendingUp,
  Wallet,
} from "lucide-react";

type StreamAmounts = {
  expected?: number;
  paid?: number;
  pending?: number;
};

export type TermEarningsVisualSummary = {
  totalExpected?: number;
  totalHandshake?: number;
  totalNetExpected?: number;
  totalPaid?: number;
  totalPending?: number;
  totalOutstanding?: number;
  streams?: {
    academy?: StreamAmounts;
    leagues?: StreamAmounts;
    camps?: StreamAmounts;
    store?: StreamAmounts;
  };
};

type Props = {
  summary: TermEarningsVisualSummary;
  formatCurrency: (value: number) => string;
};

const streamDefinitions = [
  { key: "academy", name: "Academy classes", color: "#2563eb", dot: "bg-blue-600" },
  { key: "leagues", name: "Tournaments", color: "#f97316", dot: "bg-orange-500" },
  { key: "camps", name: "Holiday camps & events", color: "#7c3aed", dot: "bg-violet-600" },
  { key: "store", name: "Store & merchandise", color: "#10b981", dot: "bg-emerald-500" },
] as const;

const amount = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

const percent = (value: number, total: number): number =>
  total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;

function PanelHeading({
  icon: Icon,
  title,
  subtitle,
  id,
}: {
  icon: typeof TrendingUp;
  title: string;
  subtitle: string;
  id: string;
}) {
  return (
    <div className="rounded-t-2xl bg-gradient-to-r from-[#071b50] via-[#082862] to-[#0a3674] px-5 py-4 text-white dark:from-[#061235] dark:via-[#092051] dark:to-[#0b2d63]">
      <h3 id={id} className="flex items-center gap-2.5 text-sm font-bold tracking-tight sm:text-base">
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-sky-200" />
        {title}
      </h3>
      <p className="mt-1 text-[11px] text-blue-100/80">{subtitle}</p>
    </div>
  );
}

export default function TermEarningsVisuals({ summary, formatCurrency }: Props) {
  const [barsReady, setBarsReady] = useState(false);
  const headingId = useId();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setBarsReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const streams = useMemo(
    () =>
      streamDefinitions.map((definition) => {
        const data = summary.streams?.[definition.key];
        return {
          ...definition,
          expected: amount(data?.expected),
          paid: amount(data?.paid),
          pending: amount(data?.pending),
        };
      }),
    [summary.streams],
  );

  const streamTotal = streams.reduce((sum, stream) => sum + stream.expected, 0);
  const maxStreamValue = Math.max(1, ...streams.map((stream) => Math.max(stream.expected, stream.paid, stream.pending)));
  const gross = amount(summary.totalExpected ?? streamTotal);
  const handshake = amount(summary.totalHandshake);
  const net = amount(summary.totalNetExpected ?? gross - handshake);
  const paid = amount(summary.totalPaid ?? streams.reduce((sum, stream) => sum + stream.paid, 0));
  const pending = amount(
    summary.totalPending ??
      summary.totalOutstanding ??
      streams.reduce((sum, stream) => sum + stream.pending, 0),
  );
  const paidShare = percent(paid, paid + pending);
  const pendingShare = percent(pending, paid + pending);

  const donutGradient = useMemo(() => {
    if (streamTotal <= 0) return "conic-gradient(#cbd5e1 0% 100%)";
    let start = 0;
    const slices = streams.map((stream) => {
      const end = start + percent(stream.expected, streamTotal);
      const slice = `${stream.color} ${start}% ${end}%`;
      start = end;
      return slice;
    });
    return `conic-gradient(${slices.join(", ")})`;
  }, [streams, streamTotal]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12" aria-label="Financial analytics charts">
      <section
        aria-labelledby={`${headingId}-collections`}
        className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(18,41,91,0.07)] dark:border-slate-700 dark:bg-slate-900 xl:col-span-5"
      >
        <PanelHeading
          id={`${headingId}-collections`}
          icon={TrendingUp}
          title="Collections by stream"
          subtitle="Compare gross fees, cash received and remaining balance"
        />
        <div className="px-5 pb-5 pt-4">
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300" aria-hidden="true">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" />Gross expected</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Received</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" />Pending</span>
          </div>
          <div className="space-y-3.5">
            {streams.map((stream) => (
              <div key={stream.key} role="group" aria-label={`${stream.name}: gross ${formatCurrency(stream.expected)}, received ${formatCurrency(stream.paid)}, pending ${formatCurrency(stream.pending)}`}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate font-bold text-slate-800 dark:text-slate-100">{stream.name}</span>
                  <span className="shrink-0 font-bold tabular-nums text-slate-700 dark:text-slate-200"><AnimatedNumber value={stream.expected} formatter={formatCurrency} /></span>
                </div>
                <div className="space-y-1" aria-hidden="true">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-blue-600 motion-safe:transition-[width] motion-safe:duration-700 motion-reduce:transition-none" style={{ width: barsReady ? `${percent(stream.expected, maxStreamValue)}%` : "0%" }} />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-500 motion-safe:transition-[width] motion-safe:duration-700 motion-reduce:transition-none" style={{ width: barsReady ? `${percent(stream.paid, maxStreamValue)}%` : "0%" }} />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-orange-500 motion-safe:transition-[width] motion-safe:duration-700 motion-reduce:transition-none" style={{ width: barsReady ? `${percent(stream.pending, maxStreamValue)}%` : "0%" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Gross is before concessions; received and pending reflect the payable balance.
          </p>
        </div>
      </section>

      <section
        aria-labelledby={`${headingId}-mix`}
        className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(18,41,91,0.07)] dark:border-slate-700 dark:bg-slate-900 xl:col-span-4"
      >
        <PanelHeading
          id={`${headingId}-mix`}
          icon={PieChart}
          title="Revenue by stream"
          subtitle="Share of gross expected revenue"
        />
        <div className="flex h-[312px] flex-col items-center justify-center gap-5 px-5 py-5 sm:flex-row xl:flex-col xl:gap-3 2xl:flex-row">
          <div
            role="img"
            aria-label={`Revenue mix: ${streams.map((stream) => `${stream.name} ${formatCurrency(stream.expected)}`).join(", ")}`}
            className="relative h-40 w-40 shrink-0 rounded-full shadow-[0_10px_28px_rgba(37,99,235,0.13)] sm:h-44 sm:w-44 xl:h-36 xl:w-36 2xl:h-44 2xl:w-44"
            style={{ background: donutGradient }}
          >
            <div className="absolute inset-[20%] flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner dark:bg-slate-900">
              <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Gross total</span>
              <strong className="mt-0.5 text-lg font-black tracking-tight text-[#091b49] dark:text-white 2xl:text-xl"><AnimatedNumber value={gross} formatter={formatCurrency} /></strong>
            </div>
          </div>
          <div className="grid w-full min-w-0 grid-cols-2 gap-x-3 gap-y-3 sm:max-w-[230px] sm:grid-cols-1 xl:grid-cols-2 xl:max-w-none 2xl:max-w-[210px] 2xl:grid-cols-1">
            {streams.map((stream) => (
              <div key={stream.key} className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${stream.dot}`} aria-hidden="true" />
                  <span className="truncate text-[10px] font-semibold text-slate-600 dark:text-slate-300" title={stream.name}>{stream.name}</span>
                </div>
                <div className="ml-3.5 mt-0.5 flex items-baseline gap-1.5">
                  <strong className="text-xs font-bold tabular-nums text-slate-900 dark:text-white"><AnimatedNumber value={stream.expected} formatter={formatCurrency} /></strong>
                  <span className="text-[10px] tabular-nums text-slate-400">{Math.round(percent(stream.expected, streamTotal))}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby={`${headingId}-funnel`}
        className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(18,41,91,0.07)] dark:border-slate-700 dark:bg-slate-900 xl:col-span-3"
      >
        <PanelHeading
          id={`${headingId}-funnel`}
          icon={Wallet}
          title="Financial funnel"
          subtitle="From gross fees to collected cash"
        />
        <div className="flex min-h-[312px] flex-col justify-center px-5 py-4">
          <div className="mx-auto w-full max-w-sm space-y-1.5 text-center">
            <div className="rounded-xl bg-gradient-to-r from-blue-700 to-blue-500 px-3 py-2.5 text-white shadow-sm" role="group" aria-label={`Gross expected ${formatCurrency(gross)}`}>
              <span className="block text-[10px] font-semibold text-blue-100">Gross expected</span>
              <strong className="block text-base font-black tabular-nums leading-tight"><AnimatedNumber value={gross} formatter={formatCurrency} /></strong>
            </div>
            <ArrowDown aria-hidden="true" className="mx-auto h-3 w-3 text-slate-400" />
            <div className="mx-auto flex w-[92%] items-center justify-between gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] dark:border-violet-800 dark:bg-violet-950/40">
              <span className="font-semibold text-violet-700 dark:text-violet-300">Less concessions</span>
              <strong className="tabular-nums text-violet-800 dark:text-violet-200">−<AnimatedNumber value={handshake} formatter={formatCurrency} /></strong>
            </div>
            <ArrowDown aria-hidden="true" className="mx-auto h-3 w-3 text-slate-400" />
            <div className="mx-auto w-[86%] rounded-xl bg-gradient-to-r from-cyan-600 to-sky-500 px-3 py-2 text-white shadow-sm" role="group" aria-label={`Net payable ${formatCurrency(net)}`}>
              <span className="block text-[10px] font-semibold text-cyan-50">Net payable</span>
              <strong className="block text-base font-black tabular-nums leading-tight"><AnimatedNumber value={net} formatter={formatCurrency} /></strong>
            </div>
            <ArrowDown aria-hidden="true" className="mx-auto h-3 w-3 text-slate-400" />
            <div className="flex gap-2 text-left">
              <div className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 dark:border-emerald-800 dark:bg-emerald-950/40">
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 aria-hidden="true" className="h-3 w-3" />Received</span>
                <strong className="mt-0.5 block truncate text-sm font-black tabular-nums text-emerald-700 dark:text-emerald-300" title={formatCurrency(paid)}><AnimatedNumber value={paid} formatter={formatCurrency} /></strong>
              </div>
              <div className="min-w-0 flex-1 rounded-xl border border-orange-200 bg-orange-50 px-2.5 py-2 dark:border-orange-800 dark:bg-orange-950/40">
                <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-700 dark:text-orange-300"><Clock aria-hidden="true" className="h-3 w-3" />Pending</span>
                <strong className="mt-0.5 block truncate text-sm font-black tabular-nums text-orange-700 dark:text-orange-300" title={formatCurrency(pending)}><AnimatedNumber value={pending} formatter={formatCurrency} /></strong>
              </div>
            </div>
            <div
              role="img"
              aria-label={`Collection split: received ${formatCurrency(paid)}, pending ${formatCurrency(pending)}`}
              className="flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <span className="h-full bg-emerald-500 motion-safe:transition-[width] motion-safe:duration-700 motion-reduce:transition-none" style={{ width: barsReady ? `${paidShare}%` : "0%" }} />
              <span className="h-full bg-orange-500 motion-safe:transition-[width] motion-safe:duration-700 motion-reduce:transition-none" style={{ width: barsReady ? `${pendingShare}%` : "0%" }} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
