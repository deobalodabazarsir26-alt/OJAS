import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, AlertCircle, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(username, password);
      if (success) {
        navigate('/');
      } else {
        setError(t('errors.invalid_credentials', 'Invalid username or password. Please check your credentials and try again.'));
      }
    } catch (err) {
      setError(t('errors.connection_error', 'A connection error occurred. Please check your internet and try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex bg-white">
      {/* Left Side: Visual/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>
        <div className="relative z-10 max-w-lg text-white">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold leading-tight mb-6 font-hindi-support">
              {t('login.welcome')}
            </h1>
            <p className="text-xl text-blue-100 mb-8 whitespace-pre-wrap">
              {t('login.welcome_desc')}
            </p>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-blue-50">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                <span>{t('login.secure_access')}</span>
              </div>
              <div className="flex items-center space-x-3 text-blue-50">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                <span>{t('login.real_time_track')}</span>
              </div>
              <div className="flex items-center space-x-3 text-blue-50">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                <span>{t('login.direct_comm')}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('login.sign_in')}</h2>
            <p className="text-gray-600">
              {t('login.enter_credentials')}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start text-red-700 text-sm"
              >
                <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                  {t('login.username')}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all sm:text-sm"
                    placeholder={t('login.username_placeholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 ml-1">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('login.password')}
                  </label>
                  <Link to="/forgot-password" title="Reset your password" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                    {t('login.forgot_password')}
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="block w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all sm:text-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                {t('login.remember_me')}
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('login.processing')}
                </div>
              ) : (
                <>
                  {t('login.sign_in')}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-600 mt-8">
              {t('login.no_account')}{' '}
              <Link to="/signup" className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4">
                {t('login.sign_up_here')}
              </Link>
            </p>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-100">
            <p className="text-xs text-center text-gray-400">
              {t('login.terms_privacy')}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
