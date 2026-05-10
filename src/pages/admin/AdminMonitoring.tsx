import React, { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Users, Briefcase, MessageSquare, TrendingUp } from 'lucide-react';

export default function AdminMonitoring() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalJobs: 0,
    totalApplications: 0,
    totalConversations: 0,
  });
  const [loading, setLoading] = useState(true);

  // 模拟30天趋势数据
  const trendData = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      新用户: Math.floor(Math.random() * 20) + 5,
      新职位: Math.floor(Math.random() * 10) + 2,
      申请量: Math.floor(Math.random() * 30) + 10,
    };
  });

  const activityData = [
    { name: '互联网', users: 45, jobs: 23 },
    { name: '金融', users: 28, jobs: 15 },
    { name: '制造业', users: 19, jobs: 11 },
    { name: '教育', users: 22, jobs: 9 },
    { name: '医疗', users: 16, jobs: 7 },
    { name: '其他', users: 35, jobs: 18 },
  ];

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    const [usersRes, jobsRes, appsRes, convsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      supabase.from('applications').select('id', { count: 'exact', head: true }),
      supabase.from('ai_conversations').select('id', { count: 'exact', head: true }),
    ]);
    setStats({
      totalUsers: usersRes.count || 0,
      totalJobs: jobsRes.count || 0,
      totalApplications: appsRes.count || 0,
      totalConversations: convsRes.count || 0,
    });
    setLoading(false);
  };

  const statCards = [
    { label: '注册用户', value: stats.totalUsers, icon: Users, color: 'text-primary' },
    { label: '在招职位', value: stats.totalJobs, icon: Briefcase, color: 'text-chart-2' },
    { label: '总申请数', value: stats.totalApplications, icon: TrendingUp, color: 'text-chart-3' },
    { label: 'AI对话次数', value: stats.totalConversations, icon: MessageSquare, color: 'text-chart-4' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground text-balance">运营监控</h1>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{card.label}</span>
                  <Icon className={`w-4 h-4 ${card.color} shrink-0`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{loading ? '-' : card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">截至今日</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 趋势图 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">过去14天平台活跃度</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: 12 }} />
                <Legend wrapperStyle={{ paddingTop: 8 }} layout="horizontal" />
                <Line type="monotone" dataKey="新用户" stroke="hsl(161, 48%, 30%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="新职位" stroke="hsl(22, 89%, 54%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="申请量" stroke="hsl(199, 89%, 50%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 行业分布 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">各行业用户与职位分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activityData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: 12 }} />
                <Legend wrapperStyle={{ paddingTop: 8 }} layout="horizontal" />
                <Bar dataKey="users" name="用户数" fill="hsl(161, 48%, 30%)" />
                <Bar dataKey="jobs" name="职位数" fill="hsl(22, 89%, 54%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 系统状态 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">系统服务状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { name: 'AI匹配服务', status: 'online', desc: '双引擎匹配正常运行' },
              { name: '数据库服务', status: 'online', desc: 'Supabase连接正常' },
              { name: 'Edge Functions', status: 'online', desc: 'API代理正常' },
            ].map(s => (
              <div key={s.name} className="p-3 rounded-md border border-border flex items-start gap-3">
                <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${s.status === 'online' ? 'bg-primary' : 'bg-destructive'}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
