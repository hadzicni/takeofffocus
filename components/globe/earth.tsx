"use client"

import { useMemo } from "react"
import { useTexture } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import { AdditiveBlending, BackSide, SRGBColorSpace, type Texture, type Vector3 } from "three"

// NASA Blue Marble (day) and Black Marble 2016 (night lights), public domain.
export const EARTH_TEXTURES = ["/textures/earth-day-4k.jpg", "/textures/earth-night-2k.jpg"]

const earthVertex = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`

const earthFragment = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform vec3 sunDirection;
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    #include <logdepthbuf_fragment>
    float sun = dot(normalize(vNormal), sunDirection);
    // Soft terminator: civil twilight is a band, not a line.
    float daylight = smoothstep(-0.12, 0.22, sun);
    // Peaks at 1.0 so sunlit ice stays below the bloom threshold.
    vec3 day = texture2D(dayMap, vUv).rgb * (0.15 + 0.85 * max(sun, 0.0));
    // City lights, warmed slightly, only where the sun has set. The brightest
    // metro areas just cross the bloom threshold and glow softly.
    vec3 night = texture2D(nightMap, vUv).rgb * vec3(1.45, 1.25, 1.0);
    gl_FragColor = vec4(mix(night, day, daylight), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const atmosphereVertex = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`

const atmosphereFragment = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform vec3 sunDirection;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  void main() {
    #include <logdepthbuf_fragment>
    // Clamped: from inside the shell (low cameras) this becomes a sky glow above the horizon.
    float rim = pow(clamp(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.0) * 0.8;
    float lit = 0.2 + 0.8 * smoothstep(-0.35, 0.45, dot(vWorldNormal, sunDirection));
    gl_FragColor = vec4(vec3(0.35, 0.62, 1.0) * rim * lit, 1.0);
  }
`

function prepare(textures: Texture[], anisotropy: number) {
  for (const texture of textures) {
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = anisotropy
  }
}

export function Earth({ sun }: { sun: Vector3 }) {
  const gl = useThree((state) => state.gl)
  const [day, night] = useTexture(EARTH_TEXTURES, (textures) =>
    prepare(textures, Math.min(8, gl.capabilities.getMaxAnisotropy()))
  )

  const earthUniforms = useMemo(
    () => ({ dayMap: { value: day }, nightMap: { value: night }, sunDirection: { value: sun } }),
    [day, night, sun]
  )
  const atmosphereUniforms = useMemo(() => ({ sunDirection: { value: sun } }), [sun])

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1, 128, 64]} />
        <shaderMaterial
          uniforms={earthUniforms}
          vertexShader={earthVertex}
          fragmentShader={earthFragment}
        />
      </mesh>
      <mesh scale={1.035}>
        <sphereGeometry args={[1, 64, 32]} />
        <shaderMaterial
          uniforms={atmosphereUniforms}
          vertexShader={atmosphereVertex}
          fragmentShader={atmosphereFragment}
          side={BackSide}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
