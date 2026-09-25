"use client"

import { PlaneTakeoffIcon } from "lucide-react"

import { BoardingScreen } from "@/components/boarding-screen"
import { FlightScreen } from "@/components/flight-screen"
import { StartScreen } from "@/components/start-screen"
import { useFlightStore } from "@/lib/flight-store"

export function TakeoffFocus() {
  const { phase, ticket, board, cancelBoarding, abort } = useFlightStore()

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
      {phase === "flight" && ticket && <FlightScreen ticket={ticket} />}
      {phase === "landed" && (
        // Placeholder until the landing dialog (step 6) exists.
        <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
          <p>Gelandet. Der Landing-Dialog folgt in Schritt 6.</p>
          <button className="underline" onClick={abort}>
            Neuer Flug
          </button>
        </div>
      )}
    </main>
  )
}
