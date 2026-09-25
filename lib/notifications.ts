import { toast } from "sonner"

import type { Ticket } from "@/lib/ticket"

const supported = () => typeof window !== "undefined" && "Notification" in window

/** Asks once for permission; call from a user gesture such as boarding. */
export function requestNotificationPermission() {
  if (supported() && Notification.permission === "default") {
    void Notification.requestPermission()
  }
}

/** In-app toast on landing, plus a system notification when the tab is in the background. */
export function announceLanding(ticket: Ticket) {
  const title = `Gelandet in ${ticket.destination.city}`
  const body = `${ticket.durationMinutes} Min Fokus abgeschlossen · ${ticket.origin.iata} → ${ticket.destination.iata}`

  if (supported() && Notification.permission === "granted" && document.hidden) {
    try {
      new Notification(title, { body, tag: "takeofffocus-landing" })
    } catch {
      // Some mobile browsers only allow notifications via a service worker.
    }
  }

  if (supported() && Notification.permission === "default") {
    toast.success(title, {
      description: "Aktiviere Benachrichtigungen, damit du die Landung auch im Hintergrund mitbekommst.",
      action: { label: "Aktivieren", onClick: () => void Notification.requestPermission() },
    })
  } else {
    toast.success(title, { description: body })
  }
}
