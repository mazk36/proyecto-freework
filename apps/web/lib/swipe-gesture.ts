export type SwipeDecision = "like" | "dismiss" | null;

export type SwipeGesture = {
  decision: SwipeDecision;
  rotationDeg: number;
  labelOpacity: number;
  exitTarget: { x: number; rotationDeg: number } | null;
};

export function decideSwipe(dx: number, velocity: number, width: number): SwipeGesture {
  const direction = Math.abs(dx) > 120 ? Math.sign(dx) : Math.abs(velocity) > 500 ? Math.sign(velocity) : 0;
  const decision = direction > 0 ? "like" : direction < 0 ? "dismiss" : null;

  return {
    decision,
    rotationDeg: Math.max(-12, Math.min(12, dx / 20)),
    labelOpacity: Math.max(0, Math.min(1, (Math.abs(dx) - 40) / 80)),
    exitTarget: decision ? { x: direction * Math.max(0, width) * 1.2, rotationDeg: direction * 18 } : null,
  };
}
