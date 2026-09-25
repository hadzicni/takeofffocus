"use client"

import { useMemo, useRef, useState } from "react"
import { OrbitControls } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { MathUtils, Quaternion, Vector3 } from "three"

import { ALTITUDE, TAKEOFF, updatePose, type PlanePose } from "@/lib/globe-flight"
import { easeInOutCubic, type GreatCircle } from "@/lib/globe-math"

export type CameraView = "follow" | "overview"

/** Where the establishing shot starts: far out in space. */
const SPACE_DISTANCE = 3.8
/** Chase camera offsets (globe units), interpolated from runway to cruise. */
const CHASE = { back: [0.026, 0.05], above: [0.007, 0.02], ahead: 0.018 }
/** How quickly the chase camera catches up; lower is lazier. */
const FOLLOW_RATE = 3.2
const WORLD_UP = new Vector3(0, 1, 0)
const CENTRE = new Vector3()

type FlightDirectorProps = {
  pose: PlanePose
  circle: GreatCircle
  progress: number
  view: CameraView
  intro: boolean
  motion: boolean
}

/**
 * Runs first each frame (priority -1): moves the plane along the route, then
 * the camera. Plane, route and track read the pose afterwards.
 */
export function FlightDirector({ pose, circle, progress, view, intro, motion }: FlightDirectorProps) {
  const startedAt = useRef<number | null>(null)
  const [settledView, setSettledView] = useState<CameraView>("follow")
  const orbiting = view === "overview" && settledView === "overview"

  const s = useMemo(() => {
    // Start behind and above the origin, so the shot swoops in along the route.
    const spaceDirection = circle
      .pointAt(0)
      .addScaledVector(circle.tangentAt(0), -0.45)
      .addScaledVector(WORLD_UP, 0.3)
      .normalize()
    const overviewDistance = MathUtils.lerp(2.1, 3.3, MathUtils.clamp(circle.angle / 1.6, 0, 1))
    return {
      spaceDirection,
      overview: circle.pointAt(0.5).normalize().multiplyScalar(overviewDistance),
      desired: new Vector3(),
      lookTarget: new Vector3(),
      look: new Vector3(),
      up: new Vector3(0, 1, 0),
      targetUp: new Vector3(),
      direction: new Vector3(),
      swing: new Quaternion(),
      fullSwing: new Quaternion(),
      identity: new Quaternion(),
    }
  }, [circle])

  useFrame(({ camera, clock }, delta) => {
    startedAt.current ??= clock.elapsedTime
    const introS = intro ? clock.elapsedTime - startedAt.current : Infinity
    updatePose(pose, circle, progress, introS, clock.elapsedTime, motion)

    if (orbiting) return

    if (view === "overview") {
      s.desired.copy(s.overview)
      s.lookTarget.copy(CENTRE)
      s.targetUp.copy(WORLD_UP)
    } else {
      const height = MathUtils.smoothstep(pose.altitude, ALTITUDE.ground, ALTITUDE.cruise)
      s.desired
        .copy(pose.position)
        .addScaledVector(pose.forward, -MathUtils.lerp(CHASE.back[0], CHASE.back[1], height))
        .addScaledVector(pose.up, MathUtils.lerp(CHASE.above[0], CHASE.above[1], height))
      s.lookTarget.copy(pose.position).addScaledVector(pose.forward, CHASE.ahead)
      s.targetUp.copy(pose.up)
      if (settledView !== "follow") setSettledView("follow")
    }

    if (introS < TAKEOFF.establishS) {
      // Establishing shot: swing the direction and close the distance on a log scale,
      // so the approach slows down as the ground gets near.
      const e = easeInOutCubic(introS / TAKEOFF.establishS)
      const endDistance = s.desired.length()
      s.fullSwing.setFromUnitVectors(s.spaceDirection, s.direction.copy(s.desired).normalize())
      s.swing.slerpQuaternions(s.identity, s.fullSwing, e)
      camera.position
        .copy(s.spaceDirection)
        .applyQuaternion(s.swing)
        .multiplyScalar(Math.exp(MathUtils.lerp(Math.log(SPACE_DISTANCE), Math.log(endDistance), e)))
      s.look.lerpVectors(CENTRE, s.lookTarget, e)
      s.up.lerpVectors(WORLD_UP, s.targetUp, e).normalize()
    } else {
      const k = motion ? 1 - Math.exp(-delta * FOLLOW_RATE) : 1
      camera.position.lerp(s.desired, k)
      s.look.lerp(s.lookTarget, k)
      s.up.lerp(s.targetUp, k).normalize()
    }

    camera.up.copy(s.up)
    camera.lookAt(s.look)

    if (view === "overview" && camera.position.distanceTo(s.desired) < 0.01) {
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
