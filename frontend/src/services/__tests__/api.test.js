import api from '../../services/api'

describe('api interceptors', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('adds Authorization header when authToken exists', () => {
    const handlers = api.interceptors.request.handlers
    const fulfilled = handlers.find(h => typeof h.fulfilled === 'function')?.fulfilled
    const config = { headers: {} }
    localStorage.setItem('authToken', 'abc123')
    const res = fulfilled(config)
    expect(res.headers.Authorization).toBe('Bearer abc123')
  })

  test('does not add Authorization header when no token', () => {
    const handlers = api.interceptors.request.handlers
    const fulfilled = handlers.find(h => typeof h.fulfilled === 'function')?.fulfilled
    const config = { headers: {} }
    const res = fulfilled(config)
    expect(res.headers.Authorization).toBeUndefined()
  })
})
