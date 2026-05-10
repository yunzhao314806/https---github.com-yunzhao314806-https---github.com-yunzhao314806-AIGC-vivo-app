import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Application } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CapabilityRadarChart } from '@/components/charts/CapabilityRadarChart';
import { CapabilityTreeImage } from '@/components/charts/CapabilityTreeImage';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Search, Users, TrendingUp, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DEFAULT_RADAR = [
  { subject: '编程技能', value: 75 },
  { subject: '系统设计', value: 60 },
  { subject: '数据分析', value: 70 },
  { subject: '项目管理', value: 55 },
  { subject: '沟通协作', value: 80 },
  { subject: '学习能力', value: 85 },
];

const JOB_RADAR = [
  { subject: '编程技能', value: 85 },
  { subject: '系统设计', value: 75 },
  { subject: '数据分析', value: 65 },
  { subject: '项目管理', value: 70 },
  { subject: '沟通协作', value: 75 },
  { subject: '学习能力', value: 80 },
];

const DEFAULT_TREE = {
  name: '技术能力',
  children: [
    {
      name: '编程语言',
      children: [
        { name: 'Python', value: 80 },
        { name: 'Java', value: 65 },
        { name: 'JavaScript', value: 75 },
      ],
    },
    {
      name: '框架工具',
      children: [
        { name: 'React', value: 70 },
        { name: 'FastAPI', value: 60 },
      ],
    },
    {
      name: '数据库',
      children: [
        { name: 'MySQL', value: 72 },
        { name: 'Redis', value: 55 },
      ],
    },
  ],
};

export default function TalentPool() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    if (user) fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    // 先获取企业职位
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('id')
      .eq('enterprise_id', user!.id);

    const jobIds = Array.isArray(jobsData) ? jobsData.map((j: { id: string }) => j.id) : [];
    if (jobIds.length === 0) { setLoading(false); return; }

    const { data } = await supabase
      .from('applications')
      .select('*, job:jobs(title), applicant:profiles(id, display_name, username, location, bio)')
      .in('job_id', jobIds)
      .order('applied_at', { ascending: false })
      .limit(50);

    setApplications(Array.isArray(data) ? data as Application[] : []);
    setLoading(false);
  };

  const handleUpdateCandidateStatus = async (appId: string, status: string) => {
    const { error } = await supabase.from('applications').update({ candidate_status: status }).eq('id', appId);
    if (error) toast.error('更新失败');
    else {
      toast.success('候选人状态已更新');
      fetchApplications();
    }
  };

  const filteredApps = applications.filter(app => {
    const applicant = app.applicant as unknown as { display_name?: string; username?: string } | undefined;
    const matchName = !searchText ||
      applicant?.display_name?.includes(searchText) ||
      applicant?.username?.includes(searchText);
    const matchStatus = statusFilter === 'all' || app.candidate_status === statusFilter;
    return matchName && matchStatus;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground text-balance">人才库管理</h1>

      {/* 筛选区 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-0 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索候选人姓名..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="pl-9 px-3"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="interested">感兴趣</SelectItem>
                <SelectItem value="pending">待定</SelectItem>
                <SelectItem value="unmatched">不匹配</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 候选人列表 */}
      <div className="space-y-1 mb-2">
        <p className="text-sm text-muted-foreground">共 {filteredApps.length} 位候选人</p>
      </div>

      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 bg-muted" />)}</div>
      ) : filteredApps.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3" />
          暂无候选人，等待求职者投递
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filteredApps.map(app => {
            const applicant = app.applicant as unknown as { display_name?: string; username?: string; location?: string; bio?: string };
            const job = app.job as unknown as { title?: string };
            return (
              <Card key={app.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">
                          {applicant?.display_name || applicant?.username || '未知候选人'}
                        </span>
                        {app.match_score && (
                          <Badge variant="outline" className="text-xs text-primary border-primary/30">
                            <TrendingUp className="w-3 h-3 mr-1" />{app.match_score}% 匹配
                          </Badge>
                        )}
                        {app.candidate_status === 'interested' && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">感兴趣</Badge>}
                        {app.candidate_status === 'unmatched' && <Badge variant="secondary" className="text-xs">不匹配</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        申请岗位：{job?.title || '未知职位'} · {new Date(app.applied_at).toLocaleDateString('zh-CN')}
                      </p>
                      {applicant?.location && <p className="text-xs text-muted-foreground">{applicant.location}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Select
                        value={app.candidate_status || 'pending'}
                        onValueChange={v => handleUpdateCandidateStatus(app.id, v)}
                      >
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="interested">感兴趣</SelectItem>
                          <SelectItem value="pending">待定</SelectItem>
                          <SelectItem value="unmatched">不匹配</SelectItem>
                        </SelectContent>
                      </Select>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => setSelectedApp(app)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />能力图谱
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>
                              {applicant?.display_name || applicant?.username} 的能力图谱对比
                            </DialogTitle>
                          </DialogHeader>
                          <div className="pt-2">
                            <Tabs defaultValue="radar">
                              <TabsList className="w-full mb-4">
                                <TabsTrigger value="radar" className="flex-1">雷达图对比</TabsTrigger>
                                <TabsTrigger value="tree" className="flex-1">能力树图</TabsTrigger>
                              </TabsList>
                              <TabsContent value="radar">
                                <p className="text-xs text-muted-foreground mb-3">蓝色为候选人能力，橙色为岗位要求</p>
                                <CapabilityRadarChart
                                  data={DEFAULT_RADAR}
                                  compareData={JOB_RADAR}
                                  height={260}
                                />
                              </TabsContent>
                              <TabsContent value="tree">
                                <p className="text-xs text-muted-foreground mb-3">
                                  候选人技术能力树，叶节点底部进度条表示掌握程度
                                </p>
                                <div className="rounded-lg border border-border overflow-hidden">
                                  <CapabilityTreeImage data={DEFAULT_TREE} />
                                </div>
                              </TabsContent>
                            </Tabs>
                            <div className="mt-4 p-3 bg-primary/5 rounded-md border border-primary/20">
                              <p className="text-sm font-medium text-primary">综合匹配度：{app.match_score || 72}%</p>
                              <p className="text-xs text-muted-foreground mt-1">该候选人在编程技能和学习能力方面表现突出</p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
