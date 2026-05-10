import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Job, Application } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin, DollarSign, Clock, BookOpen, Briefcase, Star, StarOff,
  CheckCircle, ArrowLeft, Building2, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [matchScore] = useState(Math.floor(Math.random() * 30) + 60); // 模拟匹配度

  useEffect(() => {
    if (id) {
      fetchJob();
      checkApplicationStatus();
      checkFavoriteStatus();
    }
  }, [id, user]);

  const fetchJob = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id!)
      .maybeSingle();
    setJob(data as Job | null);
    setLoading(false);
    // 增加浏览量
    if (data) {
      await supabase.from('jobs').update({ view_count: (data.view_count || 0) + 1 }).eq('id', id!);
    }
  };

  const checkApplicationStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', id!)
      .eq('applicant_id', user.id)
      .maybeSingle();
    setApplied(!!data);
  };

  const checkFavoriteStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('job_id', id!)
      .eq('user_id', user.id)
      .maybeSingle();
    setFavorited(!!data);
  };

  const handleApply = async () => {
    if (!user) { navigate('/login'); return; }
    if (applied) return;
    setApplying(true);
    const { error } = await supabase.from('applications').insert({
      job_id: id!,
      applicant_id: user.id,
      status: 'pending',
      match_score: matchScore,
    });
    if (error) {
      toast.error('申请失败：' + error.message);
    } else {
      setApplied(true);
      toast.success('申请已提交！');
      // 更新申请数量
      if (job) {
        await supabase.from('jobs').update({ apply_count: (job.apply_count || 0) + 1 }).eq('id', id!);
      }
    }
    setApplying(false);
  };

  const handleToggleFavorite = async () => {
    if (!user) { navigate('/login'); return; }
    if (favorited) {
      await supabase.from('favorites').delete().eq('job_id', id!).eq('user_id', user.id);
      setFavorited(false);
      toast.success('已取消收藏');
    } else {
      await supabase.from('favorites').insert({ job_id: id!, user_id: user.id });
      setFavorited(true);
      toast.success('已加入收藏');
    }
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return '薪资面议';
    if (min && max) return `${min / 1000}k-${max / 1000}k`;
    if (min) return `${min / 1000}k+`;
    return `最高${max! / 1000}k`;
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return 'text-primary';
    if (score >= 60) return 'text-chart-2';
    return 'text-muted-foreground';
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-4">
      {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 bg-muted" />)}
    </div>
  );

  if (!job) return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-12 text-center text-muted-foreground">
      职位不存在或已下线
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" />返回
      </Button>

      {/* 职位头部 */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground text-balance">{job.title}</h1>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                {job.location && <span className="flex items-center gap-1 whitespace-nowrap"><MapPin className="w-3.5 h-3.5" />{job.location}</span>}
                <span className="flex items-center gap-1 whitespace-nowrap"><DollarSign className="w-3.5 h-3.5" />{formatSalary(job.salary_min, job.salary_max)}</span>
                <span className="flex items-center gap-1 whitespace-nowrap"><Clock className="w-3.5 h-3.5" />{job.job_type}</span>
                {job.experience_required && <span className="flex items-center gap-1 whitespace-nowrap"><Briefcase className="w-3.5 h-3.5" />{job.experience_required}</span>}
                {job.education_required && <span className="flex items-center gap-1 whitespace-nowrap"><BookOpen className="w-3.5 h-3.5" />{job.education_required}</span>}
              </div>
            </div>
            <Badge variant="outline" className="shrink-0">{job.industry || '通用'}</Badge>
          </div>

          {/* 匹配度 */}
          <div className="p-3 bg-primary/5 rounded-md border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary" />AI匹配度分析
              </span>
              <span className={`text-lg font-bold ${getMatchColor(matchScore)}`}>{matchScore}%</span>
            </div>
            <Progress value={matchScore} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2 text-pretty">
              {matchScore >= 80 ? '您的技能与此岗位高度匹配，建议立即申请' :
               matchScore >= 60 ? '您与此岗位较为匹配，部分技能需加强' :
               '您与此岗位匹配度一般，建议完善相关技能后申请'}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <Button
              className="flex-1 h-9"
              onClick={handleApply}
              disabled={applying || applied}
            >
              {applied ? (
                <><CheckCircle className="w-4 h-4 mr-2" />已申请</>
              ) : applying ? '提交中...' : '一键申请'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={handleToggleFavorite}
            >
              {favorited ? <Star className="w-4 h-4 fill-accent text-accent" /> : <StarOff className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 职位描述 */}
      {job.description && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">职位描述</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.description}</p>
          </CardContent>
        </Card>
      )}

      {/* 任职要求 */}
      {job.requirements && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">任职要求</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.requirements}</p>
          </CardContent>
        </Card>
      )}

      {/* 技能标签 */}
      {Array.isArray(job.skills_required) && job.skills_required.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">技能要求</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(job.skills_required as string[]).map((s: string) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
