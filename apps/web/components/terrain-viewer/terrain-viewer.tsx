'use client'

import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { detectWebGL2 } from '@/lib/webgl/detect-webgl2'

function Scene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow={false} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        minDistance={2}
        maxDistance={10}
      />
      {/* placeholder disc — replaced by terrain mesh in TV-011 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2, 2, 0.15, 64]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
    </>
  )
}

export function TerrainViewer() {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null)

  useEffect(() => {
    setWebglSupported(detectWebGL2())
  }, [])

  if (webglSupported === null) {
    return <div className="h-[480px] w-full rounded-xl bg-ink/5 animate-pulse" />
  }

  if (!webglSupported) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-xl bg-ink/5 text-sm text-ink/40">
        Dein Browser unterstützt WebGL nicht. Bitte versuche einen anderen Browser.
      </div>
    )
  }

  return (
    <div className="h-[480px] w-full rounded-xl overflow-hidden">
      <Canvas
        dpr={[1, 2]}
        frameloop="demand"
        camera={{ position: [0, 3, 5], fov: 45 }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
