import confetti from 'canvas-confetti'

/** Маленький салют в точке нажатия (нормализованные координаты 0..1). */
export function celebrateDeposit(x: number, y: number) {
  confetti({
    particleCount: 40,
    spread: 60,
    startVelocity: 22,
    gravity: 0.9,
    scalar: 0.8,
    origin: { x, y },
  })
}
