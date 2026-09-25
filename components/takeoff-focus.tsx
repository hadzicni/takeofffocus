"use client"

import { PlaneTakeoffIcon } from "lucide-react"

import { BoardingScreen } from "@/components/boarding-screen"
import { FlightScreen } from "@/components/flight-screen"
import { LandingDialog } from "@/components/landing-dialog"
import { StartScreen } from "@/components/start-screen"
import { useFlightStore } from "@/lib/flight-store"
import { requestNotificationPermission } from "@/lib/notifications"

export function TakeoffFocus() {
  const { phase, ticket, board, cancelBoarding, newFlight } = useFlightStore()

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex items-center gap-2 text-sm font-medium tracking-wide">
        <PlaneTakeoffIcon className="size-5 text-primary" />
        TakeoffFocus
      </header>

      {phase === "setup" && <StartScreen />}
      {phase === "boarding" && ticket && (
        <BoardingScreen
          ticket={ticket}
          onBoard={() => {
            requestNotificationPermission()
            board()
          }}
          onBack={cancelBoarding}
        />
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
