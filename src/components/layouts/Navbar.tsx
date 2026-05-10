import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  BrainCircuit, Menu, Home, FileText, MessageSquare, User,
  Building2, Users, BarChart3, Settings, Shield, LogOut,
  Bell, Briefcase, Search
} from 'lucide-react';

// 求职者导航
const jobseekerNavItems = [
  { path: '/jobseeker/home', label: '首页', icon: Home },
  { path: '/jobseeker/resume', label: '简历管理', icon: FileText },
  { path: '/jobseeker/jobs', label: '职位搜索', icon: Search },
  { path: '/jobseeker/ai-match', label: 'AI匹配', icon: BrainCircuit },
  { path: '/jobseeker/profile', label: '个人中心', icon: User },
];

// 企业导航
const enterpriseNavItems = [
  { path: '/enterprise/home', label: '首页', icon: Home },
  { path: '/enterprise/talent-pool', label: '人才库', icon: Users },
  { path: '/enterprise/recruitment', label: '招聘流程', icon: Briefcase },
  { path: '/enterprise/messages', label: '沟通协作', icon: MessageSquare },
  { path: '/enterprise/stats', label: '数据统计', icon: BarChart3 },
];

// 管理员导航
const adminNavItems = [
  { path: '/admin/users', label: '用户管理', icon: Shield },
  { path: '/admin/data', label: '数据维护', icon: Settings },
  { path: '/admin/monitoring', label: '运营监控', icon: BarChart3 },
];

function getNavItems(userType: string | undefined, role: string | undefined) {
  if (role === 'admin' || userType === 'admin') return adminNavItems;
  if (userType === 'enterprise') return enterpriseNavItems;
  return jobseekerNavItems;
}

function getHomeRoute(userType: string | undefined, role: string | undefined) {
  if (role === 'admin' || userType === 'admin') return '/admin/users';
  if (userType === 'enterprise') return '/enterprise/home';
  return '/jobseeker/home';
}

interface NavbarProps {
  variant?: 'sidebar' | 'top';
}

export function Navbar({ variant = 'top' }: NavbarProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = getNavItems(user?.user_type, user?.role);
  const homeRoute = getHomeRoute(user?.user_type, user?.role);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const NavLinks = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onLinkClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="flex h-14 items-center px-4 md:px-6 gap-4">
        {/* 移动端汉堡菜单 */}
        {isAuthenticated && (
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <div className="p-4 border-b border-sidebar-border">
                <Link to={homeRoute} className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                  <BrainCircuit className="w-6 h-6 text-sidebar-primary" />
                  <span className="font-bold text-sidebar-foreground">智聘未来</span>
                </Link>
              </div>
              <div className="p-3">
                <NavLinks onLinkClick={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Logo */}
        <Link to={homeRoute} className="flex items-center gap-2 shrink-0">
          <BrainCircuit className="w-6 h-6 text-primary" />
          <span className="font-bold text-foreground hidden sm:block">智聘未来</span>
        </Link>

        {/* 桌面端导航 */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="icon" className="relative shrink-0">
                <Bell className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2 h-9 shrink-0">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {(user?.display_name || user?.username || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:block text-sm text-foreground max-w-[100px] truncate">
                      {user?.display_name || user?.username}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">{user?.display_name || user?.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.role === 'admin' ? '管理员' : user?.user_type === 'enterprise' ? '企业用户' : '求职者'}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={user?.user_type === 'enterprise' ? '/enterprise/home' : user?.role === 'admin' ? '/admin/users' : '/jobseeker/profile'}>
                      <User className="w-4 h-4 mr-2" />个人中心
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild size="sm" className="h-8">
              <Link to="/login">登录 / 注册</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
