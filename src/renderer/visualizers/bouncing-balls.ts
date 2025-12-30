/**
 * Bouncing Balls Visualizer
 * Balls bounce with gravity, frequency controls bounce height
 * Beat detection triggers new balls - starts with initial balls
 */

export interface BouncingBallsOptions {
  container: HTMLElement
  colorScheme?: string
  maxBalls?: number
}

const colorSchemes: Record<string, string[]> = {
  classic: ['#00ff00', '#44ff00', '#88ff00', '#ccff00'],
  blue: ['#0066ff', '#0099ff', '#00ccff', '#00eeff'],
  purple: ['#6600ff', '#9900ff', '#cc00ff', '#ff00ff'],
  fire: ['#ff0000', '#ff3300', '#ff6600', '#ff9900'],
  ice: ['#00aaff', '#00ccff', '#00eeff', '#ffffff'],
  light: ['#cccccc', '#dddddd', '#eeeeee', '#ffffff'],
  dark: ['#2a4a6e', '#3a5a7e', '#4a6a8e', '#5a7a9e'],
  rainbow: ['#ff0000', '#00ff00', '#0000ff', '#ffff00']
}

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  bounceCount: number
  freqBand: number
  hue: number
}

export class BouncingBallsVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private animationId: number | null = null
  private colorScheme: string
  private balls: Ball[] = []
  private maxBalls: number
  private gravity: number = 0.4
  private bounceDamping: number = 0.75
  private lastBassEnergy: number = 0
  private hue: number = 0
  private initialized: boolean = false

  constructor(options: BouncingBallsOptions) {
    this.canvas = document.createElement('canvas')
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    options.container.appendChild(this.canvas)

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    this.ctx = ctx

    this.colorScheme = options.colorScheme || 'classic'
    this.maxBalls = options.maxBalls || 30

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
    this.balls = []
    this.initialized = false
    this.draw()
  }

  private spawnBall(x: number, energy: number): void {
    const height = this.canvas.height / window.devicePixelRatio
    const colors = colorSchemes[this.colorScheme] || colorSchemes.classic
    const freqBand = Math.floor(Math.random() * 8)

    let color: string
    if (this.colorScheme === 'rainbow') {
      color = `hsl(${this.hue + Math.random() * 60}, 100%, 60%)`
    } else {
      color = colors[Math.floor(Math.random() * colors.length)]
    }

    this.balls.push({
      x,
      y: height * 0.3 + Math.random() * height * 0.4,
      vx: (Math.random() - 0.5) * 6,
      vy: -(5 + energy * 15),
      radius: 8 + energy * 15,
      color,
      bounceCount: 0,
      freqBand,
      hue: this.hue + Math.random() * 60
    })
  }

  private draw = (): void => {
    if (!this.analyser || !this.dataArray) return

    this.animationId = requestAnimationFrame(this.draw)

    this.analyser.getByteFrequencyData(this.dataArray)

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    this.ctx.clearRect(0, 0, width, height)

    // Calculate bass energy for beat detection
    const bassEnd = Math.floor(this.dataArray.length * 0.1)
    let bassEnergy = 0
    for (let i = 0; i < bassEnd; i++) {
      bassEnergy += this.dataArray[i]
    }
    bassEnergy = bassEnergy / bassEnd / 255

    // Spawn initial balls if not yet initialized
    if (!this.initialized) {
      for (let i = 0; i < 8; i++) {
        const spawnX = width * (0.1 + Math.random() * 0.8)
        this.spawnBall(spawnX, 0.5 + Math.random() * 0.3)
      }
      this.initialized = true
    }

    // Spawn new balls on beat
    if (bassEnergy > this.lastBassEnergy + 0.1 && bassEnergy > 0.25 && this.balls.length < this.maxBalls) {
      const spawnX = Math.random() * width
      this.spawnBall(spawnX, bassEnergy)
    }

    // Keep a minimum number of balls always present
    const minBalls = 5
    while (this.balls.length < minBalls) {
      const spawnX = width * (0.1 + Math.random() * 0.8)
      this.spawnBall(spawnX, 0.3 + Math.random() * 0.3)
    }

    this.lastBassEnergy = bassEnergy * 0.85 + this.lastBassEnergy * 0.15

    // Calculate energy per frequency band
    const bandSize = Math.floor(this.dataArray.length / 8)
    const bandEnergies: number[] = []
    for (let i = 0; i < 8; i++) {
      let sum = 0
      for (let j = 0; j < bandSize; j++) {
        sum += this.dataArray[i * bandSize + j]
      }
      bandEnergies.push(sum / bandSize / 255)
    }

    // Update and draw balls
    this.balls = this.balls.filter(ball => {
      // Get energy for this ball's frequency band
      const bandEnergy = bandEnergies[ball.freqBand]

      // Apply gravity
      ball.vy += this.gravity

      // Add some horizontal drift based on energy
      ball.vx += (Math.random() - 0.5) * bandEnergy * 0.8

      // Dampen horizontal velocity
      ball.vx *= 0.99

      // Update position
      ball.x += ball.vx
      ball.y += ball.vy

      // Bounce off bottom
      if (ball.y + ball.radius > height) {
        ball.y = height - ball.radius
        ball.vy *= -this.bounceDamping

        // Add energy from audio on bounce
        ball.vy -= bandEnergy * 8

        ball.bounceCount++

        // Remove ball after too many bounces with low energy
        if (ball.bounceCount > 15 || (ball.bounceCount > 5 && Math.abs(ball.vy) < 2)) {
          return false
        }
      }

      // Bounce off top
      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius
        ball.vy *= -0.6
      }

      // Bounce off sides
      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius
        ball.vx *= -0.8
      } else if (ball.x + ball.radius > width) {
        ball.x = width - ball.radius
        ball.vx *= -0.8
      }

      // Scale size with band energy
      const displayRadius = ball.radius * (0.8 + bandEnergy * 0.5)

      // Draw ball glow
      const gradient = this.ctx.createRadialGradient(
        ball.x, ball.y, 0,
        ball.x, ball.y, displayRadius * 2
      )

      const ballColor = this.colorScheme === 'rainbow'
        ? `hsl(${ball.hue}, 100%, 60%)`
        : ball.color

      gradient.addColorStop(0, ballColor)
      gradient.addColorStop(0.5, `${ballColor}88`)
      gradient.addColorStop(1, 'transparent')

      this.ctx.beginPath()
      this.ctx.arc(ball.x, ball.y, displayRadius * 2, 0, Math.PI * 2)
      this.ctx.fillStyle = gradient
      this.ctx.fill()

      // Draw ball core
      this.ctx.beginPath()
      this.ctx.arc(ball.x, ball.y, displayRadius, 0, Math.PI * 2)
      this.ctx.fillStyle = ballColor
      this.ctx.shadowBlur = 15 + bandEnergy * 20
      this.ctx.shadowColor = ballColor
      this.ctx.fill()

      // Draw highlight
      this.ctx.beginPath()
      this.ctx.arc(
        ball.x - displayRadius * 0.3,
        ball.y - displayRadius * 0.3,
        displayRadius * 0.25,
        0, Math.PI * 2
      )
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
      this.ctx.shadowBlur = 0
      this.ctx.fill()

      // Update rainbow hue
      if (this.colorScheme === 'rainbow') {
        ball.hue = (ball.hue + 0.5) % 360
      }

      return true
    })

    this.ctx.shadowBlur = 0
    this.hue = (this.hue + 0.5) % 360
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
