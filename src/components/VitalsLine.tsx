type VitalsLineProps = {
  color?: string;
  className?: string;
  height?: number;
};

// A single continuous vitals trace, styled like a monitor sweep.
// Used as the recurring structural divider throughout the site —
// grounded in the subject: this is what the company's own products draw.
export default function VitalsLine({
  color = "#0F9F95",
  className = "",
  height = 48,
}: VitalsLineProps) {
  return (
    <svg
      viewBox="0 0 1200 100"
      preserveAspectRatio="none"
      className={`vitals-line ${className}`}
      style={{ height, width: "100%", color }}
      aria-hidden="true"
    >
      <path
        d="M0,50 L140,50 L168,50 L182,18 L198,82 L214,50 L246,50 L440,50 L468,50 L482,30 L498,50 L520,50 L700,50 L728,50 L742,8 L760,92 L778,42 L794,58 L810,50 L840,50 L1040,50 L1068,50 L1082,26 L1098,50 L1120,50 L1200,50"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="1000"
      />
    </svg>
  );
}
