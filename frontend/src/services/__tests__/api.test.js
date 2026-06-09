import { describe, test, expect, beforeEach, vi } from 'vitest'
import api from '../api'
describe('API Interceptors', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  test('adds Authorization header when authToken exists', () => {
    localStorage.setItem('authToken', 'abc123')

    const handlers = api.interceptors.request.handlers

    const fulfilled = handlers.find(
      h => typeof h.fulfilled === 'function'
    )?.fulfilled

    const config = {
      headers: {}
    }

    const result = fulfilled(config)

    expect(result.headers.Authorization)
      .toBe('Bearer abc123')
  })

  test('does not add Authorization header when authToken does not exist', () => {
    const handlers = api.interceptors.request.handlers

    const fulfilled = handlers.find(
      h => typeof h.fulfilled === 'function'
    )?.fulfilled

    const config = {
      headers: {}
    }

    const result = fulfilled(config)

    expect(result.headers.Authorization)
      .toBeUndefined()
  })

  test('removes token on 401 response', async () => {
    localStorage.setItem('authToken', 'abc123')

    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem')

    const handlers = api.interceptors.response.handlers

    const rejected = handlers.find(
      h => typeof h.rejected === 'function'
    )?.rejected

    const error = {
      response: {
        status: 401
      }
    }

    await expect(
      rejected(error)
    ).rejects.toEqual(error)

    expect(removeSpy)
      .toHaveBeenCalledWith('authToken')
  })

  test('does not remove token on non-401 response', async () => {
    localStorage.setItem('authToken', 'abc123')

    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem')

    const handlers = api.interceptors.response.handlers

    const rejected = handlers.find(
      h => typeof h.rejected === 'function'
    )?.rejected

    const error = {
      response: {
        status: 500
      }
    }

    await expect(
      rejected(error)
    ).rejects.toEqual(error)

    expect(removeSpy)
      .not.toHaveBeenCalled()
  })

  test('request interceptor returns config object', () => {
    const handlers = api.interceptors.request.handlers

    const fulfilled = handlers.find(
      h => typeof h.fulfilled === 'function'
    )?.fulfilled

    const config = {
      headers: {}
    }

    const result = fulfilled(config)

    expect(result).toBeDefined()
    expect(result.headers).toBeDefined()
  })
})