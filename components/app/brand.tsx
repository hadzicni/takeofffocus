import { PlaneTakeoffIcon } from "lucide-react"

/** Logo mark and wordmark. */
export function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-[10px] bg-gradient-to-br from-primary to-[oklch(0.72_0.15_55)] text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.4),0_6px_20px_-6px_var(--color-primary)]">
        <PlaneTakeoffIcon className="size-4" strokeWidth={2.25} />
      </span>
      <span className="text-[0.9375rem] font-semibold tracking-tight">
        Takeoff<span className="text-muted-foreground">Focus</span>
      </span>
    </span>
  )
}
