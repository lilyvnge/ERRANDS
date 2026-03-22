import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { I18nProvider } from './i18n/I18nProvider';

// Import Pages
import Login from './pages/Auth/Login';
import DashboardLayout from './components/Layout/DashboardLayout';
import TaskFeed from './pages/Tasks/TaskFeed';
import TaskDetails from './pages/Auth/TaskDetails';
import ChatLayout from './pages/Chat/ChatLayout';
import ChatWindow from './pages/Chat/ChatWindow';
import Register from './pages/Auth/Register';
import CreateTask from './pages/Tasks/CreateTask';
import DashboardHome from './pages/Dashboard/DashboardHome';
import VendorJobs from './pages/Vendor/VendorJobs';
import VendorEarnings from './pages/Vendor/VendorEarnings';
import UserProfile from './pages/Profile/UserProfile';
import UserPayments from './pages/Payments/UserPayments';
import VendorDiscover from './pages/Vendor/VendorDiscover';
import VendorProfile from './pages/Vendor/VendorProfile';
import AdminDashboard from './pages/Admin/AdminDashboard';
import VendorVerification from './pages/Vendor/VendorVerification';

function App() {
  const { initializeAuth, isAuthenticated } = useAuthStore();

  // Initialize Auth on App Load (Check for existing token)
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Protected Route Wrapper (ensures users can't see the dashboard unless logged in)
  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          {/* --- Public Routes --- */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Redirect root to login or dashboard */}
          <Route path="/" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
          } />

          {/* --- Protected Routes (Inside Dashboard Layout) --- */}
          <Route element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            {/* Main Dashboard View */}
            <Route path="/dashboard" element={<DashboardHome />} />
            
            {/* Task Routes */}
            <Route path="/tasks" element={<TaskFeed />} />
            <Route path="/tasks/create" element={<CreateTask />} />
            <Route path="/tasks/:id" element={<TaskDetails />} />
            <Route path="/my-tasks" element={<TaskFeed />} /> {/* Reusing feed for now */}

            {/* Profile & Payments */}
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/payments" element={<UserPayments />} />

            {/* Chat Routes */}
            {/* This renders the list on the left, and optionally a window on right */}
            <Route path="/chat" element={<ChatLayout />}>
            <Route path=":conversationId" element={<ChatWindow />} />
            </Route>

            {/* Vendor Routes */}
            <Route path="/vendors" element={<VendorDiscover />} />
            <Route path="/vendors/:id" element={<VendorProfile />} />
            <Route path="/my-jobs" element={<VendorJobs />} />
            <Route path="/earnings" element={<VendorEarnings />} />
            <Route path="/verification" element={<VendorVerification />} />
            {/* Admin */}
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          {/* Catch all - 404 */}
          <Route path="*" element={<div className="p-10">404 - Page Not Found</div>} />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}

export default App; 
