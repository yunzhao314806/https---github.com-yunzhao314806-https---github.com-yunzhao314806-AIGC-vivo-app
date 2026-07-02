import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Job, Application } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Users, Briefcase, TrendingUp, ChevronRight,
  MapPin, DollarSign, Eye, Edit, ToggleLeft
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getMockJobsByEnterprise, getStatsForEnterprise, MOCK_JOBS } from '@/lib/mock-data';

const INDUSTRIES = [
  { value: 'tech', label: '互联网/科技' },
  { value: 'finance', label: '金融/投资' },
  { value: 'manufacturing', label: '制造业' },
  { value: 'education', label: '教育培训' },
  { value: 'medical', label: '医疗健康' },
  { value: 'other', label: '其他' },
];

export default function EnterpriseHome() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ jobs: 0, applications: 0, interviews: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', requirements: '',
    skills_required: '', salary_min: '', salary_max: '',
    location: '', industry: 'tech', job_type: '全职',
    experience_required: '', education_required: '',
  });

  useEffect(() => {
    if (user) { fetchJobs(); fetchStats(); }
  }, [user]);

  const fetchJobs = async () => {
    try {
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('enterprise_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!data) throw new Error('No data');
      setJobs(Array.isArray(data) ? data as Job[] : []);
    } catch {
      setJobs(getMockJobsByEnterprise(user!.id).slice(0, 10));
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const [jobsRes, appsRes] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('enterprise_id', user!.id),
        supabase.from('applications').select('id', { count: 'exact', head: true })
          .in('job_id', (await supabase.from('jobs').select('id').eq('enterprise_id', user!.id)).data?.map((j: { id: string }) => j.id) || []),
      ]);
      setStats({ jobs: jobsRes.count || 0, applications: appsRes.count || 0, interviews: 0 });
    } catch {
      setStats(getStatsForEnterprise(user!.id));
    }
  };

  const handlePostJob = async () => {
    if (!form.title.trim()) { toast.error('请填写职位名称'); return; }
    setPosting(true);
    try {
      const { error } = await supabase.from('jobs').insert({
        enterprise_id: user!.id,
        title: form.title,
        description: form.description,
        requirements: form.requirements,
        skills_required: form.skills_required ? form.skills_required.split(',').map(s => s.trim()) : [],
        salary_min: form.salary_min ? parseInt(form.salary_min) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max) : null,
        location: form.location,
        industry: form.industry,
        job_type: form.job_type,
        experience_required: form.experience_required,
        education_required: form.education_required,
        status: 'active',
      });
      if (error) throw error;
      toast.success('职位已发布');
    } catch {
      // 降级：演示模式，往本地 state 加一条 mock 数据
      const mockJob: Job = {
        id: `mock-job-${Date.now()}`,
        enterprise_id: user!.id,
        title: form.title,
        description: form.description || null,
        requirements: form.requirements || null,
        skills_required: form.skills_required ? form.skills_required.split(',').map(s => s.trim()) : [],
        salary_min: form.salary_min ? parseInt(form.salary_min) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max) : null,
        location: form.location || null,
        industry: form.industry,
        job_type: form.job_type,
        experience_required: form.experience_required || null,
        education_required: form.education_required || null,
        status: 'active',
        view_count: 0,
        apply_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setJobs(prev => [mockJob, ...prev]);
      setStats(prev => ({ ...prev, jobs: prev.jobs + 1 }));
      toast.success('职位已发布（演示模式）');
    }
    setDialogOpen(false);
    setForm({ title: '', description: '', requirements: '', skills_required: '', salary_min: '', salary_max: '', location: '', industry: 'tech', job_type: '全职', experience_required: '', education_required: '' });
    setPosting(false);
  };

  const handleToggleStatus = async (job: Job) => {
    const newStatus = job.status === 'active' ? 'closed' : 'active';
    try {
      const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', job.id);
      if (error) throw error;
      toast.success(newStatus === 'active' ? '职位已开放' : '职位已关闭');
      fetchJobs();
    } catch {
      // 降级：演示模式，直接更新本地 state
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: newStatus } : j));
      toast.success(newStatus === 'active' ? '职位已开放（演示模式）' : '职位已关闭（演示模式）');
    }
  };

  const updateForm = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground text-balance">企业招聘中心</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 px-3 sm:px-4"><Plus className="w-4 h-4 mr-1.5 sm:mr-2" />发布职位</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">发布新职位</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4 pt-2">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm font-normal">职位名称 *</Label>
                <Input value={form.title} onChange={e => updateForm('title', e.target.value)} placeholder="例如：前端开发工程师" className="px-3 h-9" />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-sm font-normal">行业</Label>
                  <Select value={form.industry} onValueChange={v => updateForm('industry', v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-sm font-normal">工作类型</Label>
                  <Select value={form.job_type} onValueChange={v => updateForm('job_type', v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['全职', '兼职', '实习', '远程'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm font-normal">工作地点</Label>
                <Input value={form.location} onChange={e => updateForm('location', e.target.value)} placeholder="例如：北京市朝阳区" className="px-3 h-9" />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-sm font-normal">最低薪资(元/月)</Label>
                  <Input type="number" value={form.salary_min} onChange={e => updateForm('salary_min', e.target.value)} placeholder="15000" className="px-3 h-9" />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-sm font-normal">最高薪资(元/月)</Label>
                  <Input type="number" value={form.salary_max} onChange={e => updateForm('salary_max', e.target.value)} placeholder="25000" className="px-3 h-9" />
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm font-normal">技能要求(逗号分隔)</Label>
                <Input value={form.skills_required} onChange={e => updateForm('skills_required', e.target.value)} placeholder="React, TypeScript, Node.js" className="px-3 h-9" />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-sm font-normal">工作经验</Label>
                  <Input value={form.experience_required} onChange={e => updateForm('experience_required', e.target.value)} placeholder="3年以上" className="px-3 h-9" />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-sm font-normal">学历要求</Label>
                  <Input value={form.education_required} onChange={e => updateForm('education_required', e.target.value)} placeholder="本科及以上" className="px-3 h-9" />
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm font-normal">职位描述</Label>
                <Textarea value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder="描述职位职责、工作内容..." className="px-3 resize-none" rows={3} />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm font-normal">任职要求</Label>
                <Textarea value={form.requirements} onChange={e => updateForm('requirements', e.target.value)} placeholder="描述对候选人的要求..." className="px-3 resize-none" rows={3} />
              </div>
              <Button onClick={handlePostJob} disabled={posting} className="w-full h-9">
                {posting ? '发布中...' : '发布职位'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计数据 */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: '在招职位', value: stats.jobs, icon: Briefcase, link: '/enterprise/recruitment' },
          { label: '收到申请', value: stats.applications, icon: Users, link: '/enterprise/talent-pool' },
          { label: '面试中', value: stats.interviews, icon: TrendingUp, link: '/enterprise/recruitment' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.link}>
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center">
                  <Icon className="w-4 sm:w-5 h-4 sm:h-5 text-primary mb-1.5 sm:mb-2" />
                  <span className="text-xl sm:text-2xl font-bold text-foreground">{item.value}</span>
                  <span className="text-xs text-muted-foreground mt-0.5 sm:mt-1">{item.label}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 职位列表 */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base">我的职位</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm">
              <Link to="/enterprise/recruitment">全部 <ChevronRight className="w-3 sm:w-4 h-3 sm:h-4 ml-0.5 sm:ml-1" /></Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2 sm:space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-14 sm:h-16 bg-muted" />)}</div>
          ) : jobs.length === 0 ? (
            <div className="py-6 sm:py-8 text-center text-muted-foreground">
              <Briefcase className="w-8 sm:w-10 h-8 sm:h-10 mx-auto mb-2 sm:mb-3" />
              <p className="text-sm sm:text-base">还没有发布职位，点击"发布职位"开始招聘</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {jobs.map(job => (
                <div key={job.id} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-md border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="font-medium text-foreground text-sm sm:text-base truncate">{job.title}</span>
                      <Badge variant={job.status === 'active' ? 'default' : 'secondary'} className="text-xs shrink-0">
                        {job.status === 'active' ? '招聘中' : '已关闭'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-muted-foreground">
                      {job.location && <span className="flex items-center gap-1 whitespace-nowrap"><MapPin className="w-3 h-3" />{job.location}</span>}
                      <span className="flex items-center gap-1 whitespace-nowrap"><Eye className="w-3 h-3" />{job.view_count}次浏览</span>
                      <span className="flex items-center gap-1 whitespace-nowrap"><Users className="w-3 h-3" />{job.apply_count}份申请</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 sm:h-8 w-7 sm:w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => handleToggleStatus(job)}
                    title={job.status === 'active' ? '关闭职位' : '开放职位'}
                  >
                    <ToggleLeft className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
