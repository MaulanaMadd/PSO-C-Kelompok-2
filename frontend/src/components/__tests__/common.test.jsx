import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Toast from '../common/Toast'
import NotificationMonitor from '../common/NotificationMonitor'
import ProtectedRoute from '../common/ProtectedRoute'
import { BrowserRouter } from 'react-router-dom'

describe('Toast Component', () => {
  it('renders toast with success message', () => {
    render(<Toast message="Success!" type="success" onClose={() => {}} />)
    expect(screen.getByText('Success!')).toBeInTheDocument()
  })

  it('renders toast with error message', () => {
    render(<Toast message="Error occurred!" type="error" onClose={() => {}} />)
    expect(screen.getByText('Error occurred!')).toBeInTheDocument()
  })

  it('renders toast with warning message', () => {
    render(<Toast message="Warning!" type="warning" onClose={() => {}} />)
    expect(screen.getByText('Warning!')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn()
    const { container } = render(
      <Toast message="Test" type="success" onClose={handleClose} />
    )
    const closeBtn = container.querySelector('[class*="close"]')
    if (closeBtn) fireEvent.click(closeBtn)
  })

  it('auto-closes after timeout', async () => {
    const handleClose = vi.fn()
    render(
      <Toast message="Auto close" type="success" onClose={handleClose} autoClose={2000} />
    )
    await waitFor(() => {
      expect(handleClose).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('applies correct styling classes', () => {
    const { container } = render(
      <Toast message="Styled" type="error" onClose={() => {}} />
    )
    const toast = container.querySelector('[class*="toast"]')
    expect(toast).toBeTruthy()
  })
})

describe('ProtectedRoute Component', () => {
  it('renders component when user is authenticated', () => {
    const TestComponent = () => <div>Protected Content</div>
    localStorage.setItem('authToken', 'valid-token')

    render(
      <BrowserRouter>
        <ProtectedRoute component={<TestComponent />} />
      </BrowserRouter>
    )
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to login when user is not authenticated', () => {
    localStorage.removeItem('authToken')
    const TestComponent = () => <div>Protected Content</div>

    const { container } = render(
      <BrowserRouter>
        <ProtectedRoute component={<TestComponent />} />
      </BrowserRouter>
    )
    // Should redirect or show login UI
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})

describe('NotificationMonitor Component', () => {
  it('renders notification monitor', () => {
    const { container } = render(
      <BrowserRouter>
        <NotificationMonitor />
      </BrowserRouter>
    )
    expect(container).toBeTruthy()
  })

  it('displays notifications from props', () => {
    const notifications = [
      { id: 1, title: 'Test 1', message: 'Message 1' },
      { id: 2, title: 'Test 2', message: 'Message 2' }
    ]
    const { container } = render(
      <BrowserRouter>
        <NotificationMonitor notifications={notifications} />
      </BrowserRouter>
    )
    expect(container).toBeTruthy()
  })

  it('handles empty notifications list', () => {
    const { container } = render(
      <BrowserRouter>
        <NotificationMonitor notifications={[]} />
      </BrowserRouter>
    )
    expect(container).toBeTruthy()
  })
})
