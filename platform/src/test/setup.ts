import '@testing-library/jest-dom/vitest'

// Recharts использует ResizeObserver — в jsdom его нет
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
