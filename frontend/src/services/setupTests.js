import { vi } from 'vitest'

Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    href: ''
  }
})

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}