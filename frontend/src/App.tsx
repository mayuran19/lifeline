import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { queryClient } from './lib/queryClient';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import Patients from './pages/Patients';
import Clinics from './pages/Clinics';
import Requests from './pages/Requests';
import Users from './pages/Users';
import Configurations from './pages/Configurations';
import Profile from './pages/Profile';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
            />
            <Route
              path="/requests"
              element={<ProtectedRoute><Requests /></ProtectedRoute>}
            />
            <Route
              path="/patients"
              element={<ProtectedRoute><Patients /></ProtectedRoute>}
            />
            <Route
              path="/clinics"
              element={<ProtectedRoute><Clinics /></ProtectedRoute>}
            />
            {/* Admin-only routes */}
            <Route
              path="/doctors"
              element={<ProtectedRoute adminOnly><Doctors /></ProtectedRoute>}
            />
            <Route
              path="/users"
              element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>}
            />
            <Route
              path="/configurations"
              element={<ProtectedRoute adminOnly><Configurations /></ProtectedRoute>}
            />
            <Route
              path="/profile"
              element={<ProtectedRoute><Profile /></ProtectedRoute>}
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;