"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import {
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
  type Color,
  type Group,
  type Mesh,
} from "three"

import type { PlanePose } from "@/lib/globe-flight"

/** Model units (fuselage ≈ 1.2) to globe units: ~40 km long, oversized to read at globe scale. */
const PLANE_SCALE = 0.0062

const X_AXIS = new Vector3(1, 0, 0)
const Z_AXIS = new Vector3(0, 0, 1)

/** A flat outline in the xy plane, extruded along z by `depth`. */
function flatShape(points: [number, number][], depth: number) {
  const shape = new Shape(points.map(([x, y]) => new Vector2(x, y)))
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false })
}

/**
 * Low-poly airliner from primitives, nose along +z, wings along x, y up.
 * About 400 triangles; flat shading keeps the faceted, stylised look.
 */
function useAirplaneGeometry() {
  return useMemo(() => {
    const fuselage = new CylinderGeometry(0.07, 0.07, 0.8, 10).rotateX(Math.PI / 2)
    const nose = new ConeGeometry(0.07, 0.2, 10).rotateX(Math.PI / 2).translate(0, 0, 0.5)
    const tailCone = new ConeGeometry(0.07, 0.24, 10)
      .rotateX(-Math.PI / 2)
      .translate(0, 0.015, -0.52)

    // Swept wing across both sides; shape y is chord (forward +), extruded for thickness.
    const wingPoints: [number, number][] = [
      [0, 0.16], [0.62, -0.1], [0.62, -0.18], [0, -0.16],
      [-0.62, -0.18], [-0.62, -0.1],
    ]
    const wing = flatShape(wingPoints, 0.018).rotateX(Math.PI / 2).translate(0, -0.03, 0.04)
    const stabilizer = flatShape(wingPoints, 0.012)
      .rotateX(Math.PI / 2)
      .scale(0.36, 1, 0.5)
      .translate(0, 0.02, -0.5)
    // Fin: shape x is chord along z, y is height; turned to stand upright.
    const fin = flatShape(
      [[-0.3, 0.05], [-0.48, 0.3], [-0.58, 0.3], [-0.56, 0.05]],
      0.014
    )
      .rotateY(-Math.PI / 2)
      .translate(0.007, 0, 0)

    const engine = new CylinderGeometry(0.034, 0.03, 0.17, 8).rotateX(Math.PI / 2)
    return { fuselage, nose, tailCone, wing, stabilizer, fin, engine }
  }, [])
}

type AirplaneProps = {
  pose: PlanePose
  accent: Color
  /** Blink the anti-collision strobe (off with reduced motion). */
  strobe: boolean
}

export function Airplane({ pose, accent, strobe }: AirplaneProps) {
  const group = useRef<Group>(null)
  const strobeLight = useRef<Mesh>(null)
  const geometry = useAirplaneGeometry()

  const materials = useMemo(
    () => ({
      body: new MeshStandardMaterial({ color: "#e7ebf1", flatShading: true, roughness: 0.5, metalness: 0.15 }),
      accent: new MeshStandardMaterial({ color: accent, flatShading: true, roughness: 0.45 }),
      engine: new MeshStandardMaterial({ color: "#7d8696", flatShading: true, roughness: 0.4, metalness: 0.4 }),
    }),
    [accent]
  )

  const scratch = useMemo(
    () => ({ right: new Vector3(), basis: new Matrix4(), attitude: new Quaternion(), tilt: new Quaternion() }),
    []
  )

  useFrame(({ clock }) => {
    const plane = group.current
    if (!plane) return
    const { right, basis, attitude, tilt } = scratch

    plane.position.copy(pose.position)
    right.crossVectors(pose.up, pose.forward)
    basis.makeBasis(right, pose.up, pose.forward)
    attitude.setFromRotationMatrix(basis)
    // Nose-up pitch turns +z towards +y, i.e. a negative rotation about x.
    attitude.multiply(tilt.setFromAxisAngle(X_AXIS, -pose.pitch))
    attitude.multiply(tilt.setFromAxisAngle(Z_AXIS, pose.roll))
    plane.quaternion.copy(attitude)

    if (strobeLight.current) {
      strobeLight.current.visible = strobe && clock.elapsedTime % 1.4 < 0.08
    }
  })

  return (
    <group ref={group} scale={PLANE_SCALE}>
      <mesh geometry={geometry.fuselage} material={materials.body} />
      <mesh geometry={geometry.nose} material={materials.body} />
      <mesh geometry={geometry.tailCone} material={materials.body} />
      <mesh geometry={geometry.wing} material={materials.body} />
      <mesh geometry={geometry.stabilizer} material={materials.body} />
      <mesh geometry={geometry.fin} material={materials.accent} />
      <mesh geometry={geometry.engine} material={materials.engine} position={[0.22, -0.07, 0.1]} />
      <mesh geometry={geometry.engine} material={materials.engine} position={[-0.22, -0.07, 0.1]} />

      {/* Navigation lights: red on the left (port) wingtip, green on the right. Unlit so bloom picks them up. */}
      <mesh position={[0.62, -0.02, -0.12]}>
        <sphereGeometry args={[0.022, 6, 4]} />
        <meshBasicMaterial color={[4, 0.3, 0.3]} toneMapped={false} />
      </mesh>
      <mesh position={[-0.62, -0.02, -0.12]}>
        <sphereGeometry args={[0.022, 6, 4]} />
        <meshBasicMaterial color={[0.3, 4, 0.6]} toneMapped={false} />
      </mesh>
      <mesh ref={strobeLight} position={[0, 0.31, -0.57]} visible={false}>
        <sphereGeometry args={[0.03, 6, 4]} />
        <meshBasicMaterial color={[6, 6, 6]} toneMapped={false} />
      </mesh>
    </group>
  )
}
