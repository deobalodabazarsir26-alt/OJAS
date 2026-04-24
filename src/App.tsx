/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import GlobalProgressBar from './components/GlobalProgressBar';
import SystemNotification from './components/SystemNotification';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdDetails from './pages/AdDetails';
import ApplyJob from './pages/ApplyJob';
import ForgotPassword from './pages/ForgotPassword';
import ApplicantDashboard from './pages/ApplicantDashboard';
import OfficeDashboard from './pages/OfficeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ManageConstants from './pages/ManageConstants';
import ManageOffices from './pages/ManageOffices';
import ManageUsers from './pages/ManageUsers';
import ManageAdvertisements from './pages/ManageAdvertisements';
import ManageDepartments from './pages/ManageDepartments';
import ManageApplications from './pages/ManageApplications';

const ProtectedRoute = ({ children, allowedTypes }: { children: React.ReactNode, allowedTypes: string[] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (!user) return <Navigate to="/login" />;
  if (!allowedTypes.includes(user.User_Type)) return <Navigate to="/" />;

  return <>{children}</>;
};

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <GlobalProgressBar />
      <SystemNotification />
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/ad/:id" element={<AdDetails />} />
        
        {/* Applicant Routes */}
        <Route path="/apply/:adId/:postId" element={
          <ProtectedRoute allowedTypes={['applicant']}>
            <ApplyJob />
          </ProtectedRoute>
        } />
        <Route path="/applicant/dashboard" element={
          <ProtectedRoute allowedTypes={['applicant']}>
            <ApplicantDashboard />
          </ProtectedRoute>
        } />
        <Route path="/applicant/applications" element={
          <ProtectedRoute allowedTypes={['applicant']}>
            <ApplicantDashboard />
          </ProtectedRoute>
        } />

        {/* Office Routes */}
        <Route path="/office/dashboard" element={
          <ProtectedRoute allowedTypes={['office']}>
            <OfficeDashboard />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedTypes={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/constants" element={
          <ProtectedRoute allowedTypes={['admin']}>
            <ManageConstants />
          </ProtectedRoute>
        } />
        <Route path="/admin/offices" element={
          <ProtectedRoute allowedTypes={['admin']}>
            <ManageOffices />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute allowedTypes={['admin']}>
            <ManageUsers />
          </ProtectedRoute>
        } />
        <Route path="/admin/advertisements" element={
          <ProtectedRoute allowedTypes={['admin']}>
            <ManageAdvertisements />
          </ProtectedRoute>
        } />
        <Route path="/admin/departments" element={
          <ProtectedRoute allowedTypes={['admin']}>
            <ManageDepartments />
          </ProtectedRoute>
        } />
        <Route path="/admin/manage-applications" element={
          <ProtectedRoute allowedTypes={['admin']}>
            <ManageApplications />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <ProgressProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ProgressProvider>
  );
}
