import React, { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Job } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Briefcase, Trash2, Eye, ToggleLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminData() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async (search?: string) => {
    let query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (search) query = query.or(`title.ilike.%${search}%`);
    const { data } = await query;
    setJobs(Array.isArray(data) ? data as Job[] : []);
    setLoading(false);
  };

  const handleToggleStatus = async (job: Job) => {
    const newStatus = job.status === 'active' ? 'closed' : 'active';
    await supabase.from('jobs').update({ status: newStatus }).eq('id', job.id);
    toast.success(newStatus === 'active' ? '职位已开放' : '职位已关闭');
    fetchJobs();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) toast.error('删除失败');
    else { toast.success('已删除'); fetchJobs(); }
  };

  const filteredJobs = jobs.filter(j =>
    !searchText || j.title?.includes(searchText) || j.industry?.includes(searchText)
  );

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground text-balance">数据维护</h1>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索职位名称..."
                value={searchText}
                onChange={e => {
                  setSearchText(e.target.value);
                  if (!e.target.value) fetchJobs();
                }}
                onKeyDown={e => e.key === 'Enter' && fetchJobs(searchText)}
                className="pl-9 px-3"
              />
            </div>
            <Button size="sm" onClick={() => fetchJobs(searchText)} className="h-9">搜索</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            职位管理 ({filteredJobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">职位名称</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">行业</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">浏览/申请</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">状态</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">发布时间</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td colSpan={6} className="px-4 py-3"><Skeleton className="h-8 bg-muted" /></td>
                    </tr>
                  ))
                ) : filteredJobs.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">暂无职位数据</td></tr>
                ) : (
                  filteredJobs.map(job => (
                    <tr key={job.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm font-medium text-foreground max-w-[200px] truncate">{job.title}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">{job.industry || '-'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Eye className="w-3 h-3" />{job.view_count}
                          <span className="mx-1">/</span>
                          <Briefcase className="w-3 h-3" />{job.apply_count}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={job.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {job.status === 'active' ? '招聘中' : '已关闭'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">{new Date(job.created_at).toLocaleDateString('zh-CN')}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleToggleStatus(job)}>
                            <ToggleLeft className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(job.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
