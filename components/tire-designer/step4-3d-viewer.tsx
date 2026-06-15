'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Camera, RotateCcw, Download } from 'lucide-react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import type { DesignerState } from '@/app/dashboard/repair-retread/pattern-designer/pattern-designer-client'

interface Props {
  state: DesignerState
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: any
  onNext: () => void
  onBack: () => void
}

export default function Step4ThreeDViewer({ state, dispatch, onNext, onBack }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const tireRef = useRef<THREE.Group | null>(null)
  const animFrameRef = useRef<number>(0)
  const [isAutoRotate, setIsAutoRotate] = useState(true)
  const [lightIntensity, setLightIntensity] = useState(70)
  const [isThreeLoaded, setIsThreeLoaded] = useState(true)
  const [isTaking, setIsTaking] = useState(false)

  const dims = state.tireDimensions!
  const patternDataUrl = state.patternCanvasDataUrl

  useEffect(() => {
    if (!mountRef.current) return

    const container = mountRef.current
    const width = container.clientWidth
    const height = container.clientHeight || 450

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0f172a') // Dark slate to match HERO theme
    sceneRef.current = scene

    // Camera — 3/4 angle view so tire is clearly visible
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    camera.position.set(2.6, 1.2, 3.2)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 1.5
    controls.maxDistance = 6.0

    // Lighting — lower ambient, higher directional to produce strong shadows/highlights on bump edges
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    // Directional light from top-right-front
    const dirLight = new THREE.DirectionalLight(0xffffff, Math.max(2.5, (lightIntensity / 50) * 2.0))
    dirLight.position.set(6, 6, 6)
    dirLight.castShadow = true
    scene.add(dirLight)

    // Second directional light from left-back for bump highlights
    const sideLight = new THREE.DirectionalLight(0xffeedd, 1.5)
    sideLight.position.set(-6, 2, -4)
    scene.add(sideLight)

    // Rim highlight point light
    const rimLight = new THREE.PointLight(0xffffff, 1.2, 15)
    rimLight.position.set(0, 4, 3)
    scene.add(rimLight)

    // Create a group for perfect tire-rim alignment
    const tireGroup = new THREE.Group()
    scene.add(tireGroup)
    tireRef.current = tireGroup

    // Tire geometry
    const tireGeom = new THREE.TorusGeometry(1.2, 0.48, 32, 128)

    // Texture loading
    let material: THREE.MeshStandardMaterial
    const loader = new THREE.TextureLoader()

    if (patternDataUrl) {
      const texture = loader.load(patternDataUrl)
      // wrapS is for horizontal texture coordinate (U'), which maps to torus V (tube cross-section) after 90deg rotation.
      // We clamp it so the pattern is only on the tread and doesn't bleed into sidewalls.
      texture.wrapS = THREE.ClampToEdgeWrapping
      
      // wrapT is for vertical texture coordinate (V'), which maps to torus U (circumference) after 90deg rotation.
      // We repeat it around the wheel circumference.
      texture.wrapT = THREE.RepeatWrapping
      
      // Rotate texture 90 degrees so the canvas width (tread) maps to the tube cross-section (V),
      // and canvas height (circumference) wraps around the torus circumference (U).
      texture.rotation = Math.PI / 2
      texture.center.set(0.5, 0.5)
      
      // Since it is rotated 90 degrees:
      // - repeat.x (sx) controls the scale along tube cross-section (tread width) -> 3.3x to cover center 30%
      // - repeat.y (sy) controls the scale along circumference -> 1x to map exactly once
      texture.repeat.set(3.3, 1)
      texture.offset.set(0, 0) // No offset needed as Three.js centers the scale when center is set to (0.5, 0.5)
      
      material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.42, // glossier to catch reflections on the edges of carved pattern grooves
        metalness: 0.05,
        bumpMap: texture,
        bumpScale: 0.28, // significantly increased bump scale for deep carved look
      })
    } else {
      material = new THREE.MeshStandardMaterial({
        color: 0x242424,
        roughness: 0.7,
        metalness: 0.05,
      })
    }

    const tire = new THREE.Mesh(tireGeom, material)
    tire.castShadow = true
    // Scale Z axis to 0.8 to flatten the tire sidewalls so it looks like a real tire rather than a round donut
    tire.scale.set(1, 1, 0.8)
    tireGroup.add(tire)

    // Rim Outer (cylinder fitting inside the torus center)
    const rimGeom = new THREE.CylinderGeometry(0.72, 0.72, 0.38, 48)
    const rimMat = new THREE.MeshStandardMaterial({ 
      color: 0x475569, // Slate gray
      metalness: 0.7, 
      roughness: 0.3 
    })
    const rim = new THREE.Mesh(rimGeom, rimMat)
    rim.rotation.x = Math.PI / 2
    tireGroup.add(rim)

    // Rim Inner Disc (adds depth to the wheel)
    const discGeom = new THREE.CylinderGeometry(0.70, 0.70, 0.06, 48)
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Darker slate
      metalness: 0.8,
      roughness: 0.2
    })
    const disc = new THREE.Mesh(discGeom, discMat)
    disc.rotation.x = Math.PI / 2
    disc.position.z = 0.03 // offset slightly inside for depth
    tireGroup.add(disc)

    // Rim Hub Center
    const hubGeom = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 24)
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.1
    })
    const hub = new THREE.Mesh(hubGeom, hubMat)
    hub.rotation.x = Math.PI / 2
    hub.position.z = 0.06 // sticks out slightly
    tireGroup.add(hub)

    // Floor
    const floorGeom = new THREE.PlaneGeometry(20, 20)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 1.0 })
    const floor = new THREE.Mesh(floorGeom, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -1.8
    floor.receiveShadow = true
    scene.add(floor)

    // Set initial tilt on the group for better 3D perspective
    tireGroup.rotation.y = 0.3
    tireGroup.rotation.x = 0.1 // slight vertical tilt

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)
      if (isAutoRotate && tireGroup) {
        tireGroup.rotation.y += 0.006
      }
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize handler
    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight || 450
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animFrameRef.current)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patternDataUrl])

  // Update auto-rotate
  useEffect(() => {
    if (tireRef.current && !isAutoRotate) {
      // Will stop updating rotation in animation loop
    }
  }, [isAutoRotate])

  const handleScreenshot = () => {
    const renderer = rendererRef.current
    if (!renderer) {
      toast.error('Renderer belum siap')
      return
    }
    setIsTaking(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataUrl = (renderer as any).domElement.toDataURL('image/png')
      dispatch({ type: 'SET_SCREENSHOT_3D', url: dataUrl })

      // Download
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `3D-ban-${dims.sizeCode}.png`
      a.click()
      toast.success('Screenshot tersimpan!')
    } catch {
      toast.error('Gagal mengambil screenshot')
    } finally {
      setIsTaking(false)
    }
  }

  const handleNext = () => {
    if (state.screenshot3dUrl) {
      dispatch({ type: 'SET_SCREENSHOT_3D', url: state.screenshot3dUrl })
    }
    onNext()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls */}
        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-5 order-2 lg:order-1">
          <h2 className="font-semibold text-[#0f172a]">🎮 Kontrol Tampilan</h2>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <strong>Drag:</strong> Putar ban<br />
            <strong>Scroll:</strong> Zoom in/out<br />
            <strong>Klik kanan:</strong> Geser tampilan
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto Putar</Label>
              <Switch checked={isAutoRotate} onCheckedChange={setIsAutoRotate} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-[#64748b]">Pencahayaan</Label>
              <span className="text-xs font-mono">{lightIntensity}%</span>
            </div>
            <Slider
              min={10} max={100} step={10}
              value={[lightIntensity]}
              onValueChange={([v]) => setLightIntensity(v)}
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Info Ban</p>
            {[
              { label: 'Ukuran', value: dims.sizeCode },
              { label: 'Keliling', value: `${dims.circumferenceMm.toLocaleString()} mm` },
              { label: 'Tapak', value: `${dims.treadWidthMm} mm` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-[#64748b]">{label}</span>
                <span className="font-mono font-semibold text-[#0f172a]">{value}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={handleScreenshot}
            disabled={!isThreeLoaded || isTaking}
            className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white gap-2"
          >
            <Camera className="w-4 h-4" />
            {isTaking ? 'Mengambil...' : 'Screenshot'}
          </Button>
          <Button
            onClick={handleScreenshot}
            disabled={!isThreeLoaded}
            variant="outline"
            className="w-full gap-2"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </Button>
        </div>

        {/* 3D Viewer */}
        <div className="lg:col-span-3 bg-[#111827] rounded-xl border border-gray-700 overflow-hidden relative order-1 lg:order-2">
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg font-mono">
              🛞 {dims.sizeCode} — {state.patternConfig?.type || 'default'}
            </div>
          </div>

          {/* Three.js mount point */}
          <div
            ref={mountRef}
            className="w-full"
            style={{ height: 450 }}
          />

          {!isThreeLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#111827]">
              <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
                <span className="text-4xl">🛞</span>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Memuat Visualisasi 3D...</p>
                <p className="text-gray-400 text-sm mt-1">
                  Jika tidak muncul, jalankan <code className="bg-gray-700 px-1 rounded">npm install</code> di terminal
                </p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 text-xs text-gray-400 text-center max-w-sm">
                <strong className="text-amber-400">Preview gambar pola 2D:</strong><br />
                {state.patternCanvasDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={state.patternCanvasDataUrl}
                    alt="Pattern preview"
                    className="mt-2 rounded border border-gray-600 max-h-32 mx-auto"
                  />
                )}
              </div>
            </div>
          )}

          {isThreeLoaded && (
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <button
                onClick={() => {
                  if (tireRef.current) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ;(tireRef.current as any).rotation.y = 0.3
                  }
                }}
                className="bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black/80 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              <span className="bg-black/60 text-green-400 text-xs px-2 py-1 rounded">
                ● Live 3D
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Kembali
        </Button>
        <Button onClick={handleNext} className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-6 gap-2">
          Gambar Kerja
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
