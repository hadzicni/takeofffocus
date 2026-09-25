"use client"

import { useMemo, useRef, useState } from "react"
import { OrbitControls } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { MathUtils, Quaternion, Vector3, type PerspectiveCamera } from "three"

import { ALTITUDE, TAKEOFF, updatePose, type PlanePose } from "@/lib/globe-flight"
import { easeInOutCubic, type GreatCircle } from "@/lib/globe-math"

export type SceneMode = "idle" | "planning" | "flight" | "landed"
export type CameraView = "follow" | "overview"

/** Chase camera offsets (globe units), interpolated from runway to cruise. */
const CHASE = { back: [0.026, 0.05], above: [0.007, 0.02], ahead: 0.018 }
/** How quickly the camera settles on a new target; lower is lazier. */
const FOLLOW_RATE = 3.2
const SETTLE_RATE = 1.8
const IDLE_DISTANCE = 3.1
const IDLE_SPIN = 0.035
const WORLD_UP = new Vector3(0, 1, 0)
const CENTRE = new Vector3()

/** Camera distance that frames a route of this central angle (radians). */
const overviewDistance = (angle: number) => 1 + MathUtils.clamp(angle * 2.2, 0.35, 2.3)

type SceneDirectorProps = {
  mode: SceneMode
  pose: PlanePose
  circle: GreatCircle | null
  origin: Vector3 | null
  progress: number
  view: CameraView
  intro: boolean
  motion: boolean
  /** Shift of the globe in px (right, up), to make room for a side panel or bottom sheet. */
  framing: { x: number; y: number }
}

/**
 * Runs first each frame (priority -1): positions the plane, then the camera.
 * Plane, route and markers read the pose afterwards.
 */
export function SceneDirector({
  mode,
  pose,
  circle,
  origin,
  progress,
  view,
  intro,
  motion,
  framing,
}: SceneDirectorProps) {
  const takeoffRef = useRef<{ startedAt: number; from: Vector3; look: Vector3; up: Vector3 } | null>(null)
  const [settledView, setSettledView] = useState<CameraView>("follow")
  const shift = useRef({ x: 0, y: 0 })
  const orbiting = mode === "flight" && view === "overview" && settledView === "overview"

  const s = useMemo(
    () => ({
      desired: new Vector3(),
      lookTarget: new Vector3(),
      look: new Vector3(),
      up: new Vector3(0, 1, 0),
      targetUp: new Vector3(),
      direction: new Vector3(),
      swing: new Quaternion(),
      fullSwing: new Quaternion(),
      identity: new Quaternion(),
    }),
    []
  )

  useFrame((state, delta) => {
    const camera = state.camera as PerspectiveCamera
    const time = state.clock.elapsedTime

    // The takeoff starts from wherever the camera is when the flight begins.
    if (mode === "flight" && intro && !takeoffRef.current) {
      takeoffRef.current = { startedAt: time, from: camera.position.clone(), look: s.look.clone(), up: s.up.clone() }
    }
    if (mode !== "flight" && mode !== "landed") takeoffRef.current = null
    const introS = takeoffRef.current ? time - takeoffRef.current.startedAt : Infinity

    if (circle) {
      // While planning the plane waits at the start of its takeoff roll.
      const flightProgress = mode === "flight" ? progress : mode === "landed" ? 1 : 0
      updatePose(pose, circle, flightProgress, mode === "planning" ? 0 : introS, time, motion)
    }

    // Slide the globe aside for the planner panel (desktop) or bottom sheet (mobile).
    const offset = shift.current
    offset.x = motion ? MathUtils.damp(offset.x, framing.x, 4, delta) : framing.x
    offset.y = motion ? MathUtils.damp(offset.y, framing.y, 4, delta) : framing.y
    if (Math.abs(offset.x) > 0.5 || Math.abs(offset.y) > 0.5) {
      const { width, height } = state.size
      camera.setViewOffset(width, height, -offset.x, offset.y, width, height)
    } else if (camera.view?.enabled) {
      camera.clearViewOffset()
    }

    if (orbiting) return

    let rate = SETTLE_RATE
    const following = mode === "flight" && view === "follow" && circle

    if (following) {
      const height = MathUtils.smoothstep(pose.altitude, ALTITUDE.ground, ALTITUDE.cruise)
      s.desired
        .copy(pose.position)
        .addScaledVector(pose.forward, -MathUtils.lerp(CHASE.back[0], CHASE.back[1], height))
        .addScaledVector(pose.up, MathUtils.lerp(CHASE.above[0], CHASE.above[1], height))
      s.lookTarget.copy(pose.position).addScaledVector(pose.forward, CHASE.ahead)
      s.targetUp.copy(pose.up)
      rate = FOLLOW_RATE
      if (settledView !== "follow") setSettledView("follow")
    } else if (circle) {
      // Whole route from above, slightly from the south for some depth.
      const mid = circle.pointAt(0.5).normalize()
      s.desired
        .copy(mid)
        .addScaledVector(WORLD_UP, 0.08)
        .normalize()
        .multiplyScalar(overviewDistance(circle.angle))
      s.lookTarget.copy(CENTRE)
      s.targetUp.copy(WORLD_UP)
    } else if (origin) {
      s.desired.copy(origin).addScaledVector(WORLD_UP, 0.25).normalize().multiplyScalar(2.4)
      s.lookTarget.copy(CENTRE)
      s.targetUp.copy(WORLD_UP)
    } else {
      // Idle: the earth turns slowly under a fixed sun.
      const angle = motion ? time * IDLE_SPIN : 0.6
      s.desired.set(Math.sin(angle), 0.36, Math.cos(angle)).normalize().multiplyScalar(IDLE_DISTANCE)
      s.lookTarget.copy(CENTRE)
      s.targetUp.copy(WORLD_UP)
      rate = 6
    }

    const takeoff = takeoffRef.current
    if (following && takeoff && introS < TAKEOFF.establishS) {
      // Establishing shot: swing the direction and close the distance on a log
      // scale, so the approach slows down as the ground gets near.
      const e = easeInOutCubic(introS / TAKEOFF.establishS)
      s.fullSwing.setFromUnitVectors(
        s.direction.copy(takeoff.from).normalize(),
        s.direction.copy(s.desired).normalize()
      )
      s.swing.slerpQuaternions(s.identity, s.fullSwing, e)
      const distance = Math.exp(
        MathUtils.lerp(Math.log(takeoff.from.length()), Math.log(s.desired.length()), e)
      )
      camera.position.copy(takeoff.from).normalize().applyQuaternion(s.swing).multiplyScalar(distance)
      s.look.lerpVectors(takeoff.look, s.lookTarget, e)
      s.up.lerpVectors(takeoff.up, s.targetUp, e).normalize()
    } else {
      const k = motion ? 1 - Math.exp(-delta * rate) : 1
      camera.position.lerp(s.desired, k)
      s.look.lerp(s.lookTarget, k)
      s.up.lerp(s.targetUp, k).normalize()
    }

    camera.up.copy(s.up)
    camera.lookAt(s.look)

    if (mode === "flight" && view === "overview" && camera.position.distanceTo(s.desired) < 0.01) {
      setSettledView("overview")
    }
  }, -1)

  return orbiting ? (
    <OrbitControls
      makeDefault
      target={[0, 0, 0]}
      enablePan={false}
      enableDamping={motion}
      minDistance={1.25}
      maxDistance={6}
      rotateSpeed={0.5}
      zoomSpeed={0.6}
    />
  ) : null
}
