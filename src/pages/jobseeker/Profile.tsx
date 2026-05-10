import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Profile, Application } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User, Briefcase, Star, Settings, Edit2, Save, MapPin, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const APPLICATION_STATUS_MAP = {
  pending: { label: '待审核', variant: 'secondary' as const },
  reviewing: { label: '审核中', variant: 'default' as const },
  interview: { label: '面试', variant: 'default' as const },
  offer: { label: '录用', variant: 'default' as const },
  rejected: { label: '未通过', variant: 'destructive' as const },
  withdrawn: { label: '已撤回', variant: 'secondary' as const },
};

export default function JobseekerProfile() {
  const { user, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [saving, setSaving] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [favorites, setFavorites] = useState<{ id: string; job_id: string; created_at: string; job?: { title: string; location?: string } }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setBio(user.bio || '');
      setLocation(user.location || '');
      fetchApplications();
      fetchFavorites();
    }
  }, [user]);

  const fetchApplications = async () => {
    const { data } = await supabase
      .from('applications')
      .select('*, job:jobs(title, location, salary_min, salary_max)')
      .eq('applicant_id', user!.id)
      .order('applied_at', { ascending: false })
      .limit(20);
    setApplications(Array.isArray(data) ? data as Application[] : []);
    setLoading(false);
  };

  const fetchFavorites = async () => {
    const { data } = await supabase
      .from('favorites')
      .select('*, job:jobs(title, location)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setFavorites(Array.isArray(data) ? data as typeof favorites : []);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, bio, location })
      .eq('id', user!.id);
    if (error) {
      toast.error('保存失败');
    } else {
      toast.success('信息已更新');
      setEditing(false);
      refreshProfile();
    }
    setSaving(false);
  };

  const handleRemoveFavorite = async (id: string) => {
    await supabase.from('favorites').delete().eq('id', id);
    setFavorites(prev => prev.filter(f => f.id !== id));
    toast.success('已取消收藏');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground text-balance">个人中心</h1>

      <Tabs defaultValue="info">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="info"><User className="w-3.5 h-3.5 mr-1.5" />基本信息</TabsTrigger>
          <TabsTrigger value="applications"><Briefcase className="w-3.5 h-3.5 mr-1.5" />投递记录</TabsTrigger>
          <TabsTrigger value="favorites"><Star className="w-3.5 h-3.5 mr-1.5" />收藏职位</TabsTrigger>
        </TabsList>

        {/* 基本信息 */}
        <TabsContent value="info" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-4 mb-6">
                <Avatar className="w-16 h-16 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {(user?.display_name || user?.username || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-foreground truncate">{user?.display_name || user?.username}</h2>
                  <p className="text-sm text-muted-foreground">@{user?.username}</p>
                  <Badge variant="outline" className="mt-1 text-xs">求职者</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-9"
                  onClick={() => setEditing(v => !v)}
                >
                  {editing ? '取消' : <><Edit2 className="w-3.5 h-3.5 mr-1.5" />编辑</>}
                </Button>
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-normal">显示名称</Label>
                    <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="px-3" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-normal">所在城市</Label>
                    <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="例如：北京" className="px-3" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-normal">个人简介</Label>
                    <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="介绍一下你自己..." className="px-3 resize-none" rows={3} />
                  </div>
                  <Button onClick={handleSave} disabled={saving} className="h-9">
                    <Save className="w-3.5 h-3.5 mr-1.5" />{saving ? '保存中...' : '保存'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  {user?.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0" />{user.location}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 shrink-0" />
                    加入于 {new Date(user?.created_at || '').toLocaleDateString('zh-CN')}
                  </div>
                  {user?.bio && <p className="text-foreground text-pretty">{user.bio}</p>}
                  {!user?.bio && <p className="text-muted-foreground">暂无个人简介，点击编辑添加</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 投递记录 */}
        <TabsContent value="applications" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">投递记录</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 bg-muted" />)}</div>
              ) : applications.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">暂无投递记录</p>
              ) : (
                <div className="space-y-3">
                  {applications.map(app => {
                    const statusInfo = APPLICATION_STATUS_MAP[app.status] || APPLICATION_STATUS_MAP.pending;
                    const job = app.job as unknown as { title: string; location?: string } | undefined;
                    return (
                      <div key={app.id} className="flex items-center gap-3 p-3 rounded-md border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{job?.title || '职位已删除'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {job?.location} · 申请于 {new Date(app.applied_at).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {app.match_score && (
                            <span className="text-xs text-primary font-medium">{app.match_score}%</span>
                          )}
                          <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 收藏职位 */}
        <TabsContent value="favorites" className="mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">收藏的职位</CardTitle></CardHeader>
            <CardContent>
              {favorites.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">暂无收藏职位</p>
              ) : (
                <div className="space-y-3">
                  {favorites.map(fav => (
                    <div key={fav.id} className="flex items-center gap-3 p-3 rounded-md border border-border">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{fav.job?.title || '职位已删除'}</p>
                        {fav.job?.location && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{fav.job.location}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveFavorite(fav.id)}
                      >
                        取消收藏
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
