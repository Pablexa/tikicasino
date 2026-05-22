import { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

/**
 * The spinning GLB model.
 * It auto-rotates like a "dropped item" in a game (continuous Y rotation + bob up/down).
 * The user can also drag to rotate freely via OrbitControls.
 */
function SpinningModel({ url }) {
  const { scene } = useGLTF(url)
  const groupRef = useRef()
  const timeRef = useRef(0)

  // Center and scale the model to fit viewport nicely
  useEffect(() => {
    if (!scene) return
    const box = new THREE.Box3().setFromObject(scene)
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    box.getCenter(center)
    box.getSize(size)

    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 2.2 / maxDim
    scene.scale.setScalar(scale)

    // Re-center after scaling
    const box2 = new THREE.Box3().setFromObject(scene)
    const center2 = new THREE.Vector3()
    box2.getCenter(center2)
    scene.position.sub(center2)
  }, [scene])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    timeRef.current += delta

    // Slow continuous Y rotation — "dropped item" spin
    groupRef.current.rotation.y += delta * 0.8

    // Gentle bob up and down
    groupRef.current.position.y = Math.sin(timeRef.current * 1.2) * 0.12

    // Subtle tilt oscillation
    groupRef.current.rotation.z = Math.sin(timeRef.current * 0.6) * 0.06
  })

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  )
}

function Loader() {
  return (
    <mesh>
      <torusGeometry args={[0.4, 0.1, 16, 32]} />
      <meshStandardMaterial color="#06b6d4" wireframe />
    </mesh>
  )
}

/**
 * Main 3D Model Viewer component.
 * Renders a Canvas with the GLB model that:
 * - Auto-spins like a dropped game item
 * - Allows free drag-to-rotate via OrbitControls
 */
export default function ModelViewer({ className = '' }) {
  return (
    <div
      className={`relative ${className}`}
      style={{ cursor: 'grab' }}
    >
      {/* Glow ring behind the model */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 70%, rgba(6,182,212,0.25) 0%, transparent 70%)',
        }}
      />

      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 6, 4]} intensity={1.4} color="#ffffff" />
        <directionalLight position={[-4, 2, -4]} intensity={0.4} color="#8b5cf6" />
        <pointLight position={[0, -3, 0]} intensity={0.5} color="#06b6d4" />

        {/* Soft environment for reflections */}
        <Environment preset="city" />

        {/* The model */}
        <Suspense fallback={<Loader />}>
          <SpinningModel url="/model.glb" />
        </Suspense>

        {/* Subtle shadow on the ground */}
        <ContactShadows
          position={[0, -1.4, 0]}
          opacity={0.4}
          scale={5}
          blur={2}
          far={4}
          color="#06b6d4"
        />

        {/* Free drag-to-rotate — user can override the auto-spin */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.6}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI * 0.75}
        />
      </Canvas>

      {/* Drag hint */}
      <p
        className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-tiki-muted pointer-events-none select-none opacity-60"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        drag to rotate
      </p>
    </div>
  )
}
