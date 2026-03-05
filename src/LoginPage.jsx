import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Briefcase, Mail, Lock, Eye, EyeOff, LogIn, ShieldCheck, Zap, BarChart2, Users, AlertCircle } from 'lucide-react';
import './LoginPage.css';

const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [errors, setErrors] = useState({ email: '', password: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = { email: '', password: '' };

        if (!email.trim()) {
            newErrors.email = 'Email address is required';
        } else if (!validateEmail(email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!password.trim()) {
            newErrors.password = 'Password is required';
        }

        setErrors(newErrors);

        if (newErrors.email || newErrors.password) return;

        setIsSubmitting(true);

        try {
            const res = await fetch('http://localhost:8000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase(), password })
            });

            const data = await res.json();

            if (!res.ok) {
                setErrors({ email: '', password: data.detail || 'Login failed. Please try again.' });
                setIsSubmitting(false);
                return;
            }

            // Store token and user email in localStorage
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('hrUser', JSON.stringify({ email: email.toLowerCase(), name: data.user?.name, role: data.user?.role }));
            navigate('/dashboard');
        } catch (err) {
            setErrors({ email: '', password: 'Unable to connect to server. Please try again.' });
            setIsSubmitting(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-split">

                    {/* LEFT: Branding Panel */}
                    <div className="login-branding">
                        <div className="branding-logo">
                            <div className="branding-logo-icon">
                                <Briefcase size={24} />
                            </div>
                            <span className="branding-title">Intelligent ATS</span>
                        </div>

                        <h1 className="branding-headline">
                            Smarter Hiring<br />Starts Here
                        </h1>
                        <p className="branding-subtitle">
                            AI-powered candidate screening and hiring intelligence — evaluate resumes, analyze GitHub & LeetCode profiles, and shortlist top talent in seconds.
                        </p>

                        <div className="branding-features">
                            <div className="branding-feature">
                                <div className="branding-feature-icon">
                                    <Zap size={16} />
                                </div>
                                AI Resume Scoring & Parsing
                            </div>
                            <div className="branding-feature">
                                <div className="branding-feature-icon">
                                    <BarChart2 size={16} />
                                </div>
                                Mathematical Candidate Evaluation Pipeline
                            </div>
                            <div className="branding-feature">
                                <div className="branding-feature-icon">
                                    <Users size={16} />
                                </div>
                                Multi-Platform Intelligence (GitHub, LeetCode, LinkedIn)
                            </div>
                            <div className="branding-feature">
                                <div className="branding-feature-icon">
                                    <ShieldCheck size={16} />
                                </div>
                                Bias-Free Anonymous Screening Mode
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Login Form */}
                    <div className="login-form-panel">
                        <div className="login-form-header">
                            <h2>Welcome Back</h2>
                            <p>Sign in to your HR dashboard to continue</p>
                        </div>

                        <form className="login-form" onSubmit={handleSubmit} noValidate>
                            {/* Email */}
                            <div className="login-field">
                                <label htmlFor="login-email">Email Address</label>
                                <div className="login-input-wrapper">
                                    <span className="login-input-icon"><Mail size={16} /></span>
                                    <input
                                        id="login-email"
                                        type="email"
                                        className={`login-input ${errors.email ? 'error' : ''}`}
                                        placeholder="you@company.com"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: '' })); }}
                                        autoComplete="email"
                                    />
                                </div>
                                {errors.email && (
                                    <span className="login-error-text"><AlertCircle size={13} /> {errors.email}</span>
                                )}
                            </div>

                            {/* Password */}
                            <div className="login-field">
                                <label htmlFor="login-password">Password</label>
                                <div className="login-input-wrapper">
                                    <span className="login-input-icon"><Lock size={16} /></span>
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        className={`login-input ${errors.password ? 'error' : ''}`}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: '' })); }}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="login-input-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <span className="login-error-text"><AlertCircle size={13} /> {errors.password}</span>
                                )}
                            </div>

                            {/* Options Row */}
                            <div className="login-options-row">
                                <label className="login-remember">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    Remember me
                                </label>
                                <span className="login-forgot" onClick={() => alert('Password reset functionality will be available when backend authentication is connected.')}>
                                    Forgot Password?
                                </span>
                            </div>

                            {/* Submit Button */}
                            <button type="submit" className="login-submit-btn" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>Signing In...</>
                                ) : (
                                    <><LogIn size={18} /> Sign In</>
                                )}
                            </button>

                            <div className="login-signup-link" style={{ textAlign: 'center', fontSize: '0.88rem', color: '#6b7280', marginTop: '0.75rem' }}>
                                Don't have an account? <Link to="/signup" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Sign Up</Link>
                            </div>
                        </form>
                    </div>

                </div>
            </div>

            {/* Footer */}
            <footer className="login-footer">
                © {new Date().getFullYear()} Intelligent ATS Platform — AI Recruitment Intelligence
            </footer>
        </div>
    );
};

export default LoginPage;
