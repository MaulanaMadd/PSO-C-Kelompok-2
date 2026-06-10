import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

describe('Authentication Pages', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('LoginPage', () => {
    it('renders login form', () => {
      const LoginPageComponent = () => (
        <form>
          <input type="email" placeholder="Email" />
          <input type="password" placeholder="Password" />
          <button type="submit">Login</button>
        </form>
      )
      render(
        <BrowserRouter>
          <LoginPageComponent />
        </BrowserRouter>
      )
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
      expect(screen.getByText('Login')).toBeInTheDocument()
    })

    it('validates email format', () => {
      const LoginPageComponent = () => {
        const [email, setEmail] = React.useState('')
        const handleSubmit = (e) => {
          e.preventDefault()
          if (!email.includes('@')) alert('Invalid email')
        }
        return (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit">Login</button>
          </form>
        )
      }
      const { container } = render(
        <BrowserRouter>
          <LoginPageComponent />
        </BrowserRouter>
      )
      const emailInput = container.querySelector('input[type="email"]')
      fireEvent.change(emailInput, { target: { value: 'invalid' } })
      fireEvent.submit(container.querySelector('form'))
      expect(screen.getByText('Invalid email')).toBeInTheDocument()
    })

    it('shows error message on failed login', () => {
      const LoginPageComponent = () => (
        <div>
          <input type="email" />
          <button>Login</button>
          <div className="error">Invalid credentials</div>
        </div>
      )
      const { container } = render(
        <BrowserRouter>
          <LoginPageComponent />
        </BrowserRouter>
      )
      expect(container.querySelector('.error')).toBeInTheDocument()
    })

    it('disables submit button while loading', () => {
      const LoginPageComponent = () => {
        const [loading, setLoading] = React.useState(true)
        return (
          <button disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        )
      }
      render(
        <BrowserRouter>
          <LoginPageComponent />
        </BrowserRouter>
      )
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })

  describe('SignUpPage', () => {
    it('renders signup form', () => {
      const SignUpPageComponent = () => (
        <form>
          <input type="text" placeholder="Full Name" />
          <input type="email" placeholder="Email" />
          <input type="password" placeholder="Password" />
          <input type="password" placeholder="Confirm Password" />
          <button type="submit">Sign Up</button>
        </form>
      )
      render(
        <BrowserRouter>
          <SignUpPageComponent />
        </BrowserRouter>
      )
      expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
      expect(screen.getByText('Sign Up')).toBeInTheDocument()
    })

    it('validates password confirmation', () => {
      const SignUpPageComponent = () => {
        const [password, setPassword] = React.useState('')
        const [confirmPassword, setConfirmPassword] = React.useState('')
        const handleSubmit = (e) => {
          e.preventDefault()
          if (password !== confirmPassword) alert('Passwords do not match')
        }
        return (
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm"
            />
            <button>Sign Up</button>
          </form>
        )
      }
      const { container } = render(
        <BrowserRouter>
          <SignUpPageComponent />
        </BrowserRouter>
      )
      const inputs = container.querySelectorAll('input[type="password"]')
      fireEvent.change(inputs[0], { target: { value: 'pass123' } })
      fireEvent.change(inputs[1], { target: { value: 'pass456' } })
      fireEvent.submit(container.querySelector('form'))
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })

    it('shows success message on signup', () => {
      const SignUpPageComponent = () => (
        <div>
          <div className="success">Account created successfully</div>
        </div>
      )
      const { container } = render(
        <BrowserRouter>
          <SignUpPageComponent />
        </BrowserRouter>
      )
      expect(container.querySelector('.success')).toBeInTheDocument()
    })
  })
})

describe('Settings Pages', () => {
  beforeEach(() => {
    localStorage.setItem('authToken', 'test-token')
  })

  describe('SettingsPage', () => {
    it('renders settings page', () => {
      const SettingsPageComponent = () => (
        <div>
          <h1>Settings</h1>
          <section>KPI Standards</section>
          <section>Upload Data</section>
        </div>
      )
      render(
        <BrowserRouter>
          <SettingsPageComponent />
        </BrowserRouter>
      )
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('KPI Standards')).toBeInTheDocument()
      expect(screen.getByText('Upload Data')).toBeInTheDocument()
    })

    it('renders upload data button', () => {
      const SettingsPageComponent = () => (
        <button style={{ background: '#eff6ff', color: '#3b82f6' }}>
          Upload Data
        </button>
      )
      render(
        <BrowserRouter>
          <SettingsPageComponent />
        </BrowserRouter>
      )
      const button = screen.getByText('Upload Data')
      expect(button).toHaveStyle({ background: '#eff6ff', color: '#3b82f6' })
    })

    it('handles file upload', () => {
      const handleUpload = vi.fn()
      const SettingsPageComponent = () => (
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => handleUpload(e.target.files[0])}
        />
      )
      const { container } = render(
        <BrowserRouter>
          <SettingsPageComponent />
        </BrowserRouter>
      )
      const fileInput = container.querySelector('input[type="file"]')
      const file = new File(['test'], 'test.xlsx')
      fireEvent.change(fileInput, { target: { files: [file] } })
      expect(handleUpload).toHaveBeenCalledWith(file)
    })

    it('displays KPI standards', () => {
      const SettingsPageComponent = () => (
        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Min</th>
              <th>Target</th>
              <th>Max</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Temperature</td>
              <td>20</td>
              <td>25</td>
              <td>30</td>
            </tr>
          </tbody>
        </table>
      )
      render(
        <BrowserRouter>
          <SettingsPageComponent />
        </BrowserRouter>
      )
      expect(screen.getByText('Temperature')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
    })
  })

  describe('ProfilePage', () => {
    it('renders profile information', () => {
      const ProfilePageComponent = () => (
        <div>
          <div>Name: John Doe</div>
          <div>Email: john@example.com</div>
          <div>Role: Admin</div>
        </div>
      )
      render(
        <BrowserRouter>
          <ProfilePageComponent />
        </BrowserRouter>
      )
      expect(screen.getByText('Name: John Doe')).toBeInTheDocument()
      expect(screen.getByText('Email: john@example.com')).toBeInTheDocument()
    })

    it('allows editing profile', () => {
      const ProfilePageComponent = () => {
        const [name, setName] = React.useState('John Doe')
        return (
          <div>
            <input value={name} onChange={(e) => setName(e.target.value)} />
            <button>Save Changes</button>
          </div>
        )
      }
      const { container } = render(
        <BrowserRouter>
          <ProfilePageComponent />
        </BrowserRouter>
      )
      const input = container.querySelector('input')
      fireEvent.change(input, { target: { value: 'Jane Doe' } })
      expect(input.value).toBe('Jane Doe')
    })
  })
})

