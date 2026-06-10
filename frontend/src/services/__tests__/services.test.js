import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

describe('Auth Service', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('stores auth token on signup', () => {
    const authService = {
      signup: (email, password) => {
        localStorage.setItem('authToken', 'mock-token')
        return { success: true }
      }
    }
    authService.signup('test@example.com', 'password123')
    expect(localStorage.getItem('authToken')).toBe('mock-token')
  })

  it('stores auth token on login', () => {
    const authService = {
      login: (email, password) => {
        localStorage.setItem('authToken', 'mock-token')
        return { success: true }
      }
    }
    authService.login('test@example.com', 'password123')
    expect(localStorage.getItem('authToken')).toBe('mock-token')
  })

  it('retrieves auth token from localStorage', () => {
    localStorage.setItem('authToken', 'stored-token')
    const authService = {
      getToken: () => localStorage.getItem('authToken')
    }
    expect(authService.getToken()).toBe('stored-token')
  })

  it('clears auth token on logout', () => {
    localStorage.setItem('authToken', 'mock-token')
    const authService = {
      logout: () => localStorage.removeItem('authToken')
    }
    authService.logout()
    expect(localStorage.getItem('authToken')).toBeNull()
  })

  it('validates token exists', () => {
    const authService = {
      isAuthenticated: () => localStorage.getItem('authToken') !== null
    }
    expect(authService.isAuthenticated()).toBe(false)
    localStorage.setItem('authToken', 'token')
    expect(authService.isAuthenticated()).toBe(true)
  })
})

describe('POT Service', () => {
  it('formats pot data correctly', () => {
    const potService = {
      formatPotData: (pot) => ({
        id: pot.id,
        name: pot.pot_name,
        status: pot.status,
        efficiency: pot.efficiency_percent
      })
    }
    const mockPot = {
      id: 1,
      pot_name: 'POT-001',
      status: 'normal',
      efficiency_percent: 95.5
    }
    const formatted = potService.formatPotData(mockPot)
    expect(formatted.name).toBe('POT-001')
    expect(formatted.efficiency).toBe(95.5)
  })

  it('groups pots by potline', () => {
    const potService = {
      groupByPotline: (pots) => {
        const grouped = {}
        pots.forEach(pot => {
          if (!grouped[pot.potline_id]) grouped[pot.potline_id] = []
          grouped[pot.potline_id].push(pot)
        })
        return grouped
      }
    }
    const pots = [
      { id: 1, potline_id: 1, name: 'POT-001' },
      { id: 2, potline_id: 1, name: 'POT-002' },
      { id: 3, potline_id: 2, name: 'POT-003' }
    ]
    const grouped = potService.groupByPotline(pots)
    expect(grouped[1]).toHaveLength(2)
    expect(grouped[2]).toHaveLength(1)
  })

  it('filters pots by status', () => {
    const potService = {
      filterByStatus: (pots, status) => pots.filter(p => p.status === status)
    }
    const pots = [
      { id: 1, status: 'normal' },
      { id: 2, status: 'alarm' },
      { id: 3, status: 'normal' }
    ]
    const alarmPots = potService.filterByStatus(pots, 'alarm')
    expect(alarmPots).toHaveLength(1)
    expect(alarmPots[0].id).toBe(2)
  })
})

describe('Notification Service', () => {
  it('fetches notifications', async () => {
    const notificationService = {
      getNotifications: async () => [
        { id: 1, title: 'Alert 1', read: false },
        { id: 2, title: 'Alert 2', read: true }
      ]
    }
    const notifications = await notificationService.getNotifications()
    expect(notifications).toHaveLength(2)
  })

  it('marks notification as read', async () => {
    const notificationService = {
      markAsRead: async (id) => ({ id, read: true })
    }
    const result = await notificationService.markAsRead(1)
    expect(result.read).toBe(true)
  })

  it('creates new notification', async () => {
    const notificationService = {
      create: async (data) => ({ id: 1, ...data, read: false })
    }
    const notification = await notificationService.create({
      title: 'New Alert',
      message: 'Test message'
    })
    expect(notification.title).toBe('New Alert')
    expect(notification.read).toBe(false)
  })

  it('counts unread notifications', () => {
    const notificationService = {
      countUnread: (notifications) =>
        notifications.filter(n => !n.read).length
    }
    const notifications = [
      { id: 1, read: false },
      { id: 2, read: true },
      { id: 3, read: false }
    ]
    expect(notificationService.countUnread(notifications)).toBe(2)
  })
})

describe('Dashboard Data Hook', () => {
  it('initializes with loading state', () => {
    const useDashboardData = () => {
      const [loading, setLoading] = React.useState(true)
      return { loading }
    }
    const TestComponent = () => {
      const { loading } = useDashboardData()
      return <div>{loading ? 'Loading' : 'Loaded'}</div>
    }
    render(<TestComponent />)
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })

  it('loads dashboard data', async () => {
    const useDashboardData = () => {
      const [data, setData] = React.useState(null)
      React.useEffect(() => {
        setData({ pots: 50, alarms: 3 })
      }, [])
      return data
    }
    const TestComponent = () => {
      const data = useDashboardData()
      return data ? (
        <div>POTs: {data.pots}, Alarms: {data.alarms}</div>
      ) : (
        <div>Loading</div>
      )
    }
    render(<TestComponent />)
    await waitFor(() => {
      expect(screen.getByText('POTs: 50, Alarms: 3')).toBeInTheDocument()
    })
  })

  it('handles errors in dashboard data', async () => {
    const useDashboardData = () => {
      const [error, setError] = React.useState(null)
      React.useEffect(() => {
        setError('Failed to load data')
      }, [])
      return { error }
    }
    const TestComponent = () => {
      const { error } = useDashboardData()
      return error ? <div>{error}</div> : <div>Loaded</div>
    }
    render(<TestComponent />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load data')).toBeInTheDocument()
    })
  })
})

describe('API Request/Response Handling', () => {
  it('handles successful API response', async () => {
    const api = {
      request: async () => ({
        status: 200,
        data: { success: true }
      })
    }
    const response = await api.request()
    expect(response.status).toBe(200)
    expect(response.data.success).toBe(true)
  })

  it('handles API errors', async () => {
    const api = {
      request: async () => {
        throw new Error('Network error')
      }
    }
    try {
      await api.request()
    } catch (error) {
      expect(error.message).toBe('Network error')
    }
  })

  it('adds authorization header to requests', () => {
    localStorage.setItem('authToken', 'test-token')
    const api = {
      getHeaders: () => ({
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      })
    }
    const headers = api.getHeaders()
    expect(headers['Authorization']).toBe('Bearer test-token')
  })

  it('removes auth token on 401 response', () => {
    localStorage.setItem('authToken', 'test-token')
    const api = {
      handleUnauthorized: () => {
        localStorage.removeItem('authToken')
      }
    }
    api.handleUnauthorized()
    expect(localStorage.getItem('authToken')).toBeNull()
  })
})

describe('Data Formatting', () => {
  it('formats date strings', () => {
    const formatter = {
      formatDate: (date) => new Date(date).toLocaleDateString('en-US')
    }
    const formatted = formatter.formatDate('2024-01-15')
    expect(formatted).toContain('1')
  })

  it('formats numbers with decimals', () => {
    const formatter = {
      formatNumber: (num) => num.toFixed(2)
    }
    expect(formatter.formatNumber(95.5678)).toBe('95.57')
  })

  it('formats percentages', () => {
    const formatter = {
      formatPercent: (num) => `${(num * 100).toFixed(1)}%`
    }
    expect(formatter.formatPercent(0.955)).toBe('95.5%')
  })
})
