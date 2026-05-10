import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Job } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, MapPin, DollarSign, BrainCircuit, TrendingUp,
  FileText, Star, ChevronRight, Briefcase, Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function JobseekerHome() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [stats, setStats] = useState({ resumes: 0, applications: 0, favorites: 0 });

  useEffect(() => {
    fetchJobs();
    fetchStats();
  }, []);

  const fetchJobs = async (search?: string) => {
    setLoading(true);
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(12);

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      toast.error('加载职位失败');
    } else {
      setJobs(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    if (!user) return;
    const [resumesRes, appsRes, favsRes] = await Promise.all([
      supabase.from('resumes').select('id', { count: 'exact', head: true }).eq('profile_id', user.id),
      supabase.from('applications').select('id', { count: 'exact', head: true }).eq('applicant_id', user.id),
      supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    setStats({
      resumes: resumesRes.count || 0,
      applications: appsRes.count || 0,
      favorites: favsRes.count || 0,
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs(searchText);
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return '薪资面议';
    if (min && max) return `${min / 1000}k-${max / 1000}k`;
    if (min) return `${min / 1000}k+`;
    return `最高${max! / 1000}k`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 欢迎横幅 */}
      <div className="bg-primary text-primary-foreground px-4 md:px-8 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-balance mb-2">
            你好，{user?.display_name || user?.username}！
          </h1>
          <p className="text-primary-foreground/80 text-pretty mb-6">
            AI智能匹配助你找到最适合的工作机会
          </p>

          {/* 搜索栏 */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
            <div className="flex-1 min-w-0 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索职位名称、技能..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="pl-9 bg-background text-foreground border-background/30 px-3"
              />
            </div>
            <Button type="submit" variant="ghost" className="shrink-0 border border-primary-foreground/60 text-primary-foreground hover:bg-primary-foreground/10">
              搜索
            </Button>
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: '我的简历', value: stats.resumes, icon: FileText, link: '/jobseeker/resume' },
            { label: '投递记录', value: stats.applications, icon: Briefcase, link: '/jobseeker/profile' },
            { label: '收藏职位', value: stats.favorites, icon: Star, link: '/jobseeker/profile' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.label} to={item.link}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <Icon className="w-5 h-5 text-primary mb-2" />
                    <span className="text-2xl font-bold text-foreground">{item.value}</span>
                    <span className="text-xs text-muted-foreground mt-1">{item.label}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* 快捷功能 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <BrainCircuit className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">AI智能匹配</h3>
                <p className="text-sm text-muted-foreground text-pretty">通过对话找到最匹配的岗位</p>
              </div>
              <Button asChild size="sm">
                <Link to="/jobseeker/ai-match">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">能力图谱</h3>
                <p className="text-sm text-muted-foreground text-pretty">查看你的技能雷达图与能力树</p>
              </div>
              <Button asChild size="sm" variant="secondary">
                <Link to="/jobseeker/resume">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 推荐职位 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">推荐职位</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/jobseeker/jobs">查看全部 <ChevronRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array(4).fill(0).map((_, i) => (
                <Card key={i}><CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4 bg-muted" />
                  <Skeleton className="h-4 w-1/2 bg-muted" />
                  <Skeleton className="h-4 w-2/3 bg-muted" />
                </CardContent></Card>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              暂无推荐职位，请先完善您的简历
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map(job => (
                <Link key={job.id} to={`/jobseeker/jobs/${job.id}`}>
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-foreground text-balance leading-snug">{job.title}</h3>
                        <Badge variant="outline" className="shrink-0 text-xs">{job.industry || '通用'}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-1 flex-1">
                        {job.location && (
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            <MapPin className="w-3.5 h-3.5" />{job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <DollarSign className="w-3.5 h-3.5" />{formatSalary(job.salary_min, job.salary_max)}
                        </span>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5" />{job.job_type}
                        </span>
                      </div>
                      {Array.isArray(job.skills_required) && job.skills_required.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {(job.skills_required as string[]).slice(0, 4).map((s: string) => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
