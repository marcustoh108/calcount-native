export interface PhysioTip {
  icon: string;
  title: string;
  body: string;
}

/**
 * General, non-diagnostic mobility/recovery education — not a treatment plan for any specific
 * condition. Always paired with a disclaimer pointing to a professional for anything persistent
 * or severe (see PhysioTipCard).
 */
export const PHYSIO_TIPS: PhysioTip[] = [
  {
    icon: "🔥",
    title: "Warm up before exercise",
    body: "5–10 minutes of light cardio and dynamic movement (leg swings, arm circles) before a workout reduces stiffness and injury risk.",
  },
  {
    icon: "🧊",
    title: "Cool down and stretch after",
    body: "Static stretches held for 20–30 seconds after exercise help maintain flexibility and can ease next-day soreness.",
  },
  {
    icon: "🪑",
    title: "Break up long sitting",
    body: "Get up and move for a couple of minutes every 30–60 minutes — prolonged sitting is a common driver of hip and back stiffness.",
  },
  {
    icon: "🏊",
    title: "Low-impact options for sore joints",
    body: "Swimming, cycling, and water aerobics put far less stress on joints than running — good starting points if knees, hips, or ankles are achy.",
  },
  {
    icon: "💧",
    title: "Hydration matters for joints",
    body: "Cartilage is largely water — staying hydrated supports joint lubrication and overall mobility, alongside everything else it does.",
  },
  {
    icon: "🌀",
    title: "A short daily mobility routine helps",
    body: "Neck rolls, shoulder circles, hip circles, and ankle rotations for a few minutes each morning can noticeably reduce stiffness.",
  },
  {
    icon: "🩹",
    title: "RICE for minor strains",
    body: "For a minor sprain or strain: Rest, Ice, Compression, Elevation in the first 24–48 hours is the standard first step.",
  },
  {
    icon: "💪",
    title: "Strength supports joints",
    body: "Building strength in the muscles around a joint (e.g. quads for knees) reduces the load the joint itself has to absorb over time.",
  },
];

export const PHYSIO_DISCLAIMER =
  "General education, not a diagnosis or treatment plan. If pain is sharp, sudden, severe, or lasts more than a few days, see a physiotherapist or doctor.";

/** Rotates one tip per calendar day so it feels fresh without needing any state. */
export function tipOfTheDay(): PhysioTip {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return PHYSIO_TIPS[dayOfYear % PHYSIO_TIPS.length];
}
