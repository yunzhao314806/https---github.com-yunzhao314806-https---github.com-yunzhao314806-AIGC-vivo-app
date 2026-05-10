import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Application, ApplicationStatus } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { getMockApplicationsForEnterprise, getMockJobById, getMockProfileById } from '@/lib/mock-data';

const STAGES: { key: ApplicationStatus; label: string; color: string }[] = [
  { key: 'pending', label: '待审核', color: 'bg-muted-foreground/20' },
  { key: 'reviewing', label: '审核中', color: 'bg-chart-4/20' },
  { key: 'interview', label: '面试', color: 'bg-primary/20' },
  { key: 'offer', label: '发Offer', color: 'bg-chart-1/20' },
];

export default function Recruitment() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    try {
      const { data: jobsData } = await supabase.from('jobs').select('id').eq('enterprise_id', user!.id);
      const jobIds = Array.isArray(jobsData) ? jobsData.map((j: { id: string }) => j.id) : [];
      if (jobIds.length === 0) { setLoading(false); return; }

      const { data } = await supabase
        .from('applications')
        .select('*, job:jobs(title), applicant:profiles(display_name, username)')
        .in('job_id', jobIds)
        .order('applied_at', { ascending: false })
        .limit(100);

      setApplications(Array.isArray(data) ? data as Application[] : []);
    } catch {
      const mockApps = getMockApplicationsForEnterprise(user!.id);
      const enrichedApps = mockApps.map(app => ({
        ...app,
        job: { title: getMockJobById(app.job_id)?.title || '未知职位' },
        applicant: getMockProfileById(app.applicant_id),
      }));
      setApplications(enrichedApps as unknown as Application[]);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (appId: string, status: ApplicationStatus) => {
    try {
      const { error } = await supabase.from('applications').update({ status }).eq('id', appId);
      if (error) throw error;
      toast.success('状态已更新');
    } catch {
      toast.success('状态已更新（演示模式）');
    }
    fetchApplications();
  };

  const getAppsForStage = (stage: ApplicationStatus) =>
    applications.filter(app => app.status === stage);

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-64 bg-muted" />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground text-balance">招聘流程管理</h1>
      <p className="text-sm text-muted-foreground -mt-4">
        共 {applications.length} 名候选人在流程中
      </p>

      {/* 看板视图 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STAGES.map(stage => {
          const stageApps = getAppsForStage(stage.key);
          return (
            <div key={stage.key} className="flex flex-col gap-3">
              <div className={`rounded-md px-3 py-2 ${stage.color}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{stage.label}</span>
                  <Badge variant="secondary" className="text-xs">{stageApps.length}</Badge>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {stageApps.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground">暂无候选人</p>
                  </div>
                ) : (
                  stageApps.map(app => {
                    const applicant = app.applicant as unknown as { display_name?: string; username?: string } | undefined;
                    const job = app.job as unknown as { title?: string };
                    return (
                      <Card key={app.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3 space-y-2">
                          <p className="font-medium text-sm text-foreground truncate">
                            {applicant?.display_name || applicant?.username || '未知候选人'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{job?.title}</p>
                          {app.match_score && (
                            <div className="flex items-center gap-1 text-xs text-primary">
                              <TrendingUp className="w-3 h-3" />{app.match_score}% 匹配
                            </div>
                          )}
                          {/* 移动到下一阶段 */}
                          {stage.key !== 'offer' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full h-7 text-xs"
                              onClick={() => {
                                const nextStages: Partial<Record<ApplicationStatus, ApplicationStatus>> = {
                                  pending: 'reviewing',
                                  reviewing: 'interview',
                                  interview: 'offer',
                                };
                                const next = nextStages[stage.key];
                                if (next) handleUpdateStatus(app.id, next);
                              }}
                            >
                              推进 <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleUpdateStatus(app.id, 'rejected')}
                          >
                            淘汰
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 已淘汰列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-muted-foreground">已淘汰候选人</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.filter(a => a.status === 'rejected').length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">暂无淘汰记录</p>
          ) : (
            <div className="space-y-2">
              {applications.filter(a => a.status === 'rejected').map(app => {
                const applicant = app.applicant as unknown as { display_name?: string; username?: string };
                const job = app.job as unknown as { title?: string };
                return (
                  <div key={app.id} className="flex items-center justify-between p-2.5 rounded-md border border-border opacity-60">
                    <div>
                      <p className="text-sm text-foreground">{applicant?.display_name || applicant?.username}</p>
                      <p className="text-xs text-muted-foreground">{job?.title}</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleUpdateStatus(app.id, 'reviewing')}>
                      重新考虑
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}