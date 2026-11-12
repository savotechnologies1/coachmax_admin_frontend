import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  formatter?: (value: number) => string;
  duration?: number;
  className?: string;
};

const defaultFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format;

function prefersReducedMotion() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Animates the visible number while screen readers receive only the final value. */
export default function AnimatedNumber({
  value,
  formatter = defaultFormatter,
  duration = 850,
  className,
}: AnimatedNumberProps) {
  const target = Number.isFinite(value) ? value : 0;
  const animationDuration = Number.isFinite(duration) ? Math.max(0, duration) : 850;
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? target : 0));
  const shownRef = useRef(shown);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const start = shownRef.current;
    if (reducedMotion || animationDuration === 0 || start === target) {
      shownRef.current = target;
      setShown(target);
      return;
    }

    let frame = 0;
    let startedAt: number | null = null;
    const tick = (timestamp: number) => {
      if (startedAt === null) startedAt = timestamp;
      const progress = Math.min(1, (timestamp - startedAt) / animationDuration);
      const eased = 1 - (1 - progress) ** 3;
      const next = progress === 1 ? target : start + (target - start) * eased;
      shownRef.current = next;
      setShown(next);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target, reducedMotion, animationDuration]);

  return (
    <span className={className}>
      <span aria-hidden="true">{formatter(shown)}</span>
      <span className="sr-only">{formatter(target)}</span>
    </span>
  );
}