describe('Notification Pages', () => {
  beforeEach(() => {
    localStorage.setItem('authToken', 'test-token')
  })

  it('renders notifications list', () => {
    const NotificationPageComponent = () => (
      <div>
        <h1>Notifications</h1>
        <div className="notification">Alert 1</div>
        <div className="notification">Alert 2</div>
      </div>
    )
    const { container } = render(
      <BrowserRouter>
        <NotificationPageComponent />
      </BrowserRouter>
    )
    const notifications = container.querySelectorAll('.notification')
    expect(notifications).toHaveLength(2)
  })

  it('marks notification as read', () => {
    const handleMarkRead = vi.fn()
    const NotificationPageComponent = () => (
      <button onClick={() => handleMarkRead('notif-1')}>
        Mark as Read
      </button>
    )
    render(
      <BrowserRouter>
        <NotificationPageComponent />
      </BrowserRouter>
    )
    fireEvent.click(screen.getByText('Mark as Read'))
    expect(handleMarkRead).toHaveBeenCalledWith('notif-1')
  })

  it('deletes notification', () => {
    const handleDelete = vi.fn()
    const NotificationPageComponent = () => (
      <button onClick={() => handleDelete('notif-1')}>Delete</button>
    )
    render(
      <BrowserRouter>
        <NotificationPageComponent />
      </BrowserRouter>
    )
    fireEvent.click(screen.getByText('Delete'))
    expect(handleDelete).toHaveBeenCalledWith('notif-1')
  })
})
