'use client'

import { Canvas } from '@react-three/fiber'
import { ScrollControls, Scroll, Preload } from '@react-three/drei'
import { Suspense, useState } from 'react'
import MountainExperience from './MountainExperience'
import PrayerWheelFooter from './PrayerWheelFooter'
import UIOverlay from './UIOverlay'
import CloudTransition from './CloudTransition'
import LoadingScreen from './LoadingScreen'

export default function Scene() {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <>
      {!isLoaded && <LoadingScreen />}

      <div className="canvas-container">
        <Canvas
          shadows
          camera={{ position: [80, -80, 280], fov: 50, near: 0.1, far: 3000 }}
          gl={{ antialias: true, alpha: false }}
          onCreated={() => setIsLoaded(true)}
        >
          <Suspense fallback={null}>
            {/* Ambient lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[10, 20, 10]}
              intensity={1.5}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-far={50}
              shadow-camera-left={-20}
              shadow-camera-right={20}
              shadow-camera-top={20}
              shadow-camera-bottom={-20}
            />

            {/* Hemisphere light for natural outdoor feel */}
            <hemisphereLight
              skyColor="#87CEEB"
              groundColor="#8B4513"
              intensity={0.6}
            />

            {/* ScrollControls wraps everything - 5 pages of scroll */}
            <ScrollControls pages={5} damping={0.25}>
              {/* 3D Content that responds to scroll */}
              <MountainExperience />
              <CloudTransition />
              <PrayerWheelFooter />

              {/* HTML UI Overlay - floats in foreground */}
              <Scroll html style={{ width: '100%' }}>
                <UIOverlay />
              </Scroll>
            </ScrollControls>

            <Preload all />
          </Suspense>
        </Canvas>
      </div>
    </>
  )
}
