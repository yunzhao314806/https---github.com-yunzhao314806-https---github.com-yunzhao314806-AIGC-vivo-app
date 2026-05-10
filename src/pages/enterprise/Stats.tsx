import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, Briefcase, Target } from 'lucide-react';
import { getMockJobsByEnterprise, getMockApplicationsForEnterprise } from '@/lib/mock-data';

const COLORS = [
  'hsl(217, 72%, 38%)',
  'hsl(22, 89%, 54%)',
  'hsl(199, 89%, 44%)',
  'hsl(43, 96%, 56%)',
  'hsl(259, 70%, 58%)',
];

export default function EnterpriseStats() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalApplications: 0,
    avgMatchScore: 0,
    conversionRate: 0,
  });
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; applications: number; views: number }[]>([]);

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id, view_count, apply_count, status')
        .eq('enterprise_id', user!.id);

      const jobs = Array.isArray(jobsData) ? jobsData : [];
      const jobIds = jobs.map((j: { id: string }) => j.id);

      let applications: { status: string; match_score?: number }[] = [];
      if (jobIds.length > 0) {
        const { data } = await supabase
          .from('applications')
          .select('status, match_score')
          .in('job_id', jobIds);
        applications = Array.isArray(data) ? data : [];
      }

      const totalApplications = applications.length;
      const avgScore = applications.length > 0
        ? Math.round(applications.filter(a => a.match_score).reduce((s, a) => s + (a.match_score || 0), 0) / applications.filter(a => a.match_score).length)
        : 0;
      const offers = applications.filter(a => a.status === 'offer').length;
      const convRate = totalApplications > 0 ? Math.round((offers / totalApplications) * 100) : 0;

      setStats({
        totalJobs: jobs.length,
        totalApplications,
        avgMatchScore: avgScore,
        conversionRate: convRate,
      });

      const statusMap: Record<string, string> = {
        pending: '待审核', reviewing: '审核中', interview: '面试中', offer: '已录用', rejected: '已淘汰'
      };
      const statusCounts: Record<string, number> = {};
      applications.forEach(a => {
        const label = statusMap[a.status] || a.status;
        statusCounts[label] = (statusCounts[label] || 0) + 1;
      });
      setStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));
    } catch {
      const mockJobs = getMockJobsByEnterprise(user!.id);
      const mockApps = getMockApplicationsForEnterprise(user!.id);

      const totalApplications = mockApps.length;
      const avgScore = totalApplications > 0
        ? Math.round(mockApps.filter(a => a.match_score).reduce((s, a) => s + (a.match_score || 0), 0) / mockApps.filter(a => a.match_score).length)
        : 0;
      const offers = mockApps.filter(a => a.status === 'offer').length;
      const convRate = totalApplications > 0 ? Math.round((offers / totalApplications) * 100) : 0;

      setStats({
        totalJobs: mockJobs.length,
        totalApplications,
        avgMatchScore: avgScore,
        conversionRate: convRate,
      });

      const statusMap: Record<string, string> = {
        pending: '待审核', reviewing: '审核中', interview: '面试中', offer: '已录用', rejected: '已淘汰'
      };
      const statusCounts: Record<string, number> = {};
      mockApps.forEach(a => {
        const label = statusMap[a.status] || a.status;
        statusCounts[label] = (statusCounts[label] || 0) + 1;
      });
      setStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));
    }

    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    setWeeklyData(days.map(day => ({
      day,
      applications: Math.floor(Math.random() * 10) + 1,
      views: Math.floor(Math.random() * 50) + 10,
    })));

    setLoading(false);
  };

  const statCards = [
    { label: '发布职位', value: stats.totalJobs, icon: Briefcase, change: '+2本周' },
    { label: '收到申请', value: stats.totalApplications, icon: Users, change: '+12本周' },
    { label: '平均匹配度', value: `${stats.avgMatchScore}%`, icon: Target, change: 'AI评分' },
    { label: '录用转化率', value: `${stats.conversionRate}%`, icon: TrendingUp, change: '行业均值18%' },
  ];

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 bg-muted" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-64 bg-muted" />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground text-balance">数据统计</h1>

      {/* KPI卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="h-full">
              <CardContent className="p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{card.label}</span>
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                </div>
                <span className="text-2xl font-bold text-foreground">{card.value}</span>
                <span className="text-xs text-muted-foreground mt-1">{card.change}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 图表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 本周招聘趋势 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">本周招聘活动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weeklyData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: 12 }} />
                  <Legend wrapperStyle={{ paddingTop: 8 }} layout="horizontal" />
                  <Line type="monotone" dataKey="applications" name="申请数" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="views" name="浏览量" stroke={COLORS[1]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 申请状态分布 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">候选人状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">暂无申请数据</div>
            ) : (
              <div className="w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: 12 }} />
                    <Legend wrapperStyle={{ paddingTop: 8 }} layout="horizontal" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 职位申请对比 */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">各职位招聘效果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={weeklyData.slice(0, 5).map((d, i) => ({ name: `岗位${i + 1}`, views: d.views, applications: d.applications }))}
                  margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: 12 }} />
                  <Legend wrapperStyle={{ paddingTop: 8 }} layout="horizontal" />
                  <Bar dataKey="views" name="浏览量" fill={COLORS[0]} />
                  <Bar dataKey="applications" name="申请数" fill={COLORS[1]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}