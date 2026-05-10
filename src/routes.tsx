import React from 'react';
import { Navigate } from 'react-router-dom';
import Login from '@/pages/Login';

// 求职者页面
import JobseekerHome from '@/pages/jobseeker/Home';
import ResumeManagement from '@/pages/jobseeker/ResumeManagement';
import JobSearch from '@/pages/jobseeker/JobSearch';
import JobDetail from '@/pages/jobseeker/JobDetail';
import AIMatch from '@/pages/jobseeker/AIMatch';
import JobseekerProfile from '@/pages/jobseeker/Profile';

// 企业页面
import EnterpriseHome from '@/pages/enterprise/Home';
import TalentPool from '@/pages/enterprise/TalentPool';
import Recruitment from '@/pages/enterprise/Recruitment';
import EnterpriseMessages from '@/pages/enterprise/Messages';
import EnterpriseStats from '@/pages/enterprise/Stats';

// 管理员页面
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminData from '@/pages/admin/AdminData';
import AdminMonitoring from '@/pages/admin/AdminMonitoring';

export interface RouteConfig {
  path: string;
  element: React.ReactNode;
}

export const routes: RouteConfig[] = [
  // 根路径重定向
  { path: '/', element: <Navigate to="/login" replace /> },

  // 登录/注册
  { path: '/login', element: <Login /> },

  // 求职者路由
  { path: '/jobseeker/home', element: <JobseekerHome /> },
  { path: '/jobseeker/resume', element: <ResumeManagement /> },
  { path: '/jobseeker/jobs', element: <JobSearch /> },
  { path: '/jobseeker/jobs/:id', element: <JobDetail /> },
  { path: '/jobseeker/ai-match', element: <AIMatch /> },
  { path: '/jobseeker/profile', element: <JobseekerProfile /> },

  // 企业路由
  { path: '/enterprise/home', element: <EnterpriseHome /> },
  { path: '/enterprise/talent-pool', element: <TalentPool /> },
  { path: '/enterprise/recruitment', element: <Recruitment /> },
  { path: '/enterprise/messages', element: <EnterpriseMessages /> },
  { path: '/enterprise/stats', element: <EnterpriseStats /> },

  // 管理员路由
  { path: '/admin/users', element: <AdminUsers /> },
  { path: '/admin/data', element: <AdminData /> },
  { path: '/admin/monitoring', element: <AdminMonitoring /> },

  // 404重定向
  { path: '*', element: <Navigate to="/login" replace /> },
];
