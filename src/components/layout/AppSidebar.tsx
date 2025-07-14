
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Clock,
  CreditCard,
  UserCheck,
  ChevronDown,
  Calendar,
  BarChart3,
  Building2,
  User,
  FileText,
  Sparkles,
  Zap,
  LogOut,
  Settings
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

// Dummy user info for footer
const user = {
  name: 'Admin',
  role: 'Admin',
  avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=FFB347&color=fff&size=128',
};

export function AppSidebar() {
  const { user, signOut, loading } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  // Main nav active class
  const getActiveClass = (path: string) => {
    const active = isActive(path);
    return active
      ? 'relative bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 text-white font-bold shadow-xl border-l-4 border-white rounded-2xl px-5 py-3 flex items-center group transition-all duration-150 scale-105'
      : 'relative text-gray-300 hover:text-orange-600 hover:bg-gradient-to-r hover:from-orange-50/80 hover:to-yellow-50/80 hover:shadow-lg rounded-2xl px-5 py-3 flex items-center group transition-all duration-150';
  };
  // Subnav active class
  const getSubActiveClass = (path: string) => {
    const active = isActive(path);
    return active
      ? 'relative bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 text-white font-semibold shadow-lg border-l-4 border-white rounded-xl px-4 py-2 flex items-center text-sm group scale-105'
      : 'relative text-gray-400 hover:text-orange-600 hover:bg-gradient-to-r hover:from-orange-50/80 hover:to-yellow-50/80 hover:shadow rounded-xl px-4 py-2 flex items-center text-sm group transition-all duration-150';
  };
  // Collapsed nav
  const getCollapsedClass = (path: string) => {
    const active = isActive(path);
    return active
      ? 'relative bg-gradient-to-br from-orange-400 via-yellow-400 to-orange-500 text-white shadow-xl border-l-4 border-white rounded-full p-3 flex items-center justify-center group scale-110'
      : 'relative text-gray-300 hover:text-orange-600 hover:bg-gradient-to-br hover:from-orange-50/80 hover:to-yellow-50/80 hover:shadow rounded-full p-3 flex items-center justify-center group transition-all duration-150';
  };

  const isReportsActive = currentPath.startsWith('/reports') ||
    currentPath.startsWith('/weekly-reports') ||
    currentPath.startsWith('/master-reports') ||
    currentPath.startsWith('/employee-reports');

  const [attendanceOpen, setAttendanceOpen] = useState(currentPath.startsWith('/attendance'));

  return (
    <Sidebar className={state === 'collapsed' ? 'w-20' : 'w-72'} collapsible="icon">
      <SidebarContent className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 shadow-2xl min-h-screen flex flex-col justify-between overflow-x-hidden">
        <div>
          <SidebarGroup>
            <SidebarGroupLabel className="text-white font-extrabold text-2xl px-6 py-8 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700 shadow-lg">
              <div className="flex w-full justify-center items-center">
                <Building2 className="w-8 h-8 text-orange-500" />
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-4 py-8">
              <TooltipProvider>
                <SidebarMenu className="space-y-3">
                  {/* Dashboard */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/" className={state === 'collapsed' ? getCollapsedClass('/') : getActiveClass('/')}
                        aria-label="Dashboard">
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <span className="flex items-center">
                              <Home className="h-6 w-6" />
                              {state !== 'collapsed' && <span className="ml-4 font-semibold">Dashboard</span>}
                              {/* {state !== 'collapsed' && isActive('/') && (
                                <Badge className="ml-auto bg-green-500 text-white animate-pulse shadow-lg flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 mr-1" />Live
                                </Badge>
                              )} */}
                            </span>
                          </TooltipTrigger>
                          {state === 'collapsed' && <TooltipContent>Dashboard</TooltipContent>}
                        </Tooltip>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* Employees */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/employees" className={state === 'collapsed' ? getCollapsedClass('/employees') : getActiveClass('/employees')} aria-label="Employees">
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <span className="flex items-center">
                              <Users className="h-6 w-6" />
                              {state !== 'collapsed' && <span className="ml-4 font-semibold">Employees</span>}
                            </span>
                          </TooltipTrigger>
                          {state === 'collapsed' && <TooltipContent>Employees</TooltipContent>}
                        </Tooltip>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* Job Sites */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/job-sites" className={state === 'collapsed' ? getCollapsedClass('/job-sites') : getActiveClass('/job-sites')} aria-label="Job Sites">
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <span className="flex items-center">
                              <Building2 className="h-6 w-6" />
                              {state !== 'collapsed' && <span className="ml-4 font-semibold">Job Sites</span>}
                            </span>
                          </TooltipTrigger>
                          {state === 'collapsed' && <TooltipContent>Job Sites</TooltipContent>}
                        </Tooltip>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* Attendance */}
                  <SidebarMenuItem>
                    <Collapsible open={attendanceOpen} onOpenChange={setAttendanceOpen}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className={state === 'collapsed' ? getCollapsedClass('/attendance') : getActiveClass('/attendance')}>
                          <Clock className="h-6 w-6" />
                          {state !== 'collapsed' && (
                            <>
                              <span className="ml-4 font-semibold">Attendance</span>
                              <ChevronDown className={`ml-auto transition-transform ${attendanceOpen ? 'rotate-180' : ''}`} />
                            </>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenu className="ml-8 space-y-1">
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/attendance/mark" className={getSubActiveClass('/attendance/mark')} aria-label="Mark Attendance">
                                Mark Attendance
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink to="/attendance/view" className={getSubActiveClass('/attendance/view')} aria-label="View Attendance">
                                View Attendance
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </SidebarMenu>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                  {/* Rate Cards */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/rate-cards" className={state === 'collapsed' ? getCollapsedClass('/rate-cards') : getActiveClass('/rate-cards')} aria-label="Rate Cards">
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <span className="flex items-center">
                              <CreditCard className="h-6 w-6" />
                              {state !== 'collapsed' && <span className="ml-4 font-semibold">Rate Cards</span>}
                            </span>
                          </TooltipTrigger>
                          {state === 'collapsed' && <TooltipContent>Rate Cards</TooltipContent>}
                        </Tooltip>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* Project Managers */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/project-managers" className={state === 'collapsed' ? getCollapsedClass('/project-managers') : getActiveClass('/project-managers')} aria-label="Project Managers">
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <span className="flex items-center">
                              <UserCheck className="h-6 w-6" />
                              {state !== 'collapsed' && <span className="ml-4 font-semibold">Project Managers</span>}
                            </span>
                          </TooltipTrigger>
                          {state === 'collapsed' && <TooltipContent>Project Managers</TooltipContent>}
                        </Tooltip>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* Reports Section Divider */}
                  <div className="my-6 border-t border-slate-700" />
                  {/* Reports Collapsible */}
                  <Collapsible defaultOpen={isReportsActive}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-orange-200 hover:text-orange-500 hover:bg-gradient-to-r hover:from-orange-50/80 hover:to-yellow-50/80 transition-all duration-150 ${isReportsActive ? 'bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 text-white shadow-lg scale-105' : ''}`}>
                        <BarChart3 className="h-6 w-6" />
                        {state !== 'collapsed' && <span className="ml-4 font-semibold">Reports</span>}
                        <ChevronDown className="ml-auto h-5 w-5 transition-transform duration-150" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-2 mt-2 space-y-2">
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild size="sm">
                            <NavLink to="/reports" className={getSubActiveClass('/reports')}>
                              <FileText className="mr-2 h-4 w-4" />
                              <span>Payroll Reports</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild size="sm">
                            <NavLink to="/weekly-reports" className={getSubActiveClass('/weekly-reports')}>
                              <Calendar className="mr-2 h-4 w-4" />
                              <span>Weekly Reports</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild size="sm">
                            <NavLink to="/master-reports" className={getSubActiveClass('/master-reports')}>
                              <BarChart3 className="mr-2 h-4 w-4" />
                              <span>Master Reports</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild size="sm">
                            <NavLink to="/employee-reports" className={getSubActiveClass('/employee-reports')}>
                              <User className="mr-2 h-4 w-4" />
                              <span>Employee Reports</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenu>
              </TooltipProvider>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
        {/* Footer: User Info & Settings */}
        <div className="px-4 py-6 border-t border-slate-700 bg-gradient-to-t from-slate-900/80 to-transparent flex items-center gap-4">
          {/* User Avatar */}
          <img
            src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.full_name || user?.email || 'U')}&background=FFB347&color=fff&size=128`}
            alt="User Avatar"
            className="w-12 h-12 rounded-full border-2 border-orange-400 shadow-lg"
          />
          {state !== 'collapsed' && (
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white text-base leading-tight truncate">{user?.user_metadata?.full_name || user?.email || 'User'}</div>
              <div className="text-xs text-orange-200 font-medium truncate">{user?.email || ''}</div>
            </div>
          )}
          <div className="flex gap-2 ml-auto">
           
            <button
              className="p-2 rounded-full bg-white/10 hover:bg-red-100/80 text-red-500 hover:text-red-700 transition-all duration-150 shadow-md"
              title="Logout"
              aria-label="Logout"
              onClick={signOut}
              disabled={loading}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
