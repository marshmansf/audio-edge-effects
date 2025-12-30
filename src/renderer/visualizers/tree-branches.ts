/**
 * Tree/Branches Visualizer
 * Fractal tree that grows and sways with music - larger with more spread
 */

export interface TreeBranchesOptions {
  container: HTMLElement
  colorScheme?: string
}

const colorSchemes: Record<string, { trunk: string, branch: string, leaf: string }> = {
  classic: { trunk: '#006600', branch: '#00aa00', leaf: '#00ff00' },
  blue: { trunk: '#003366', branch: '#0066aa', leaf: '#00ccff' },
  purple: { trunk: '#330066', branch: '#6600aa', leaf: '#cc00ff' },
  fire: { trunk: '#442200', branch: '#884400', leaf: '#ff6600' },
  ice: { trunk: '#224466', branch: '#4488aa', leaf: '#aaffff' },
  light: { trunk: '#666666', branch: '#aaaaaa', leaf: '#ffffff' },
  dark: { trunk: '#1a2a3e', branch: '#2a4a5e', leaf: '#4a7a9e' },
  rainbow: { trunk: '#444444', branch: '#666666', leaf: '#ffffff' }
}

export class TreeBranchesVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private time: number = 0
  private hue: number = 0

  constructor(options: TreeBranchesOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'

    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
  }

  private handleResize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect()
    if (rect) {
      this.canvas.width = rect.width * window.devicePixelRatio
      this.canvas.height = rect.height * window.devicePixelRatio
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
  }

  init(analyser: AnalyserNode): void {
    this.analyser = analyser
    this.dataArray = new Uint8Array(analyser.frequencyBinCount)
    this.draw()
  }

  private drawBranch(
    x: number, y: number, length: number, angle: number,
    depth: number, maxDepth: number,
    bassEnergy: number, midEnergy: number, highEnergy: number
  ): void {
    if (depth > maxDepth || length < 2) return

    const scheme = colorSchemes[this.colorScheme] || colorSchemes.classic

    // Calculate sway - more sway at branch tips
    const swayAmount = Math.sin(this.time * 2 + depth * 0.3) * bassEnergy * (0.2 + depth * 0.05)
    const actualAngle = angle + swayAmount

    // End point
    const endX = x + Math.cos(actualAngle) * length
    const endY = y + Math.sin(actualAngle) * length

    // Draw branch
    this.ctx.beginPath()
    this.ctx.moveTo(x, y)
    this.ctx.lineTo(endX, endY)

    const thickness = Math.max(1, (maxDepth - depth + 1) * 1.5)
    const progress = depth / maxDepth

    if (this.colorScheme === 'rainbow') {
      const hue = (this.hue + depth * 25) % 360
      this.ctx.strokeStyle = `hsl(${hue}, 80%, ${35 + progress * 35}%)`
      this.ctx.shadowColor = `hsl(${hue}, 100%, 60%)`
    } else if (progress < 0.3) {
      this.ctx.strokeStyle = scheme.trunk
      this.ctx.shadowColor = scheme.trunk
    } else if (progress < 0.7) {
      this.ctx.strokeStyle = scheme.branch
      this.ctx.shadowColor = scheme.branch
    } else {
      this.ctx.strokeStyle = scheme.leaf
      this.ctx.shadowColor = scheme.leaf
    }

    this.ctx.lineWidth = thickness
    this.ctx.lineCap = 'round'

    if (progress > 0.6) {
      this.ctx.shadowBlur = 5 + highEnergy * 15
    } else {
      this.ctx.shadowBlur = 0
    }

    this.ctx.stroke()

    // Draw leaf/blossom at tips
    if (depth >= maxDepth - 1 || length < 8) {
      const leafSize = 3 + highEnergy * 6

      const gradient = this.ctx.createRadialGradient(endX, endY, 0, endX, endY, leafSize * 2)
      if (this.colorScheme === 'rainbow') {
        const hue = (this.hue + depth * 30) % 360
        gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.8)`)
        gradient.addColorStop(1, 'transparent')
      } else {
        gradient.addColorStop(0, scheme.leaf)
        gradient.addColorStop(1, 'transparent')
      }

      this.ctx.beginPath()
      this.ctx.arc(endX, endY, leafSize * 2, 0, Math.PI * 2)
      this.ctx.fillStyle = gradient
      this.ctx.shadowBlur = 8 + highEnergy * 12
      this.ctx.fill()

      this.ctx.shadowBlur = 0
    }

    // Branch spread - wider angles, affected by mid energy
    const spreadAngle = (0.35 + midEnergy * 0.35)
    const nextLength = length * (0.68 + midEnergy * 0.08)

    // Recursive branches
    if (depth < maxDepth) {
      // Right branch
      this.drawBranch(
        endX, endY, nextLength,
        actualAngle - spreadAngle,
        depth + 1, maxDepth,
        bassEnergy, midEnergy, highEnergy
      )

      // Left branch
      this.drawBranch(
        endX, endY, nextLength,
        actualAngle + spreadAngle,
        depth + 1, maxDepth,
        bassEnergy, midEnergy, highEnergy
      )

      // Sometimes add a middle branch for more fullness
      if (midEnergy > 0.4 && depth < maxDepth - 2 && Math.random() < 0.5) {
        this.drawBranch(
          endX, endY, nextLength * 0.7,
          actualAngle + (Math.random() - 0.5) * 0.3,
          depth + 1, maxDepth,
          bassEnergy, midEnergy, highEnergy
        )
      }
    }
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    this.ctx.clearRect(0, 0, width, height)

    // Calculate frequency band energies
    const bassEnd = Math.floor(this.dataArray.length * 0.15)
    const midEnd = Math.floor(this.dataArray.length * 0.5)

    let bassEnergy = 0
    for (let i = 0; i < bassEnd; i++) {
      bassEnergy += this.dataArray[i]
    }
    bassEnergy = bassEnergy / bassEnd / 255

    let midEnergy = 0
    for (let i = bassEnd; i < midEnd; i++) {
      midEnergy += this.dataArray[i]
    }
    midEnergy = midEnergy / (midEnd - bassEnd) / 255

    let highEnergy = 0
    for (let i = midEnd; i < this.dataArray.length; i++) {
      highEnergy += this.dataArray[i]
    }
    highEnergy = highEnergy / (this.dataArray.length - midEnd) / 255

    // Draw tree from bottom center - larger trunk and more room
    const startX = width / 2
    const startY = height
    const trunkLength = height * 0.35 * (0.8 + bassEnergy * 0.3)
    const maxDepth = 8 + Math.floor(midEnergy * 2)

    // Draw the tree
    this.drawBranch(
      startX, startY, trunkLength,
      -Math.PI / 2, // Pointing up
      0, maxDepth,
      bassEnergy, midEnergy, highEnergy
    )

    this.time += 0.02
    this.hue = (this.hue + 0.3) % 360
  }

  setColorScheme(scheme: string): void {
    if (colorSchemes[scheme]) {
      this.colorScheme = scheme
    }
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    this.canvas.remove()
    window.removeEventListener('resize', () => this.handleResize())
  }
}
