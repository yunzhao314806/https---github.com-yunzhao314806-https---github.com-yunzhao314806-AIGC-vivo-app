import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Resume, CapabilityData, IndustryTemplate } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { CapabilityRadarChart } from '@/components/charts/CapabilityRadarChart';
import { CapabilityTreeImage } from '@/components/charts/CapabilityTreeImage';
import { ResumeUploader } from '@/components/resume/ResumeUploader';
import {
  FileText, Plus, Trash2, Star, Upload, RefreshCw,
  Download, FileType, File
} from 'lucide-react';
import { toast } from 'sonner';

// 文件格式图标颜色映射
const FILE_TYPE_COLOR: Record<string, string> = {
  PDF: 'text-destructive',
  DOC: 'text-primary',
  DOCX: 'text-primary',
  CSV: 'text-chart-2',
  XLS: 'text-chart-2',
  XLSX: 'text-chart-2',
  TXT: 'text-muted-foreground',
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return '未知大小';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const DEFAULT_RADAR_DATA = [
  { subject: '编程技能', value: 75 },
  { subject: '系统设计', value: 60 },
  { subject: '数据分析', value: 70 },
  { subject: '项目管理', value: 55 },
  { subject: '沟通协作', value: 80 },
  { subject: '学习能力', value: 85 },
];

const DEFAULT_TREE = {
  name: '技术能力',
  children: [
    { name: '编程语言', children: [{ name: 'Python', value: 80 }, { name: 'Java', value: 65 }, { name: 'JavaScript', value: 75 }] },
    { name: '框架工具', children: [{ name: 'React', value: 70 }, { name: 'FastAPI', value: 60 }] },
    { name: '数据库', children: [{ name: 'MySQL', value: 72 }, { name: 'Redis', value: 55 }] },
  ]
};

export default function ResumeManagement() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [capability, setCapability] = useState<CapabilityData | null>(null);
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [radarData, setRadarData] = useState(DEFAULT_RADAR_DATA);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newResumeTitle, setNewResumeTitle] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('tech');
  // 当前正在上传文件的简历 ID
  const [uploadingResumeId, setUploadingResumeId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchResumes();
      fetchCapabilityData();
      fetchTemplates();
    }
  }, [user]);

  const fetchResumes = async () => {
    const { data } = await supabase
      .from('resumes')
      .select('*')
      .eq('profile_id', user!.id)
      .order('created_at', { ascending: false });
    setResumes(Array.isArray(data) ? data as Resume[] : []);
    setLoading(false);
  };

  const fetchCapabilityData = async () => {
    const { data } = await supabase
      .from('capability_data')
      .select('*')
      .eq('profile_id', user!.id)
      .maybeSingle();
    if (data) {
      setCapability(data as CapabilityData);
      const rd = data.radar_data as Record<string, number>;
      if (rd && Object.keys(rd).length > 0) {
        setRadarData(Object.entries(rd).map(([subject, value]) => ({ subject, value })));
      }
    }
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from('industry_templates').select('*').order('label');
    setTemplates(Array.isArray(data) ? data as IndustryTemplate[] : []);
  };

  const handleAddResume = async () => {
    if (!newResumeTitle.trim()) return;
    const { data, error } = await supabase
      .from('resumes')
      .insert({
        profile_id: user!.id,
        title: newResumeTitle,
        is_primary: resumes.length === 0,
      })
      .select()
      .maybeSingle();
    if (error) { toast.error('创建简历失败'); return; }
    toast.success('简历已创建，可立即上传文件');
    setAddDialogOpen(false);
    setNewResumeTitle('');
    // 创建后自动展开上传区
    if (data?.id) setUploadingResumeId(data.id);
    fetchResumes();
  };

  const handleDeleteResume = async (resume: Resume) => {
    // 若有附件先从 Storage 删除
    if (resume.file_url && resume.file_name) {
      const filePath = `${user!.id}/${resume.id}`;
      await supabase.storage.from('resumes').remove([filePath]);
    }
    const { error } = await supabase.from('resumes').delete().eq('id', resume.id);
    if (error) { toast.error('删除失败'); return; }
    toast.success('简历已删除');
    if (uploadingResumeId === resume.id) setUploadingResumeId(null);
    fetchResumes();
  };

  const handleSetPrimary = async (id: string) => {
    await supabase.from('resumes').update({ is_primary: false }).eq('profile_id', user!.id);
    await supabase.from('resumes').update({ is_primary: true }).eq('id', id);
    fetchResumes();
    toast.success('已设为主简历');
  };

  // 上传完成回调 —— 更新数据库中的文件字段
  const handleUploadComplete = async (
    resumeId: string,
    fileUrl: string,
    fileName: string,
    fileSize: number,
    fileType: string,
  ) => {
    const { error } = await supabase
      .from('resumes')
      .update({
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        uploaded_at: new Date().toISOString(),
      })
      .eq('id', resumeId);
    if (error) { toast.error('文件信息保存失败'); return; }
    setUploadingResumeId(null);
    fetchResumes();
  };

  const handleDownload = async (resume: Resume) => {
    if (!resume.file_url) return;
    try {
      const link = document.createElement('a');
      link.href = resume.file_url;
      link.download = resume.file_name || '简历文件';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error('下载失败，请重试');
    }
  };

  const handleSaveCapability = async () => {
    const radarObj: Record<string, number> = {};
    radarData.forEach(item => { radarObj[item.subject] = item.value; });

    const currentTemplate = templates.find(t => t.industry === selectedIndustry);
    const treeData = currentTemplate ? currentTemplate.skill_tree : DEFAULT_TREE;

    if (capability) {
      await supabase.from('capability_data')
        .update({ radar_data: radarObj, tree_data: treeData, industry: selectedIndustry })
        .eq('id', capability.id);
    } else {
      await supabase.from('capability_data').insert({
        profile_id: user!.id,
        industry: selectedIndustry,
        radar_data: radarObj,
        tree_data: treeData,
        skills: radarData.map(r => ({ name: r.subject, level: r.value })),
      });
    }
    toast.success('能力数据已保存');
    fetchCapabilityData();
  };

  const currentTemplate = templates.find(t => t.industry === selectedIndustry);
  const treeData = (capability?.tree_data && Object.keys(capability.tree_data).length > 0)
    ? capability.tree_data
    : currentTemplate?.skill_tree || DEFAULT_TREE;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-foreground text-balance">简历管理</h1>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />新建简历
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <DialogHeader>
              <DialogTitle>新建简历</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-sm font-normal">简历名称</Label>
                <Input
                  placeholder="例如：前端开发岗位简历"
                  value={newResumeTitle}
                  onChange={e => setNewResumeTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddResume()}
                  className="px-3"
                />
              </div>
              <Button onClick={handleAddResume} className="w-full h-9">创建并上传文件</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 简历列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            我的简历
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 bg-muted" />)}
            </div>
          ) : resumes.length === 0 ? (
            <div className="py-10 text-center">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">暂无简历，点击"新建简历"开始上传</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resumes.map(resume => (
                <div key={resume.id} className="rounded-md border border-border overflow-hidden">
                  {/* 简历行 */}
                  <div className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                    {/* 文件格式图标 */}
                    <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                      {resume.file_type ? (
                        <span className={`text-[10px] font-bold ${FILE_TYPE_COLOR[resume.file_type] ?? 'text-muted-foreground'}`}>
                          {resume.file_type}
                        </span>
                      ) : (
                        <File className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* 信息区 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground truncate text-sm">{resume.title}</span>
                        {resume.is_primary && (
                          <Badge className="text-xs bg-primary/10 text-primary border-primary/20">主简历</Badge>
                        )}
                        {resume.file_type && (
                          <Badge variant="outline" className="text-xs">{resume.file_type}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {resume.file_name ? (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {resume.file_name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">未上传文件</span>
                        )}
                        {resume.file_size && (
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(resume.file_size)}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(resume.updated_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>

                    {/* 操作区 */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* 上传/替换文件 */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title={resume.file_url ? '替换文件' : '上传文件'}
                        onClick={() => setUploadingResumeId(
                          uploadingResumeId === resume.id ? null : resume.id
                        )}
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                      {/* 下载 */}
                      {resume.file_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="下载文件"
                          onClick={() => handleDownload(resume)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      {/* 设为主简历 */}
                      {!resume.is_primary && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="设为主简历"
                          onClick={() => handleSetPrimary(resume.id)}
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      {/* 删除 */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除简历</AlertDialogTitle>
                            <AlertDialogDescription>
                              将同时删除简历记录及已上传的文件（如有），此操作不可恢复。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDeleteResume(resume)}
                            >
                              确认删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* 展开的上传区域 */}
                  {uploadingResumeId === resume.id && (
                    <div className="border-t border-border bg-muted/20 p-4">
                      <p className="text-xs text-muted-foreground mb-3">
                        {resume.file_url ? '替换已有文件（原文件将被覆盖）' : '上传简历文件'}
                      </p>
                      <ResumeUploader
                        resumeId={resume.id}
                        onUploadComplete={(url, name, size, type) =>
                          handleUploadComplete(resume.id, url, name, size, type)
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 文件格式说明 */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileType className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">支持的文件格式</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  { type: 'PDF', color: 'text-destructive' },
                  { type: 'DOCX', color: 'text-primary' },
                  { type: 'DOC', color: 'text-primary' },
                  { type: 'CSV', color: 'text-chart-2' },
                  { type: 'XLSX', color: 'text-chart-2' },
                  { type: 'XLS', color: 'text-chart-2' },
                  { type: 'TXT', color: 'text-muted-foreground' },
                ].map(({ type, color }) => (
                  <Badge key={type} variant="secondary" className={`text-xs font-mono ${color}`}>
                    {type}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">单个文件最大 10MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 能力图谱 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">能力图谱</CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={selectedIndustry}
                onChange={e => setSelectedIndustry(e.target.value)}
                className="text-sm border border-border rounded-md px-2 py-1 bg-background text-foreground"
              >
                {templates.map(t => (
                  <option key={t.industry} value={t.industry}>{t.label}</option>
                ))}
              </select>
              <Button size="sm" variant="outline" onClick={handleSaveCapability}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />保存
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="radar">
            <TabsList className="mb-4">
              <TabsTrigger value="radar">雷达图</TabsTrigger>
              <TabsTrigger value="tree">能力树</TabsTrigger>
              <TabsTrigger value="simulate">能力模拟</TabsTrigger>
            </TabsList>

            <TabsContent value="radar">
              <CapabilityRadarChart data={radarData} height={300} />
            </TabsContent>

            <TabsContent value="tree">
              <div className="rounded-lg border border-border overflow-hidden">
                <CapabilityTreeImage data={treeData} />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-pretty">
                节点颜色深浅代表能力层级，叶节点底部进度条表示掌握程度（0–100）
              </p>
            </TabsContent>

            <TabsContent value="simulate">
              <p className="text-sm text-muted-foreground mb-4 text-pretty">
                拖动滑块模拟能力值变化，查看对岗位匹配度的影响
              </p>
              <div className="space-y-5">
                {radarData.map((item, idx) => (
                  <div key={item.subject} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">{item.subject}</Label>
                      <span className="text-sm font-medium text-primary w-8 text-right">{item.value}</span>
                    </div>
                    <Slider
                      value={[item.value]}
                      onValueChange={([v]) => {
                        const updated = [...radarData];
                        updated[idx] = { ...item, value: v };
                        setRadarData(updated);
                      }}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-primary/5 rounded-md border border-primary/20">
                <p className="text-sm font-medium text-primary">综合匹配度预测</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {Math.round(radarData.reduce((s, i) => s + i.value, 0) / radarData.length)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">基于当前能力值估算</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
