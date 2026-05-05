import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/inalum_logo.png';
import '../styles/auth.css';

import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';

const SignUpPage = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false
    });

    const [errors, setErrors] = useState({});
    const [passwordStrength, setPasswordStrength] = useState(0);

    // Password validation regex
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})/;

    useEffect(() => {
        validatePassword(formData.password);

        // Real-time mismatch check
        if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
            setErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match" }));
        } else {
            setErrors(prev => {
                const { confirmPassword, ...rest } = prev;
                return rest;
            });
        }
    }, [formData.password, formData.confirmPassword]);

    const validatePassword = (pass) => {
        let score = 0;
        if (!pass) {
            setPasswordStrength(0);
            return;
        }

        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[a-z]/.test(pass)) score += 1;
        if (/[!@#$%^&*0-9]/.test(pass)) score += 1; // Combined special or number for smoother progress

        setPasswordStrength(score);
    };

    const getStrengthBarClass = (index) => {
        if (index >= passwordStrength) return '';
        if (passwordStrength <= 2) return 'active-weak';
        if (passwordStrength === 3) return 'active-medium';
        return 'active-strong';
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        if (name !== 'confirmPassword' && name !== 'password' && errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};

        // ... (keep existing validations) ...
        if (!formData.email) newErrors.email = 'Email is required';
        if (!strongPasswordRegex.test(formData.password)) {
            // simplified message for brevity in diff
            newErrors.password = 'Password must be strong (8+ chars, upper, lower, number, special).';
        }
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        if (!formData.agreeTerms) {
            newErrors.agreeTerms = 'You must agree to the terms';
        }

        setErrors(prev => ({ ...prev, ...newErrors }));

        if (Object.keys(newErrors).length === 0 && !errors.confirmPassword) {
            try {
                // Register
                await authService.signup({
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.email.split('@')[0] // Default name
                });

                // Auto-login after signup
                await authService.login({ email: formData.email, password: formData.password });

                alert('Account created successfully!');
                navigate('/dashboard');
            } catch (err) {
                console.error(err);
                const detail = err.response?.data?.detail;
                let message = 'Registration failed';

                if (detail) {
                    if (typeof detail === 'string') {
                        message = detail;
                    } else if (Array.isArray(detail)) {
                        // FastAPI validation errors are arrays
                        message = detail.map(d => d.msg).join(', ');
                    } else if (typeof detail === 'object') {
                        message = JSON.stringify(detail);
                    }
                }
                alert(message);
            }
        }
    };

    return (
        <div className="auth-container">
            {/* Left Panel - Reused from shared design */}
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

                <div className="copyright">&copy; 2026</div>
            </div>

            {/* Right Panel */}
            <div className="auth-right">
                <div className="login-header">
                    <h2>Sign Up</h2>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Email */}
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <div className="input-wrapper">
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                placeholder="email@address.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                className="form-input"
                                placeholder="Type a strong password..."
                                value={formData.password}
                                onChange={handleChange}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        {/* Strength Meter */}
                        <div className="strength-meter">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`strength-bar ${getStrengthBarClass(i)}`} />
                            ))}
                        </div>
                        {errors.password && <span className="validation-text">{errors.password}</span>}
                    </div>

                    {/* Confirm Password */}
                    <div className="form-group">
                        <label className="form-label">Confirm password</label>
                        <div className="input-wrapper">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmPassword"
                                className={`form-input ${errors.confirmPassword ? 'invalid' : ''}`}
                                placeholder="Retype password..."
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {errors.confirmPassword && <span className="validation-text">{errors.confirmPassword}</span>}
                    </div>

                    {/* Terms */}
                    <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
                        <label className="terms-label">
                            <input
                                type="checkbox"
                                name="agreeTerms"
                                checked={formData.agreeTerms}
                                onChange={handleChange}
                            />
                            <span>I agree with <a href="#" className="auth-link">Terms</a> and <a href="#" className="auth-link">Privacy</a></span>
                        </label>
                    </div>
                    {errors.agreeTerms && <span className="validation-text" style={{ marginBottom: '1rem' }}>{errors.agreeTerms}</span>}


                    <button type="submit" className="submit-btn">
                        Create account
                    </button>

                    <p className="signup-text">
                        Already have an account?
                        <Link to="/login" className="signup-link">Sign In</Link>
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

export default SignUpPage;
