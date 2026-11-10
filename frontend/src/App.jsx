import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PageLoader } from './components/common/Spinner';
import { ProtectedRoute, PublicOnlyRoute } from './components/common/RouteGuards';
import DashboardLayout from './layouts/DashboardLayout';
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import VerifyEmail from './pages/VerifyEmail/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword';
import ResetPassword from './pages/ForgotPassword/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';
import Careers from './pages/Careers/Careers';
import InterviewSetup from './pages/InterviewSetup/InterviewSetup';
import InterviewRoom from './pages/InterviewSetup/InterviewRoom';
import Interviews from './pages/Interviews/Interviews';
const InterviewReport = lazy(() => import('./pages/Interviews/InterviewReport'));
const Progress = lazy(() => import('./pages/Progress/Progress')); // keeps recharts out of the main bundle
import Profile from './pages/Profile/Profile';
import Settings from './pages/Settings/Settings';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/interview/setup" element={<InterviewSetup />} />
          <Route path="/interviews" element={<Interviews />} />
          <Route path="/interviews/:id" element={<Suspense fallback={<PageLoader />}><InterviewReport /></Suspense>} />
          <Route path="/progress" element={<Suspense fallback={<PageLoader />}><Progress /></Suspense>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        {/* Live interview: /interview/room (lobby) and /interview/room/:id (resume) */}
        <Route path="/interview/room/:id?" element={<InterviewRoom />} />
      </Route>
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
