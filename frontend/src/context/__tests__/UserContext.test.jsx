import { renderHook, act } from '@testing-library/react'
import { UserProvider, useUser } from '../UserContext'
import { vi, describe, test, expect } from 'vitest'

vi.mock('../../services/authService', () => ({
  authService: {
    getToken: vi.fn(),
    getProfile: vi.fn(),
    login: vi.fn(),
    logout: vi.fn()
  }
}))

import { authService } from '../../services/authService'

describe('UserContext', () => {

  const wrapper = ({ children }) => (
    <UserProvider>{children}</UserProvider>
  )

  test('login calls auth service', async () => {

    authService.login.mockResolvedValue({
      access_token: 'token'
    })

    authService.getProfile.mockResolvedValue({
      full_name: 'Test User',
      email: 'test@test.com'
    })

    const { result } = renderHook(
      () => useUser(),
      { wrapper }
    )

    await act(async () => {
      await result.current.login({
        email: 'test@test.com',
        password: '123'
      })
    })

    expect(authService.login).toHaveBeenCalled()
  })

  test('logout clears user', () => {

    const { result } = renderHook(
      () => useUser(),
      { wrapper }
    )

    act(() => {
      result.current.logout()
    })

    expect(authService.logout).toHaveBeenCalled()
  })

})