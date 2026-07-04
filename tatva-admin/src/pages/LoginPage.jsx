import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const FORMS = { login: 'login', forgot: 'forgot', reset: 'reset' };

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [activeForm, setActiveForm] = useState(FORMS.login);
  const [loading, setLoading] = useState(false);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Forgot form state
  const [forgotEmail, setForgotEmail] = useState('');

  // Reset form state
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Email and password are required');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.success) {
        login(data.data, data.data.token);
        toast.success('Welcome back!');
        navigate('/');
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return toast.error('Enter your email');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: forgotEmail });
      if (data.success) {
        toast.success(data.message);
        setResetEmail(forgotEmail);
        setActiveForm(FORMS.reset);
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetEmail || !otp || !newPassword) return toast.error('All fields are required');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', { email: resetEmail, otp, newPassword });
      if (data.success) {
        toast.success('Password reset! Please log in.');
        setOtp('');
        setNewPassword('');
        setActiveForm(FORMS.login);
      } else {
        toast.error(data.message || 'Reset failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon">🎓</div>
          <h1>Tatva Admin Portal</h1>
          <p>Manage campus events, announcements, and live scores</p>
        </div>

        {activeForm === FORMS.login && (
          <form onSubmit={handleLogin} className="auth-form">
            <h3>Welcome Back</h3>
            <div className="input-group">
              <label>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@tatva.com" required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Authenticating...' : 'Log In →'}
            </button>
            <p className="auth-link" onClick={() => setActiveForm(FORMS.forgot)}>
              Forgot / Change Password?
            </p>
          </form>
        )}

        {activeForm === FORMS.forgot && (
          <form onSubmit={handleForgot} className="auth-form">
            <h3>Request OTP</h3>
            <p className="auth-sub">We'll send a 6-digit code to your registered email</p>
            <div className="input-group">
              <label>Email Address</label>
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                placeholder="admin@tatva.com" required />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            <p className="auth-link" onClick={() => setActiveForm(FORMS.login)}>
              ← Back to Login
            </p>
          </form>
        )}

        {activeForm === FORMS.reset && (
          <form onSubmit={handleReset} className="auth-form">
            <h3>Set New Password</h3>
            <div className="input-group">
              <label>Confirm Email</label>
              <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                placeholder="admin@tatva.com" required />
            </div>
            <div className="input-group">
              <label>6-Digit OTP Code</label>
              <input type="text" value={otp} onChange={e => setOtp(e.target.value)}
                placeholder="123456" maxLength={6} className="otp-input" required />
            </div>
            <div className="input-group">
              <label>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••" minLength={6} required />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password ✓'}
            </button>
            <p className="auth-link" onClick={() => setActiveForm(FORMS.login)}>
              ← Back to Login
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
