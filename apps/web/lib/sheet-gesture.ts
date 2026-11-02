export function shouldCloseSheet(dragDistancePx: number, velocityPxPerSec: number): boolean {
  return dragDistancePx > 120 || velocityPxPerSec > 500;
}
