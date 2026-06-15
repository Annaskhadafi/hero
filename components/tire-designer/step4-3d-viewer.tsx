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
import type { DesignerState, PatternConfig } from '@/app/dashboard/repair-retread/pattern-designer/pattern-designer-client'
import type { TireSizePreset } from '@/db/schema/tire-pattern'
import { drawPattern } from './utils'
import { cn } from '@/lib/utils'

interface Props {
  state: DesignerState
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: any
  presets: TireSizePreset[]
  onNext: () => void
  onBack: () => void
}

const PATTERN_TYPES = [
  { id: 'zig-zag', label: 'Zig-Zag', icon: '⚡' },
  { id: 'lug', label: 'Lug', icon: '🟫' },
  { id: 'rib', label: 'Rib', icon: '〰️' },
  { id: 'block', label: 'Block', icon: '⬛' },
  { id: 'mixed', label: 'Mixed', icon: '🔀' },
  { id: 'traction', label: 'Traction (OTR)', icon: '🚜' },
  { id: 'custom', label: 'Custom', icon: '✏️' },
] as const

export default function Step4ThreeDViewer({ state, dispatch, presets, onNext, onBack }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const offscreenCanvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const tireGroupRef = useRef<THREE.Group | null>(null)
  const tireMeshRef = useRef<THREE.Mesh | null>(null)
  const rimMeshRef = useRef<THREE.Mesh | null>(null)
  const textureRef = useRef<THREE.Texture | null>(null)
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null)
  const sideLightRef = useRef<THREE.DirectionalLight | null>(null)
  
  const animFrameRef = useRef<number>(0)
  const [isAutoRotate, setIsAutoRotate] = useState(true)
  const [lightIntensity, setLightIntensity] = useState(70)
  const [isThreeLoaded, setIsThreeLoaded] = useState(true)
  const [isTaking, setIsTaking] = useState(false)

  const dims = state.tireDimensions!
  const patternDataUrl = state.patternCanvasDataUrl

  // ─── Local Configuration State for Real-time adjustments ─────────────────────
  const [localConfig, setLocalConfig] = useState<PatternConfig>(() => ({
    type: state.patternConfig?.type || 'zig-zag',
    grooveAngle: state.patternConfig?.grooveAngle ?? 45,
    grooveWidthMm: state.patternConfig?.grooveWidthMm ?? 8,
    grooveDepthMm: state.patternConfig?.grooveDepthMm ?? 12,
    patternDensity: state.patternConfig?.patternDensity ?? 50,
    repeatUnitMm: state.patternConfig?.repeatUnitMm ?? 42,
    hasCenterGroove: state.patternConfig?.hasCenterGroove ?? false,
    hasLateralGrooves: state.patternConfig?.hasLateralGrooves ?? true,
  }))

  const isAutoRotateRef = useRef(isAutoRotate)
  useEffect(() => {
    isAutoRotateRef.current = isAutoRotate
  }, [isAutoRotate])

  // ─── Offscreen Canvas Redraw Loop ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = offscreenCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw the 2D pattern offscreen
    drawPattern(ctx, localConfig, canvas.width, canvas.height)
    
    // Generate new Data URL and send it to global state
    const dataUrl = canvas.toDataURL('image/png')
    dispatch({ type: 'SET_PATTERN_CONFIG', config: localConfig })
    dispatch({ type: 'SET_PATTERN_SVG', svg: '', dataUrl })
  }, [localConfig, dispatch])

  // ─── Texture swap listener ───────────────────────────────────────────────────
  useEffect(() => {
    if (!patternDataUrl || !textureRef.current) return
    
    const loader = new THREE.TextureLoader()
    loader.load(patternDataUrl, (tex) => {
      if (textureRef.current) {
        textureRef.current.image = tex.image
        textureRef.current.needsUpdate = true
      }
    })
  }, [patternDataUrl])

  // ─── Lighting slider listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (dirLightRef.current && sideLightRef.current) {
      const baseIntensity = Math.max(2.5, (lightIntensity / 50) * 2.0)
      dirLightRef.current.intensity = baseIntensity
      sideLightRef.current.intensity = baseIntensity * 0.6
    }
  }, [lightIntensity])

  // ─── Tire dimension scaling listener ──────────────────────────────────────────
  useEffect(() => {
    if (tireMeshRef.current && rimMeshRef.current) {
      // Scale width of the tire (Z axis) dynamically to represent width differences
      const zScale = Math.min(1.2, Math.max(0.65, (dims.treadWidthMm / 350) * 0.8))
      tireMeshRef.current.scale.set(1, 1, zScale)
      // Scale length of rim cylinder to match tire width
      rimMeshRef.current.scale.set(1, zScale, 1)
    }
  }, [dims])

  // ─── Initialize Three.js Scene once on mount ──────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return

    const container = mountRef.current
    const width = container.clientWidth
    const height = container.clientHeight || 580

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0f172a') // Dark HERO Slate
    sceneRef.current = scene

    // Camera — 3/4 angle view for premium presentation
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(2.8, 1.0, 3.4)
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
    controls.minDistance = 1.6
    controls.maxDistance = 5.5

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, Math.max(2.5, (lightIntensity / 50) * 2.0))
    dirLight.position.set(6, 6, 6)
    dirLight.castShadow = true
    scene.add(dirLight)
    dirLightRef.current = dirLight

    const sideLight = new THREE.DirectionalLight(0xffeedd, 1.5)
    sideLight.position.set(-6, 2, -4)
    scene.add(sideLight)
    sideLightRef.current = sideLight

    const rimLight = new THREE.PointLight(0xffffff, 1.2, 15)
    rimLight.position.set(0, 4, 3)
    scene.add(rimLight)

    // Group for tire & rim
    const tireGroup = new THREE.Group()
    scene.add(tireGroup)
    tireGroupRef.current = tireGroup

    // Tire mesh
    const tireGeom = new THREE.TorusGeometry(1.2, 0.48, 32, 128)
    
    // Texture creation
    const loader = new THREE.TextureLoader()
    let texture: THREE.Texture
    if (patternDataUrl) {
      texture = loader.load(patternDataUrl)
    } else {
      const placeholderCanvas = document.createElement('canvas')
      placeholderCanvas.width = 2
      placeholderCanvas.height = 2
      const pCtx = placeholderCanvas.getContext('2d')!
      pCtx.fillStyle = '#2a2a2a'
      pCtx.fillRect(0, 0, 2, 2)
      texture = new THREE.CanvasTexture(placeholderCanvas)
    }

    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.rotation = Math.PI / 2
    texture.center.set(0.5, 0.5)
    texture.repeat.set(3.3, 1)
    textureRef.current = texture

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.42,
      metalness: 0.05,
      bumpMap: texture,
      bumpScale: 0.28,
    })

    const tire = new THREE.Mesh(tireGeom, material)
    tire.castShadow = true
    const initZScale = Math.min(1.2, Math.max(0.65, (dims.treadWidthMm / 350) * 0.8))
    tire.scale.set(1, 1, initZScale)
    tireGroup.add(tire)
    tireMeshRef.current = tire

    // Rim outer barrel
    const rimGeom = new THREE.CylinderGeometry(0.72, 0.72, 0.38, 48)
    const rimMat = new THREE.MeshStandardMaterial({ 
      color: 0x475569,
      metalness: 0.7, 
      roughness: 0.3 
    })
    const rim = new THREE.Mesh(rimGeom, rimMat)
    rim.rotation.x = Math.PI / 2
    rim.scale.set(1, initZScale, 1)
    tireGroup.add(rim)
    rimMeshRef.current = rim

    // Rim disc
    const discGeom = new THREE.CylinderGeometry(0.70, 0.70, 0.06, 48)
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.2
    })
    const disc = new THREE.Mesh(discGeom, discMat)
    disc.rotation.x = Math.PI / 2
    disc.position.z = 0.03
    tireGroup.add(disc)

    // Hub cap
    const hubGeom = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 24)
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.1
    })
    const hub = new THREE.Mesh(hubGeom, hubMat)
    hub.rotation.x = Math.PI / 2
    hub.position.z = 0.06
    tireGroup.add(hub)

    // Floor
    const floorGeom = new THREE.PlaneGeometry(20, 20)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 1.0 })
    const floor = new THREE.Mesh(floorGeom, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -1.8
    floor.receiveShadow = true
    scene.add(floor)

    // Initial group placement
    tireGroup.rotation.y = 0.3
    tireGroup.rotation.x = 0.1

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate)
      if (isAutoRotateRef.current && tireGroup) {
        tireGroup.rotation.y += 0.005
      }
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize handler
    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight || 580
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
  }, [])

  // ─── Actions handlers ─────────────────────────────────────────────────────────
  const handleSizePresetChange = (code: string) => {
    const preset = presets.find((p) => p.code === code)
    if (preset) {
      const d = {
        sectionWidthMm: preset.sectionWidth,
        aspectRatio: preset.aspectRatio,
        rimDiameterMm: preset.rimDiameterMm,
        circumferenceMm: preset.circumferenceMm,
        treadWidthMm: preset.treadWidthMm,
        sizeCode: preset.code,
      }
      dispatch({ type: 'SET_TIRE_SIZE', dimensions: d })
      toast.success(`Ukuran diubah: ${preset.code}`)
    }
  }

  const handleConfigChange = (key: keyof PatternConfig, value: number | string | boolean) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleScreenshot = () => {
    const renderer = rendererRef.current
    if (!renderer) {
      toast.error('Renderer belum siap')
      return
    }
    setIsTaking(true)
    try {
      const dataUrl = renderer.domElement.toDataURL('image/png')
      dispatch({ type: 'SET_SCREENSHOT_3D', url: dataUrl })

      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `3D-ban-${dims.sizeCode}.png`
      a.click()
      toast.success('Screenshot berhasil disimpan!')
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hidden offscreen canvas to render texture updates dynamically */}
      <canvas
        ref={offscreenCanvasRef}
        width={700}
        height={380}
        className="hidden"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Sidebar Controls (4 columns) ────────────────────────────────────── */}
        <div className="lg:col-span-4 bg-white rounded-xl border shadow-sm p-5 space-y-6 flex flex-col h-[580px] overflow-y-auto scrollbar-thin scrollbar-thumb-accent">
          <div>
            <h2 className="font-bold text-[#0f172a] text-base">⚙️ Parameter &amp; Visual</h2>
            <p className="text-xs text-[#64748b]">Sesuaikan ukuran, motif, dan visualisasi 3D secara langsung</p>
          </div>

          {/* SECTION: TIRE SIZE */}
          <div className="space-y-2 border-t pt-4">
            <Label className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Ukuran Ban</Label>
            <select
              value={dims.sizeCode}
              onChange={(e) => handleSizePresetChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-2 text-sm bg-white font-mono text-[#0f172a] focus:ring-1 focus:ring-amber-500 focus:outline-none"
            >
              {presets.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.code} ({p.category?.toUpperCase() || ''})
                </option>
              ))}
            </select>
          </div>

          {/* SECTION: MOTIF TYPE */}
          <div className="space-y-2 border-t pt-4">
            <Label className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Tipe Motif</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {PATTERN_TYPES.map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => handleConfigChange('type', pt.id)}
                  className={cn(
                    'text-xs py-2 px-1 rounded-lg border transition-all text-center flex flex-col items-center justify-center gap-1',
                    localConfig.type === pt.id
                      ? 'border-amber-500 bg-amber-50 text-amber-800 font-semibold shadow-sm'
                      : 'border-gray-200 hover:border-amber-300 text-gray-700 bg-white',
                  )}
                >
                  <span className="text-lg">{pt.icon}</span>
                  <span>{pt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION: MOTIF DETAIL SLIDERS */}
          <div className="space-y-4 border-t pt-4">
            <Label className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Konfigurasi Alur</Label>
            
            {/* Sudut */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#64748b]">Sudut Alur</span>
                <span className="font-mono font-bold text-amber-700">{localConfig.grooveAngle}°</span>
              </div>
              <Slider
                min={0} max={90} step={5}
                value={[localConfig.grooveAngle]}
                onValueChange={([v]) => handleConfigChange('grooveAngle', v)}
                className="[&_[role=slider]]:bg-amber-500"
              />
            </div>

            {/* Lebar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#64748b]">Lebar Alur</span>
                <span className="font-mono font-bold text-amber-700">{localConfig.grooveWidthMm} mm</span>
              </div>
              <Slider
                min={4} max={20} step={1}
                value={[localConfig.grooveWidthMm]}
                onValueChange={([v]) => handleConfigChange('grooveWidthMm', v)}
                className="[&_[role=slider]]:bg-amber-500"
              />
            </div>

            {/* Kedalaman */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#64748b]">Kedalaman Alur</span>
                <span className="font-mono font-bold text-amber-700">{localConfig.grooveDepthMm} mm</span>
              </div>
              <Slider
                min={6} max={25} step={1}
                value={[localConfig.grooveDepthMm]}
                onValueChange={([v]) => handleConfigChange('grooveDepthMm', v)}
                className="[&_[role=slider]]:bg-amber-500"
              />
            </div>

            {/* Unit Repeat */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#64748b]">Unit Repeat</span>
                <span className="font-mono font-bold text-amber-700">{localConfig.repeatUnitMm} mm</span>
              </div>
              <Slider
                min={20} max={120} step={2}
                value={[localConfig.repeatUnitMm]}
                onValueChange={([v]) => handleConfigChange('repeatUnitMm', v)}
                className="[&_[role=slider]]:bg-amber-500"
              />
            </div>

            {/* Kerapatan */}
            {['lug', 'block', 'mixed'].includes(localConfig.type) && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748b]">Kerapatan Motif</span>
                  <span className="font-mono font-bold text-amber-700">{localConfig.patternDensity}%</span>
                </div>
                <Slider
                  min={20} max={80} step={5}
                  value={[localConfig.patternDensity]}
                  onValueChange={([v]) => handleConfigChange('patternDensity', v)}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>
            )}
          </div>

          {/* SECTION: 3D VIEW CONTROLS */}
          <div className="space-y-4 border-t pt-4">
            <Label className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Kontrol Kamera &amp; Cahaya</Label>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#64748b]">Auto Putar Ban</span>
              <Switch checked={isAutoRotate} onCheckedChange={setIsAutoRotate} />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#64748b]">Kekuatan Cahaya</span>
                <span className="font-mono font-bold text-[#0f172a]">{lightIntensity}%</span>
              </div>
              <Slider
                min={10} max={100} step={10}
                value={[lightIntensity]}
                onValueChange={([v]) => setLightIntensity(v)}
                className="[&_[role=slider]]:bg-[#0f172a]"
              />
            </div>
          </div>

          {/* SECTION: SCREENSHOT BUTTONS */}
          <div className="grid grid-cols-2 gap-2 border-t pt-4 mt-auto">
            <Button
              onClick={handleScreenshot}
              disabled={!isThreeLoaded || isTaking}
              className="bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs h-9 gap-1"
            >
              <Camera className="w-3.5 h-3.5" />
              Capture
            </Button>
            <Button
              onClick={handleScreenshot}
              disabled={!isThreeLoaded}
              variant="outline"
              className="text-xs h-9 gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh PNG
            </Button>
          </div>
        </div>

        {/* ── 3D Viewer Container (8 columns) ─────────────────────────────────── */}
        <div className="lg:col-span-8 bg-[#0f172a] rounded-xl border border-gray-700 overflow-hidden relative h-[580px] flex flex-col justify-between shadow-inner">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <div className="bg-black/70 backdrop-blur-md text-white text-xs px-3 py-2 rounded-lg font-mono flex items-center gap-2 border border-gray-800">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              🛞 {dims.sizeCode} — {localConfig.type.toUpperCase()}
            </div>
          </div>

          {/* Three.js mount point */}
          <div
            ref={mountRef}
            className="w-full flex-1"
            style={{ height: 580 }}
          />

          {!isThreeLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f172a] z-20">
              <div className="w-16 h-16 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center animate-spin">
                <span className="text-3xl">🛞</span>
              </div>
              <p className="text-white font-semibold mt-4">Memuat Visualisasi 3D...</p>
            </div>
          )}

          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-10 pointer-events-none">
            <button
              onClick={() => {
                if (tireGroupRef.current) {
                  tireGroupRef.current.rotation.set(0.1, 0.3, 0)
                }
              }}
              className="bg-black/70 backdrop-blur-md text-white text-xs px-3 py-2 rounded-lg hover:bg-black/90 transition-all flex items-center gap-1.5 border border-gray-800 pointer-events-auto shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Posisi
            </button>
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-2.5 py-1.5 rounded-md backdrop-blur-sm">
              💡 Drag Kiri: Putar • Drag Kanan: Geser • Scroll: Zoom
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between border-t pt-4">
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
