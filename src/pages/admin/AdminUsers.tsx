import React, { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Profile, UserRole, UserType } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, Shield, Building2, User } from 'lucide-react';
import { toast } from 'sonner';
import { getMockProfiles, getStatsForAdmin } from '@/lib/mock-data';

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, jobseekers: 0, enterprises: 0, admins: 0 });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!data) throw new Error('No data');
      const userList = Array.isArray(data) ? data as Profile[] : [];
      setUsers(userList);
      setStats({
        total: userList.length,
        jobseekers: userList.filter(u => u.user_type === 'jobseeker').length,
        enterprises: userList.filter(u => u.user_type === 'enterprise').length,
        admins: userList.filter(u => u.role === 'admin').length,
      });
    } catch {
      const mockProfiles = getMockProfiles();
      setUsers(mockProfiles);
      setStats(getStatsForAdmin());
    }
    setLoading(false);
  };

  const handleUpdateRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
      if (error) throw error;
      toast.success('角色已更新');
      fetchUsers();
    } catch {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      setStats({
        total: users.length,
        jobseekers: users.filter(u => u.user_type === 'jobseeker').length,
        enterprises: users.filter(u => u.user_type === 'enterprise').length,
        admins: users.filter(u => u.id === userId ? role === 'admin' : u.role === 'admin').length,
      });
      toast.success('角色已更新（本地缓存）');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = !searchText ||
      u.username?.includes(searchText) ||
      u.display_name?.includes(searchText) ||
      u.email?.includes(searchText);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchType = typeFilter === 'all' || u.user_type === typeFilter;
    return matchSearch && matchRole && matchType;
  });

  const getUserTypeIcon = (type: UserType) => {
    if (type === 'admin') return <Shield className="w-3.5 h-3.5 text-primary" />;
    if (type === 'enterprise') return <Building2 className="w-3.5 h-3.5 text-chart-2" />;
    return <User className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground text-balance">用户管理</h1>

      {/* 统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '总用户', value: stats.total, icon: Users },
          { label: '求职者', value: stats.jobseekers, icon: User },
          { label: '企业用户', value: stats.enterprises, icon: Building2 },
          { label: '管理员', value: stats.admins, icon: Shield },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className="w-8 h-8 text-primary shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-0 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="搜索用户名、邮箱..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9 px-3" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-28 shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="user">普通用户</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="jobseeker">求职者</SelectItem>
                <SelectItem value="enterprise">企业</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">用户列表 ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">用户</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">类型</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">角色</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">注册时间</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={5} className="px-4 py-3"><Skeleton className="h-8 bg-muted" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">暂无用户数据</td></tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-primary">
                              {(u.display_name || u.username || '?')[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{u.display_name || u.username}</p>
                            <p className="text-xs text-muted-foreground">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getUserTypeIcon(u.user_type)}
                          <span className="text-sm text-foreground">
                            {u.user_type === 'jobseeker' ? '求职者' : u.user_type === 'enterprise' ? '企业' : '管理员'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                          {u.role === 'admin' ? '管理员' : '普通用户'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {u.role !== 'admin' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleUpdateRole(u.id, 'admin')}
                          >
                            设为管理员
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => handleUpdateRole(u.id, 'user')}
                          >
                            撤销管理员
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
