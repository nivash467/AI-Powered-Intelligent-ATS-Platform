import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Briefcase, User, Mail, Phone, Lock, Eye, EyeOff, Building2, MapPin, Globe,
    UserPlus, AlertCircle, CheckCircle2, Layers, ShieldCheck
} from 'lucide-react';
import './SignupPage.css';

const SignupPage = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        role: 'Recruiter',
        password: '',
        confirmPassword: '',
        companyName: '',
        industry: '',
        companySize: '1–10 employees',
        location: '',
        website: '',
        agreeTerms: false
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const validate = () => {
        const e = {};

        if (!form.fullName.trim()) e.fullName = 'Full name is required';
        if (!form.email.trim()) {
            e.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            e.email = 'Enter a valid email address';
        }
        if (!form.phone.trim()) e.phone = 'Phone number is required';
        if (!form.password) {
            e.password = 'Password is required';
        } else if (form.password.length < 8) {
            e.password = 'Must be at least 8 characters';
        }
        if (!form.confirmPassword) {
            e.confirmPassword = 'Please confirm your password';
        } else if (form.password !== form.confirmPassword) {
            e.confirmPassword = 'Passwords do not match';
        }
        if (!form.companyName.trim()) e.companyName = 'Company name is required';
        if (!form.agreeTerms) e.agreeTerms = 'You must agree to the terms';

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        setErrors({});

        try {
            // 1. Call POST /auth/signup
            const signupRes = await fetch('http://localhost:8000/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: form.fullName,
                    email: form.email.toLowerCase(),
                    phone_number: form.phone,
                    role: form.role,
                    password: form.password,
                    company_name: form.companyName,
                    industry: form.industry || null,
                    company_size: form.companySize || null,
                    location: form.location || null,
                    company_website: form.website || null
                })
            });

            const signupData = await signupRes.json();

            if (!signupRes.ok) {
                setErrors({ email: signupData.detail || 'Signup failed. Please try again.' });
                setIsSubmitting(false);
                return;
            }

            // 2. Auto-login after successful signup
            const loginRes = await fetch('http://localhost:8000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email.toLowerCase(), password: form.password })
            });

            const loginData = await loginRes.json();

            if (loginRes.ok) {
                localStorage.setItem('authToken', loginData.token);
                localStorage.setItem('hrUser', JSON.stringify({
                    email: form.email.toLowerCase(),
                    name: loginData.user?.name,
                    role: loginData.user?.role
                }));
            } else {
                // Signup succeeded but auto-login failed — still navigate to login page
                localStorage.setItem('hrUser', JSON.stringify({ email: form.email.toLowerCase() }));
            }

            navigate('/dashboard');
        } catch (err) {
            setErrors({ email: 'Unable to connect to server. Please try again.' });
            setIsSubmitting(false);
        }
    };

    const renderError = (field) => {
        if (!errors[field]) return null;
        return <span className="signup-error-text"><AlertCircle size={12} /> {errors[field]}</span>;
    };

    return (
        <div className="signup-page">
            <div className="signup-container">
                <div className="signup-split">

                    {/* LEFT: Branding Panel */}
                    <div className="signup-branding">
                        <div className="branding-logo">
                            <div className="branding-logo-icon">
                                <Briefcase size={24} />
                            </div>
                            <span className="branding-title">Intelligent ATS</span>
                        </div>

                        <h1 className="branding-headline">
                            Build Your<br />Hiring Team
                        </h1>
                        <p className="branding-subtitle">
                            Create your HR account to start screening candidates with AI-powered resume intelligence.
                        </p>

                        <div className="branding-steps">
                            <div className="branding-step">
                                <div className="step-number">1</div>
                                <div className="step-text">
                                    <strong>Create Account</strong>
                                    Set up your personal profile and organization details
                                </div>
                            </div>
                            <div className="branding-step">
                                <div className="step-number">2</div>
                                <div className="step-text">
                                    <strong>Configure Job Roles</strong>
                                    Define required skills, experience, and AI parameters
                                </div>
                            </div>
                            <div className="branding-step">
                                <div className="step-number">3</div>
                                <div className="step-text">
                                    <strong>Start Screening</strong>
                                    Upload resumes and let the AI do the evaluation
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Signup Form */}
                    <div className="signup-form-panel">
                        <div className="signup-form-header">
                            <h2>Create HR Account</h2>
                            <p>Fill in your details to get started with ATS</p>
                        </div>

                        <form className="signup-form" onSubmit={handleSubmit} noValidate>

                            {/* Section 1: Personal Details */}
                            <div className="signup-section-title">Personal Details</div>
                            <div className="signup-fields-grid">
                                {/* Full Name */}
                                <div className="signup-field">
                                    <label>Full Name</label>
                                    <div className="signup-input-wrapper">
                                        <span className="signup-input-icon"><User size={15} /></span>
                                        <input
                                            type="text"
                                            className={`signup-input ${errors.fullName ? 'error' : ''}`}
                                            placeholder="Jane Doe"
                                            value={form.fullName}
                                            onChange={(e) => handleChange('fullName', e.target.value)}
                                        />
                                    </div>
                                    {renderError('fullName')}
                                </div>

                                {/* Email */}
                                <div className="signup-field">
                                    <label>Email Address</label>
                                    <div className="signup-input-wrapper">
                                        <span className="signup-input-icon"><Mail size={15} /></span>
                                        <input
                                            type="email"
                                            className={`signup-input ${errors.email ? 'error' : ''}`}
                                            placeholder="you@company.com"
                                            value={form.email}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                            autoComplete="email"
                                        />
                                    </div>
                                    {renderError('email')}
                                </div>

                                {/* Phone */}
                                <div className="signup-field">
                                    <label>Phone Number</label>
                                    <div className="signup-input-wrapper">
                                        <span className="signup-input-icon"><Phone size={15} /></span>
                                        <input
                                            type="text"
                                            className={`signup-input ${errors.phone ? 'error' : ''}`}
                                            placeholder="+1 (555) 123-4567"
                                            value={form.phone}
                                            onChange={(e) => handleChange('phone', e.target.value)}
                                        />
                                    </div>
                                    {renderError('phone')}
                                </div>

                                {/* Role */}
                                <div className="signup-field">
                                    <label>Role</label>
                                    <div className="signup-input-wrapper">
                                        <span className="signup-input-icon"><Layers size={15} /></span>
                                        <select
                                            className="signup-select"
                                            value={form.role}
                                            onChange={(e) => handleChange('role', e.target.value)}
                                        >
                                            <option value="Recruiter">Recruiter</option>
                                            <option value="Senior Recruiter">Senior Recruiter</option>
                                            <option value="HR Manager">HR Manager</option>
                                            <option value="Hiring Manager">Hiring Manager</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="signup-field">
                                    <label>Password</label>
                                    <div className="signup-input-wrapper">
                                        <span className="signup-input-icon"><Lock size={15} /></span>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className={`signup-input ${errors.password ? 'error' : ''}`}
                                            placeholder="Min. 8 characters"
                                            value={form.password}
                                            onChange={(e) => handleChange('password', e.target.value)}
                                            autoComplete="new-password"
                                        />
                                        <button type="button" className="signup-input-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                    {renderError('password')}
                                </div>

                                {/* Confirm Password */}
                                <div className="signup-field">
                                    <label>Confirm Password</label>
                                    <div className="signup-input-wrapper">
                                        <span className="signup-input-icon"><ShieldCheck size={15} /></span>
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            className={`signup-input ${errors.confirmPassword ? 'error' : ''}`}
                                            placeholder="Re-enter password"
                                            value={form.confirmPassword}
                                            onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                            autoComplete="new-password"
                                        />
                                        <button type="button" className="signup-input-toggle" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                                            {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                    {renderError('confirmPassword')}
                                </div>
                            </div>

                            {/* Section 2: Organization Details */}
                            <div className="signup-section-title">Organization Details</div>
                            <div className="signup-fields-grid">
                                {/* Company Name */}
                                <div className="signup-field">
                                    <label>Company Name</label>
                                    <div className="signup-input-wrapper">
                                        <span className="signup-input-icon"><Building2 size={15} /></span>
                                        <input
                                            type="text"
                                            className={`signup-input ${errors.companyName ? 'error' : ''}`}
                                            placeholder="TechCorp Solutions"
                                            value={form.companyName}
                                            onChange={(e) => handleChange('companyName', e.target.value)}
                                        />
                                    </div>
                                    {renderError('companyName')}
                                </div>

                                {/* Industry */}
                                <div className="signup-field">
                                    <label>Industry</label>
                                    <div className="signup-input-wrapper">
                                        <span className="signup-input-icon"><Briefcase size={15} /></span>
                                        <input
                                            type="text"
                                            className="signup-input"
                                            placeholder="Software / SaaS"
                                            value={form.industry}
                                            onChange={(e) => handleChange('industry', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Company Size */}
                                <div className="signup-field">
                                    <label>Company Size</label>
                                    <div className="signup-input-wrapper">
                                        <span className="signup-input-icon"><CheckCircle2 size={15} /></span>
                                        <select
                                            className="signup-select"
                                            value={form.companySize}
                                            onChange={(e) => handleChange('companySize', e.target.value)}
                                        >
                                            <option value="1–10 employees">1–10 employees</option>
                                            <option value="10–50 employees">10–50 employees</option>
                                            <option value="50–200 employees">50–200 employees</option>
                                            <option value="200–1000 employees">200–1000 employees</option>
                                            <option value="1000–5000 employees">1000–5000 employees</option>
                                            <option value="5000+ employees">5000+ employees</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="signup-field">
                                    <label>Location</label>
                                    <div className="signup-input-wrapper">
                                        <span className="signup-input-icon"><MapPin size={15} /></span>
                                        <input
                                            type="text"
                                            className="signup-input"
                                            placeholder="San Francisco, CA"
                                            value={form.location}
                                            onChange={(e) => handleChange('location', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Company Website */}
                                <div className="signup-field full-width">
                                    <label>Company Website</label>
                                    <div className="signup-input-wrapper">
                                        <span className="signup-input-icon"><Globe size={15} /></span>
                                        <input
                                            type="url"
                                            className="signup-input"
                                            placeholder="https://yourcompany.com"
                                            value={form.website}
                                            onChange={(e) => handleChange('website', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Terms */}
                            <label className="signup-terms">
                                <input
                                    type="checkbox"
                                    checked={form.agreeTerms}
                                    onChange={(e) => handleChange('agreeTerms', e.target.checked)}
                                />
                                <span>
                                    I agree to the <a href="#" onClick={e => e.preventDefault()}>Terms of Service</a> and <a href="#" onClick={e => e.preventDefault()}>Privacy Policy</a>
                                </span>
                            </label>
                            {errors.agreeTerms && <span className="signup-error-text" style={{ marginTop: '-0.75rem' }}><AlertCircle size={12} /> {errors.agreeTerms}</span>}

                            {/* Submit */}
                            <button type="submit" className="signup-submit-btn" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>Creating Account...</>
                                ) : (
                                    <><UserPlus size={18} /> Create HR Account</>
                                )}
                            </button>

                            <div className="signup-signin-link">
                                Already have an account? <Link to="/login">Sign In</Link>
                            </div>
                        </form>
                    </div>

                </div>
            </div>

            <footer className="signup-footer">
                © {new Date().getFullYear()} Intelligent ATS Platform — AI Recruitment Intelligence
            </footer>
        </div>
    );
};

export default SignupPage;
