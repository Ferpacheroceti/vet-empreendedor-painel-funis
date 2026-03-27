"use client";

interface HealthGaugeProps {
  score: number;
  size?: number;
}

export function HealthGauge({ score, size = 120 }: HealthGaugeProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  // Only use 75% of the circle (270 degrees)
  const arcLength = circumference * 0.75;
  void arcLength; // used for reference only

  const color =
    score >= 70 ? "#22c55e" :
    score >= 40 ? "#eab308" :
    "#ef4444";

  const cx = size / 2;
  const cy = size / 2;

  // Arc starts at 135deg (-225deg from standard) and goes clockwise 270deg
  const startAngle = 135;
  const endAngle = startAngle + 270 * (score / 100);

  function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  const bgStart = polarToCartesian(cx, cy, radius, 135);
  const bgEnd = polarToCartesian(cx, cy, radius, 135 + 270);

  const fgStart = polarToCartesian(cx, cy, radius, 135);
  const fgEnd = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = 270 * (score / 100) > 180 ? 1 : 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path
          d={`M ${bgStart.x} ${bgStart.y} A ${radius} ${radius} 0 1 1 ${bgEnd.x} ${bgEnd.y}`}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        {score > 0 && (
          <path
            d={`M ${fgStart.x} ${fgStart.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${fgEnd.x} ${fgEnd.y}`}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
          />
        )}
        {/* Score text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="22"
          fontWeight="700"
          fontFamily="var(--font-dm-mono)"
        >
          {score}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize="10"
        >
          /100
        </text>
      </svg>
    </div>
  );
}
