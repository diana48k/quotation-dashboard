import { isClosedWon, isClosedLost } from "@/lib/metrics";
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={
        "status-badge " +
        (isClosedWon(status) ? "won" : isClosedLost(status) ? "lost" : "open")
      }
    >
      {status}
    </span>
  );
}
