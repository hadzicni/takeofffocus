import { cn } from "cn"

type PanelProps = {
  children: React.ReactNode
  /** Pinned to the bottom of the panel, e.g. the primary action. */
  footer?: React.ReactNode
  className?: string
} & Omit<React.ComponentProps<"section">, "children">

/**
 * The floating glass panel for planning and boarding: a sidebar on large
 * screens (the globe gets the rest), a bottom sheet on phones.
 */
export function Panel({ children, footer, className, ...props }: PanelProps) {
  return (
    <section
      {...props}
      className={cn(
        "glass panel-enter pointer-events-auto absolute inset-x-3 bottom-3 flex max-h-[min(74dvh,44rem)] flex-col overflow-hidden rounded-[1.75rem]",
        "lg:inset-x-auto lg:top-20 lg:bottom-6 lg:left-6 lg:max-h-none lg:w-[420px]",
        className
      )}
    >
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-6 pb-4 sm:px-7 sm:pt-7">
        {children}
      </div>
      {footer && (
        <div className="border-t border-white/[0.06] bg-white/[0.02] px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7">
          {footer}
        </div>
      )}
    </section>
  )
}

/** Eyebrow + headline + supporting line at the top of a panel. */
export function PanelHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-2">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="text-[1.75rem] leading-[1.1] font-semibold tracking-[-0.025em] text-balance sm:text-[2rem]">
        {title}
      </h1>
      {children && <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{children}</p>}
    </header>
  )
}

/** A labelled group of controls inside a panel. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="eyebrow">{label}</h2>
      {children}
    </div>
  )
}
