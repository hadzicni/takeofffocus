import { cn } from "cn"

type FlapTextProps = {
  text: string
  className?: string
  /**
   * Flip changed characters in, staggered left to right. Keep off for values
   * that tick constantly (the timer) so the board stays calm.
   */
  animate?: boolean
}

const SEPARATORS = /[:·→\-.]/

/** Text set on split-flap tiles, like a departure board. */
export function FlapText({ text, className, animate = false }: FlapTextProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex items-center">
        {[...text].map((char, index) => {
          if (char === " ") return <span key={index} className="w-[0.3em]" />
          if (SEPARATORS.test(char)) {
            return (
              <span key={index} className="flap-separator">
                {char}
              </span>
            )
          }
          return (
            <span
              // Keyed by character when animating, so a changed tile remounts and flips in.
              key={animate ? `${index}-${char}` : index}
              className="flap"
              data-animate={animate || undefined}
              style={{ "--flap-index": index } as React.CSSProperties}
            >
              {char}
            </span>
          )
        })}
      </span>
    </span>
  )
}
