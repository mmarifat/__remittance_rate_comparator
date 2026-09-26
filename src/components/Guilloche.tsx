// Banknote-style security engraving drawn as SVG paths: a rosette and a wave band.

function rosette(radius: number, amp: number, lobes: number, phase: number) {
  const steps = 360;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = radius + amp * Math.sin(lobes * t + phase);
    d += `${i ? "L" : "M"}${(r * Math.cos(t)).toFixed(1)} ${(r * Math.sin(t)).toFixed(1)}`;
  }
  return `${d}Z`;
}

function wave(width: number, amp: number, freq: number, phase: number) {
  let d = "";
  for (let x = 0; x <= width; x += 4) {
    d += `${x ? "L" : "M"}${x} ${(amp * Math.sin((x / width) * Math.PI * 2 * freq + phase)).toFixed(1)}`;
  }
  return d;
}

const OUTER = Array.from({ length: 18 }, (_, i) => rosette(100, 14, 12, (i / 18) * Math.PI));
const INNER = Array.from({ length: 10 }, (_, i) => rosette(56, 8, 8, (i / 10) * Math.PI));
const BAND = Array.from({ length: 9 }, (_, i) => wave(1200, 9, 9, (i / 9) * Math.PI * 2));

/** Square rosette, centred on whatever it's positioned over. */
export function Rosette({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-120 -120 240 240" aria-hidden="true">
      <g fill="none" stroke="var(--note-line)" strokeWidth="0.7">
        {[...OUTER, ...INNER].map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

/** Horizontal band of interleaved sine waves. */
export function Waves({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 -12 1200 24" preserveAspectRatio="none" aria-hidden="true">
      <g fill="none" stroke="var(--note-line)" strokeWidth="0.7" vectorEffect="non-scaling-stroke">
        {BAND.map((d, i) => (
          <path key={i} d={d} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </svg>
  );
}
