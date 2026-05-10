import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Resume, CapabilityData, IndustryTemplate, TreeNode } from '@/types/types';
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
import { CapabilityTreeChart } from '@/components/charts/CapabilityTreeChart';
import { ResumeUploader } from '@/components/resume/ResumeUploader';
import {
  FileText, Plus, Trash2, Star, Upload, RefreshCw,
  Download, FileType, File, Sparkles, Loader2, BrainCircuit
} from 'lucide-react';
import { toast } from 'sonner';
import { createParser } from 'eventsource-parser';

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
  const [treeDataEditable, setTreeDataEditable] = useState<TreeNode>(DEFAULT_TREE);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newResumeTitle, setNewResumeTitle] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('tech');
  const [uploadingResumeId, setUploadingResumeId] = useState<string | null>(null);

  // AI 解析简历状态
  const [aiParsing, setAiParsing] = useState(false);
  const [aiParseProgress, setAiParseProgress] = useState('');
  const aiAbortRef = useRef<AbortController | null>(null);

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
      if (data.tree_data && Object.keys(data.tree_data).length > 0) {
        setTreeDataEditable(data.tree_data as TreeNode);
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
    const treeToSave = (treeDataEditable && Object.keys(treeDataEditable).length > 0)
      ? treeDataEditable
      : currentTemplate?.skill_tree ?? DEFAULT_TREE;

    if (capability) {
      await supabase.from('capability_data')
        .update({ radar_data: radarObj, tree_data: treeToSave, industry: selectedIndustry })
        .eq('id', capability.id);
    } else {
      await supabase.from('capability_data').insert({
        profile_id: user!.id,
        industry: selectedIndustry,
        radar_data: radarObj,
        tree_data: treeToSave,
        skills: radarData.map(r => ({ name: r.subject, level: r.value })),
      });
    }
    toast.success('能力数据已保存');
    fetchCapabilityData();
  };

  // AI 解析简历 → 生成能力图谱
  const handleAiParseResume = async () => {
    // 找主简历或第一份有内容的简历
    const targetResume = resumes.find(r => r.is_primary) ?? resumes[0];
    if (!targetResume) {
      toast.info('请先创建简历再使用 AI 解析');
      return;
    }

    // 构建简历文本（从结构化字段拼接）
    let resumeText = '';
    if (targetResume.parsed_content) {
      resumeText = targetResume.parsed_content;
    } else {
      // 从结构化数据生成文本
      const parts: string[] = [`简历标题：${targetResume.title}`];
      if (targetResume.summary) parts.push(`个人简介：${targetResume.summary}`);
      if (Array.isArray(targetResume.education) && targetResume.education.length > 0) {
        parts.push('教育经历：' + targetResume.education.map(e =>
          `${e.school} ${e.degree} ${e.major} (${e.start_year}-${e.end_year})`
        ).join('；'));
      }
      if (Array.isArray(targetResume.experience) && targetResume.experience.length > 0) {
        parts.push('工作经历：' + targetResume.experience.map(e =>
          `${e.company} ${e.title}：${e.description} (${e.start_date}-${e.end_date})`
        ).join('；'));
      }
      if (Array.isArray(targetResume.skills) && targetResume.skills.length > 0) {
        parts.push('技能：' + targetResume.skills.map(s => `${s.name}(${s.level})`).join('、'));
      }
      resumeText = parts.join('\n');
    }

    if (!resumeText.trim() || resumeText === `简历标题：${targetResume.title}`) {
      toast.info('简历内容暂为空，请先填写工作经历、技能或上传文件后再 AI 解析');
      return;
    }

    setAiParsing(true);
    setAiParseProgress('');
    aiAbortRef.current?.abort();
    aiAbortRef.current = new AbortController();

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    let fullText = '';
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/parse-resume-capability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ resume_text: resumeText, resume_title: targetResume.title }),
        signal: aiAbortRef.current.signal,
      });

      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      const parser = createParser({
        onEvent: (event) => {
          if (event.data === '[DONE]') return;
          try {
            const parsed = JSON.parse(event.data);
            const chunk = parsed.choices?.[0]?.delta?.content ?? '';
            if (chunk) {
              fullText += chunk;
              setAiParseProgress(fullText);
            }
          } catch { /* skip */ }
        },
      });

      const read = async (): Promise<void> => {
        const { done, value } = await reader.read();
        if (done) return;
        parser.feed(decoder.decode(value, { stream: true }));
        return read();
      };
      await read();

      // 提取 JSON
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI 返回内容格式错误');
      const parsed = JSON.parse(jsonMatch[0]);

      // 更新雷达图数据
      if (parsed.radar_data && typeof parsed.radar_data === 'object') {
        const newRadar = Object.entries(parsed.radar_data as Record<string, number>)
          .map(([subject, value]) => ({ subject, value: Math.max(0, Math.min(100, Math.round(value))) }));
        if (newRadar.length > 0) setRadarData(newRadar);
      }

      // 更新能力树数据
      if (parsed.tree_data && typeof parsed.tree_data === 'object') {
        setTreeDataEditable(parsed.tree_data as TreeNode);
      }

      // 更新行业
      if (parsed.industry) setSelectedIndustry(parsed.industry);

      setAiParseProgress('');
      toast.success('AI 能力图谱已生成，点击"保存图谱"持久化数据');
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        console.error('AI 解析失败:', err);
        toast.error('AI 解析失败，请稍后重试');
      }
      setAiParseProgress('');
    } finally {
      setAiParsing(false);
    }
  };

  const currentTemplate = templates.find(t => t.industry === selectedIndustry);
  const treeData = (treeDataEditable && Object.keys(treeDataEditable).length > 0)
    ? treeDataEditable
    : (capability?.tree_data && Object.keys(capability.tree_data).length > 0)
      ? capability.tree_data
      : currentTemplate?.skill_tree ?? DEFAULT_TREE;

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
            <CardTitle className="text-base flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-primary" />
              能力图谱
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedIndustry}
                onChange={e => setSelectedIndustry(e.target.value)}
                className="text-sm border border-border rounded-md px-2 py-1 bg-background text-foreground"
              >
                {templates.map(t => (
                  <option key={t.industry} value={t.industry}>{t.label}</option>
                ))}
              </select>
              {/* AI 解析按钮 */}
              <Button
                size="sm"
                variant="default"
                disabled={aiParsing || resumes.length === 0}
                onClick={handleAiParseResume}
                className="h-8"
              >
                {aiParsing
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />解析中…</>
                  : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />AI 解析简历</>
                }
              </Button>
              <Button size="sm" variant="outline" onClick={handleSaveCapability} className="h-8">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />保存图谱
              </Button>
            </div>
          </div>

          {/* AI 解析进度 */}
          {aiParsing && (
            <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-md">
              <div className="flex items-center gap-2 mb-1.5">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                <span className="text-xs font-medium text-primary">AI 正在解析简历并生成能力图谱…</span>
              </div>
              {aiParseProgress && (
                <p className="text-xs text-muted-foreground line-clamp-3 font-mono leading-relaxed">
                  {aiParseProgress.slice(-200)}
                </p>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="radar">
            <TabsList className="mb-4">
              <TabsTrigger value="radar">雷达图（可拖拽）</TabsTrigger>
              <TabsTrigger value="tree">能力树（可拖拽）</TabsTrigger>
              <TabsTrigger value="overview">全览</TabsTrigger>
            </TabsList>

            {/* 雷达图 Tab — 直接可拖拽 */}
            <TabsContent value="radar">
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-primary shrink-0" />
                拖拽雷达图上的蓝色圆点即可直接调整能力值，完成后点击"保存图谱"
              </p>
              <CapabilityRadarChart
                data={radarData}
                height={300}
                editable
                onChange={setRadarData}
              />
              {/* 滑块辅助 */}
              <div className="mt-5 space-y-3 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">也可通过滑块精确调整：</p>
                {radarData.map((item, idx) => (
                  <div key={item.subject} className="flex items-center gap-3">
                    <Label className="text-xs font-normal text-muted-foreground w-20 shrink-0 truncate">
                      {item.subject}
                    </Label>
                    <Slider
                      value={[item.value]}
                      onValueChange={([v]) => {
                        const updated = [...radarData];
                        updated[idx] = { ...item, value: v };
                        setRadarData(updated);
                      }}
                      min={0} max={100} step={1}
                      className="flex-1"
                    />
                    <span className="text-xs font-medium text-primary w-7 text-right tabular-nums shrink-0">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* 能力树 Tab — 叶节点可拖拽 */}
            <TabsContent value="tree">
              <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-primary shrink-0" />
                拖拽叶节点的进度条可调整技能熟练度，完成后点击"保存图谱"
              </p>
              <CapabilityTreeChart
                data={treeData}
                editable
                onChange={updated => setTreeDataEditable(updated)}
              />
            </TabsContent>

            {/* 全览 Tab — 只读 SVG 树 */}
            <TabsContent value="overview">
              <div className="rounded-lg border border-border overflow-hidden">
                <CapabilityTreeImage data={treeData} />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-pretty">
                节点颜色深浅代表能力层级，叶节点底部进度条表示掌握程度（0–100）
              </p>
              {/* 综合分 */}
              <div className="mt-4 p-4 bg-primary/5 rounded-md border border-primary/20 flex items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">综合能力均分</p>
                  <p className="text-2xl font-bold text-primary mt-0.5">
                    {Math.round(radarData.reduce((s, i) => s + i.value, 0) / Math.max(radarData.length, 1))}
                  </p>
                </div>
                <div className="flex-1 flex flex-wrap gap-2">
                  {radarData.map(d => (
                    <span key={d.subject} className="text-xs bg-background border border-border rounded-md px-2 py-0.5">
                      {d.subject} <span className="font-semibold text-primary">{d.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
