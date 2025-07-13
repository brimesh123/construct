
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster as Sonner } from './components/ui/sonner';
import Index from './pages/Index';
import EmployeesPage from './pages/EmployeesPage';
import JobSitesPage from './pages/JobSitesPage';
import AttendancePage from './pages/AttendancePage';
import RateCardsPage from './pages/RateCardsPage';
import ReportsPage from './pages/ReportsPage';
import WeeklyReportPage from './pages/WeeklyReportPage';
import MasterReportPage from './pages/MasterReportPage';
import EmployeeReportsPage from './pages/EmployeeReportsPage';
import ProjectManagerPage from './pages/ProjectManagerPage';
import NotFound from './pages/NotFound';
import Layout from './components/layout/Layout';
import AuthProvider from './components/auth/AuthProvider';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/job-sites" element={<JobSitesPage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/rate-cards" element={<RateCardsPage />} />
                <Route path="/project-managers" element={<ProjectManagerPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/weekly-reports" element={<WeeklyReportPage />} />
                <Route path="/master-reports" element={<MasterReportPage />} />
                <Route path="/employee-reports" element={<EmployeeReportsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
