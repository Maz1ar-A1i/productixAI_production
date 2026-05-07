import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, User, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { authService } from '../services/api';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setSuccess('');

  // Client-side validation
  if (!formData.name || !formData.email || !formData.password) {
    setError('Please fill in all required fields');
    setLoading(false);
    return;
  }

  if (formData.password.length < 8) {
    setError('Password must be at least 8 characters long');
    setLoading(false);
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    setError('Please enter a valid email address');
    setLoading(false);
    return;
  }

  try {
    const response = await authService.signup(formData);

    setSuccess('Account created successfully! Redirecting to login...');

    // Save email before clearing form
    const emailToPrefill = formData.email;
    localStorage.setItem('last_registered_email', emailToPrefill);

    // Clear form
    setFormData({
      name: '',
      email: '',
      password: ''
    });

    // Redirect with slight delay
    setTimeout(() => {
      navigate('/login', { 
        state: { 
          prefillEmail: emailToPrefill,
          message: 'Verfication email sent please check your spam folder as well for verfication email.' 
        }
      });
    }, 2000);

  } catch (err) {
    console.error('Signup error:', err);

    if (err.code === 'ERR_NETWORK') {
      setError('Unable to connect to the server. Please check your internet connection and ensure the backend is running.');
    } else if (err.response?.status === 400) {
      const detail = err.response?.data?.detail;
      if (detail === 'Email already registered') {
        setError('This email address is already registered. Please use a different email or try logging in.');
      } else if (detail === 'Password must be at least 8 characters long') {
        setError('Password must be at least 8 characters long');
      } else if (detail === 'Registration failed due to database constraints') {
        setError('Something went wrong while creating your account. Please try again.');
      } else {
        setError(detail || 'Invalid registration data. Please check your information.');
      }
    } else if (err.response?.status === 422) {
      setError('Validation error. Please check your input fields.');
    } else if (err.response?.status >= 500) {
      setError('Server error. Please try again later.');
    } else {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Signup failed. Please try again.');
    }

  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-secondary-500 to-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="text-white" size={32} />
            </div>
            <h2 className="text-3xl font-bold text-white">Create Account</h2>
            <p className="text-white/70 mt-2">Join Productix AI and boost your productivity</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center">
              <AlertCircle className="text-red-400 mr-2" size={20} />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6 flex items-center">
              <CheckCircle className="text-green-400 mr-2" size={20} />
              <span className="text-green-400">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="form-label">
                <User className="inline mr-2" size={16} />
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="form-label">
                <Mail className="inline mr-2" size={16} />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="form-label">
                <Lock className="inline mr-2" size={16} />
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                placeholder="Create a password"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-secondary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/70">
              Already have an account?{' '}
              <Link to="/login" className="text-secondary-400 hover:text-secondary-300 font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;