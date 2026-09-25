"use client"

import { AppHeader } from "@/components/app-header"
import { BoardingScreen } from "@/components/boarding-screen"
import { FlightScreen } from "@/components/flight-screen"
import { LandingDialog } from "@/components/landing-dialog"
import { StartScreen } from "@/components/start-screen"
import { useFlightStore } from "@/lib/flight-store"

export function TakeoffFocus() {
  const { phase, ticket, board, cancelBoarding, newFlight } = useFlightStore()

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10">
      <AppHeader />

      {phase === "setup" && <StartScreen />}
      {phase === "boarding" && ticket && (
        <BoardingScreen ticket={ticket} onBoard={board} onBack={cancelBoarding} />
      )}
      {(phase === "flight" || phase === "landed") && ticket && (
        <>
          <FlightScreen ticket={ticket} />
          <LandingDialog ticket={ticket} open={phase === "landed"} onNewFlight={newFlight} />
        </>
      )}
    </main>
  )
}
