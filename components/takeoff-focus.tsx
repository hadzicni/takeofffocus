"use client"

import { PlaneTakeoffIcon } from "lucide-react"

import { BoardingScreen } from "@/components/boarding-screen"
import { StartScreen } from "@/components/start-screen"
import { useFlightStore } from "@/lib/flight-store"

export function TakeoffFocus() {
  const { phase, ticket, board, cancelBoarding } = useFlightStore()

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex items-center gap-2 text-sm font-medium tracking-wide">
        <PlaneTakeoffIcon className="size-5 text-primary" />
        TakeoffFocus
      </header>

      {phase === "setup" && <StartScreen />}
      {phase === "boarding" && ticket && (
        <BoardingScreen ticket={ticket} onBoard={board} onBack={cancelBoarding} />
      )}
      {phase === "flight" && (
        // Placeholder until the flight session screen (step 5) exists.
        <p className="text-sm text-muted-foreground">Flug gestartet. Die Session folgt in Schritt 5.</p>
      )}
    </main>
  )
}
