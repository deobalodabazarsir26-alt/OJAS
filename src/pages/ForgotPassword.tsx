import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sheetService } from '../services/sheetService';
import { User, GeneralUser, OfficeUser } from '../types';
import { KeyRound, User as UserIcon, Mail, Phone, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [foundProfile, setFoundProfile] = useState<GeneralUser | OfficeUser | null>(null);
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const navigate = useNavigate();

  const handleFindUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const users = await sheetService.getAll<User>('User');
      const u = users.find(item => item.User_Name.toLowerCase() === username.toLowerCase());
      
      if (!u) {
        setError('Username not found. Please check and try again.');
        setIsLoading(false);
        return;
      }
      
      setFoundUser(u);
      
      // Fetch profile to get email/mobile for verification
      if (u.User_Type === 'applicant') {
        const profiles = await sheetService.getAll<GeneralUser>('General_User');
        const p = profiles.find(item => String(item.User_ID) === String(u.User_ID));
        setFoundProfile(p || null);
      } else {
        const profiles = await sheetService.getAll<OfficeUser>('Office_User');
        const p = profiles.find(item => String(item.User_ID) === String(u.User_ID));
        setFoundProfile(p || null);
      }
      
      setStep(2);
    } catch (err) {
      setError('Failed to fetch user data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundProfile) {
      setError('Profile data missing. Cannot verify identity.');
      return;
    }
    
    const profileEmail = String(foundProfile.Email_ID || '').toLowerCase().trim();
    const profileMobile = String(foundProfile.Mobile || '').trim();
    
    if (email.toLowerCase().trim() === profileEmail && mobile.trim() === profileMobile) {
      setStep(3);
      setError('');
    } else {
      setError('Email or Mobile number does not match our records.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      if (!foundUser) throw new Error('User not found');
      
      await sheetService.update('User', 'User_ID', foundUser.User_ID, {
        Password: newPassword,
        T_STMP_UPD: new Date().toISOString()
      });
      
      setIsSuccess(true);
    } catch (err) {
      setError('Failed to reset password. Please try again.');
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
          >
            <div className="bg-white/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm">
              <KeyRound className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold leading-tight mb-6">
              Reset Your Password
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Don't worry, it happens to the best of us. Follow the steps to securely regain access to your OJAS account.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-20">
        <div className="max-w-md w-full">
          <Link to="/login" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 mb-8 group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Login
          </Link>

          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Password Reset!</h2>
                <p className="text-gray-600 mb-8">
                  Your password has been successfully updated. You can now log in with your new credentials.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-3.5 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                >
                  Go to Login
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={`step-${step}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-10">
                  <div className="flex items-center space-x-2 mb-4">
                    {[1, 2, 3].map((s) => (
                      <div
                        key={s}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                          s <= step ? 'bg-blue-600' : 'bg-gray-100'
                        }`}
                      />
                    ))}
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {step === 1 && "Find Account"}
                    {step === 2 && "Verify Identity"}
                    {step === 3 && "New Password"}
                  </h2>
                  <p className="text-gray-600">
                    {step === 1 && "Enter your username to begin the reset process."}
                    {step === 2 && "Enter your registered email and mobile to verify it's you."}
                    {step === 3 && "Create a strong new password for your account."}
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start text-red-700 text-sm mb-6">
                    <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {step === 1 && (
                  <form onSubmit={handleFindUser} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Username</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          required
                          className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          placeholder="Your username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center py-3.5 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
                    >
                      {isLoading ? "Searching..." : "Continue"}
                      {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
                    </button>
                  </form>
                )}

                {step === 2 && (
                  <form onSubmit={handleVerifyIdentity} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Registered Email</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          </div>
                          <input
                            type="email"
                            required
                            className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="example@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Mobile Number</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          </div>
                          <input
                            type="tel"
                            required
                            className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="10-digit mobile number"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center py-3.5 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                    >
                      Verify Identity
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </button>
                  </form>
                )}

                {step === 3 && (
                  <form onSubmit={handleResetPassword} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">New Password</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <KeyRound className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          </div>
                          <input
                            type="password"
                            required
                            className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="Min. 6 characters"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Confirm Password</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <ShieldCheck className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          </div>
                          <input
                            type="password"
                            required
                            className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="Repeat new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center py-3.5 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
                    >
                      {isLoading ? "Updating..." : "Reset Password"}
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
