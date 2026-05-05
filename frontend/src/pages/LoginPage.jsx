import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check } from 'lucide-react';
import logo from '../assets/inalum_logo.png';
import '../styles/auth.css';

import { useUser } from '../context/UserContext';
import { authService } from '../services/authService';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useUser(); // Use login from context
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login({ email, password }); // Use context login
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Invalid email or password');
    }
  };

  return (
    <div className="auth-container">
      {/* Left Panel */}
      <div className="auth-left">
        <div className="brand-logo-container">
          <img src={logo} alt="Inalum Logo" style={{ height: '40px' }} />
        </div>

        <div className="content-wrapper">
          <h1 className="app-title">OPTINA ANALYTIC DASHBOARD</h1>

          <div className="feature-list">
            <FeatureItem
              title="Early Warning Systems"
              subtitle="Advanced predictive monitoring for pot stability."
            />
            <FeatureItem
              title="Decision Support Systems"
              subtitle="Data-driven insights to optimize reduction operations."
            />
            <FeatureItem
              title="Best Practice Database"
              subtitle="Comprehensive repository of operational standards."
            />
            <FeatureItem
              title="Enterprise Ready"
              subtitle="Scalable solution engineered for high reliability."
            />
          </div>
        </div>

        <div className="copyright">
          &copy; 2026 by OJT Institut Teknologi Sepuluh Nopember
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="login-header">
          <h2>Sign In</h2>
          {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-wrapper">
              <input
                type="email"
                className="form-input"
                placeholder="email@address.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePassword}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="form-actions">
            <label className="remember-me">
              <input type="checkbox" />
              Remember me
            </label>
            <a href="#" className="forgot-password">Forgot password?</a>
          </div>

          <button type="submit" className="submit-btn">
            Sign In
          </button>

          <p className="signup-text">
            Don't have an account?
            <Link to="/signup" className="signup-link">Create new</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

const FeatureItem = ({ title, subtitle }) => (
  <div className="feature-item">
    <div className="feature-icon">
      <Check size={16} color="white" strokeWidth={4} />
    </div>
    <div className="feature-content">
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  </div>
);

export default LoginPage;
