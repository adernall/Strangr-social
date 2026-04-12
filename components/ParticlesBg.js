// components/ParticlesBg.js
'use client'

import { useCallback } from 'react'
import Particles from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'

export default function ParticlesBg() {
  const init = useCallback(async (engine) => {
    await loadSlim(engine)
  }, [])

  return (
    <Particles
      id="tsparticles"
      init={init}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
      }}
      options={{
        background: { color: { value: 'transparent' } },
        fpsLimit: 60,
        particles: {
          number: { value: 55, density: { enable: true, area: 900 } },
          color: { value: ['#6c63ff', '#a78bfa', '#818cf8'] },
          opacity: {
            value: { min: 0.08, max: 0.35 },
            animation: { enable: true, speed: 0.6, sync: false },
          },
          size: {
            value: { min: 1, max: 2.5 },
          },
          links: {
            enable: true,
            distance: 140,
            color: '#6c63ff',
            opacity: 0.1,
            width: 1,
          },
          move: {
            enable: true,
            speed: 0.5,
            direction: 'none',
            random: true,
            outModes: { default: 'bounce' },
          },
        },
        interactivity: {
          events: {
            onHover: { enable: true, mode: 'grab' },
          },
          modes: {
            grab: { distance: 120, links: { opacity: 0.25 } },
          },
        },
        detectRetina: true,
      }}
    />
  )
}