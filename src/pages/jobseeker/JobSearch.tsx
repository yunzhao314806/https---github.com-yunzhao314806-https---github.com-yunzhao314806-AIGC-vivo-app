import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Job } from '@/types/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MapPin, DollarSign, Clock, ChevronRight, Filter } from 'lucide-react';
import { toast } from 'sonner';

const INDUSTRIES = [
  { value: 'all', label: '全部行业' },
  { value: 'tech', label: '互联网/科技' },
  { value: 'finance', label: '金融/投资' },
  { value: 'manufacturing', label: '制造业' },
  { value: 'education', label: '教育培训' },
  { value: 'medical', label: '医疗健康' },
  { value: 'other', label: '其他' },
];

const SALARY_RANGES = [
  { value: 'all', label: '不限薪资' },
  { value: '0-10000', label: '10K以下' },
  { value: '10000-20000', label: '10K-20K' },
  { value: '20000-30000', label: '20K-30K' },
  { value: '30000-999999', label: '30K以上' },
];

export default function JobSearch() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [industry, setIndustry] = useState('all');
  const [salaryRange, setSalaryRange] = useState('all');

  useEffect(() => {
    fetchJobs();
  }, [industry, salaryRange]);

  const fetchJobs = async (search?: string) => {
    setLoading(true);
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(30);

    if (industry !== 'all') query = query.eq('industry', industry);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    if (salaryRange !== 'all') {
      const [min, max] = salaryRange.split('-').map(Number);
      if (min) query = query.gte('salary_min', min);
      if (max < 999999) query = query.lte('salary_max', max);
    }

    const { data, error } = await query;
    if (error) toast.error('加载失败');
    else setJobs(Array.isArray(data) ? data as Job[] : []);
    setLoading(false);
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
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground text-balance">职位搜索</h1>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 min-w-0 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索职位名称、技能关键词..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="pl-9 px-3"
              />
            </div>
            <Button type="submit" size="sm" className="shrink-0 h-9">搜索</Button>
          </form>
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
              <Filter className="w-4 h-4" />筛选:
            </div>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map(i => (
                  <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={salaryRange} onValueChange={setSalaryRange}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALARY_RANGES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 职位列表 */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">共找到 {jobs.length} 个职位</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="p-4 space-y-2">
              <Skeleton className="h-5 w-1/2 bg-muted" />
              <Skeleton className="h-4 w-1/3 bg-muted" />
            </CardContent></Card>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          暂无符合条件的职位，请调整筛选条件
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <Link key={job.id} to={`/jobseeker/jobs/${job.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
                        <Badge variant="outline" className="text-xs shrink-0">{job.industry || '通用'}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {job.location && <span className="flex items-center gap-1 whitespace-nowrap"><MapPin className="w-3.5 h-3.5" />{job.location}</span>}
                        <span className="flex items-center gap-1 whitespace-nowrap"><DollarSign className="w-3.5 h-3.5" />{formatSalary(job.salary_min, job.salary_max)}</span>
                        <span className="flex items-center gap-1 whitespace-nowrap"><Clock className="w-3.5 h-3.5" />{job.job_type}</span>
                        {job.experience_required && <span className="whitespace-nowrap">{job.experience_required}</span>}
                      </div>
                      {Array.isArray(job.skills_required) && job.skills_required.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {(job.skills_required as string[]).slice(0, 5).map((s: string) => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
