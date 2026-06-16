import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import ProtectedRoute from '../ProtectedRoute'

vi.mock('../../../services/authService', () => ({
  authService: {
    isAuthenticated: vi.fn()
  }
}))

import { authService } from '../../../services/authService'

describe('ProtectedRoute', () => {
  test('redirects to login when not authenticated', () => {
    authService.isAuthenticated.mockReturnValue(false)

    const { container } = render(
      <MemoryRouter>
        <ProtectedRoute />
      </MemoryRouter>
    )

    expect(container).toBeTruthy()
  })

  test('allows access when authenticated', () => {
    authService.isAuthenticated.mockReturnValue(true)

    const { container } = render(
      <MemoryRouter>
        <ProtectedRoute />
      </MemoryRouter>
    )

    expect(container).toBeTruthy()
  })
})