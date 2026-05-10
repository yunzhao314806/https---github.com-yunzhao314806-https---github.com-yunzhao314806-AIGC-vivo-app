import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { sendStreamRequest } from '@/lib/sse';
import { CapabilityRadarChart } from '@/components/charts/CapabilityRadarChart';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BrainCircuit, Send, StopCircle, RefreshCw, ChevronRight,
  Award, TrendingUp, MessageSquare, Loader2, CheckCircle2,
  ArrowRight, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  MockInterview, MockInterviewMessage, MockInterviewReport, RadarItem,
} from '@/types/types';

// ── 配置常量 ────────────────────────────────────────────────────
const DIRECTIONS = ['前端开发', '后端开发', '算法与数据结构', '系统设计', '全栈开发', 'AI/机器学习', '移动开发', 'DevOps/云原生'];
const DIFFICULTIES = [
  { value: 'junior', label: '初级', desc: '基础概念与常见实践' },
  { value: 'intermediate', label: '中级', desc: '深度原理与项目经验' },
  { value: 'senior', label: '高级', desc: '架构设计与复杂场景' },
];
const TOTAL_QUESTIONS = 5;
const MAX_FOLLOW_UP = 2;

type Stage = 'config' | 'interview' | 'report';

interface DisplayMessage {
  role: 'interviewer' | 'user';
  content: string;
  streaming?: boolean;
}

// ── 工具 ────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 80) return 'text-chart-2';
  if (score >= 65) return 'text-primary';
  if (score >= 50) return 'text-chart-4';
  return 'text-muted-foreground';
}
function scoreBarColor(score: number) {
  if (score >= 80) return 'bg-chart-2';
  if (score >= 65) return 'bg-primary';
  if (score >= 50) return 'bg-chart-4';
  return 'bg-muted-foreground';
}

// ── 主组件 ───────────────────────────────────────────────────────
export default function MockInterviewPage() {
  const { user } = useAuth();

  // 阶段状态
  const [stage, setStage] = useState<Stage>('config');

  // 配置状态
  const [direction, setDirection] = useState(DIRECTIONS[0]);
  const [difficulty, setDifficulty] = useState<'junior' | 'intermediate' | 'senior'>('intermediate');

  // 面试状态
  const [interview, setInterview] = useState<MockInterview | null>(null);
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [llmMessages, setLlmMessages] = useState<{ role: 'user' | 'assistant' | 'system'; content: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [followUpRound, setFollowUpRound] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 报告状态
  const [report, setReport] = useState<MockInterviewReport | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [syncingToProfile, setSyncingToProfile] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages]);

  // ── 开始面试 ────────────────────────────────────────────────
  const handleStartInterview = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('mock_interviews')
        .insert({
          profile_id: user.id,
          direction,
          difficulty,
          total_questions: TOTAL_QUESTIONS,
          current_question: 0,
          status: 'active',
        })
        .select()
        .maybeSingle();
      if (error || !data) { toast.error('创建面试失败'); return; }
      setInterview(data as MockInterview);
      setDisplayMessages([]);
      setLlmMessages([]);
      setQuestionIndex(0);
      setFollowUpRound(0);
      setStage('interview');
      // 自动触发第一题
      setTimeout(() => askQuestion(data as MockInterview, 0, 0, []), 200);
    } catch {
      toast.error('创建面试失败，请重试');
    }
  };

  // ── 请求 AI 回复（SSE） ─────────────────────────────────────
  const streamAIReply = useCallback(async (
    iv: MockInterview,
    msgs: { role: 'user' | 'assistant' | 'system'; content: string }[],
    qIdx: number,
    fuRound: number,
    isFinish = false,
  ) => {
    setIsStreaming(true);
    let accumulated = '';

    // 先插入一个 streaming 气泡
    setDisplayMessages(prev => [...prev, { role: 'interviewer', content: '', streaming: true }]);

    abortRef.current = new AbortController();

    await sendStreamRequest({
      functionUrl: `${supabaseUrl}/functions/v1/mock-interview-chat`,
      requestBody: {
        messages: msgs,
        direction: iv.direction,
        difficulty: iv.difficulty,
        questionIndex: qIdx,
        totalQuestions: iv.total_questions,
        followUpRound: fuRound,
        isFinish,
      },
      supabaseAnonKey,
      onData: (data) => {
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const chunk = parsed.choices?.[0]?.delta?.content ?? '';
          accumulated += chunk;
          setDisplayMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { role: 'interviewer', content: accumulated, streaming: true };
            return next;
          });
        } catch { /* skip */ }
      },
      onComplete: async () => {
        setIsStreaming(false);
        // 结束 streaming 状态
        setDisplayMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'interviewer', content: accumulated, streaming: false };
          return next;
        });
        // 更新 llmMessages
        const newLlm = [...msgs, { role: 'assistant' as const, content: accumulated }];
        setLlmMessages(newLlm);
        // 保存消息到 DB
        await supabase.from('mock_interview_messages').insert({
          interview_id: iv.id,
          role: 'interviewer',
          content: accumulated,
          question_index: qIdx,
          follow_up_round: fuRound,
        });
        // 如果是结束消息，生成报告
        if (isFinish) {
          setTimeout(() => generateReport(iv, newLlm), 500);
        }
      },
      onError: () => {
        setIsStreaming(false);
        setDisplayMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'interviewer', content: '（连接中断，请重试）', streaming: false };
          return next;
        });
        toast.error('AI 响应失败，请重试');
      },
      signal: abortRef.current.signal,
    });
  }, [supabaseUrl, supabaseAnonKey]);

  // ── 出题 ────────────────────────────────────────────────────
  const askQuestion = useCallback((
    iv: MockInterview,
    qIdx: number,
    fuRound: number,
    msgs: typeof llmMessages,
  ) => {
    streamAIReply(iv, msgs, qIdx, fuRound, false);
  }, [streamAIReply]);

  // ── 用户发送回答 ────────────────────────────────────────────
  const handleSendAnswer = async () => {
    if (!userInput.trim() || isStreaming || !interview) return;
    const text = userInput.trim();
    setUserInput('');

    // 展示用户气泡
    setDisplayMessages(prev => [...prev, { role: 'user', content: text }]);

    // 保存到 DB
    await supabase.from('mock_interview_messages').insert({
      interview_id: interview.id,
      role: 'user',
      content: text,
      question_index: questionIndex,
      follow_up_round: followUpRound,
    });

    const newLlm: typeof llmMessages = [...llmMessages, { role: 'user', content: text }];
    setLlmMessages(newLlm);

    // 判断下一步：追问 or 下一题 or 结束
    if (followUpRound < MAX_FOLLOW_UP) {
      // 继续追问
      const nextRound = followUpRound + 1;
      setFollowUpRound(nextRound);
      await streamAIReply(interview, newLlm, questionIndex, nextRound, false);
    } else {
      // 进入下一题
      const nextQ = questionIndex + 1;
      if (nextQ < interview.total_questions) {
        setQuestionIndex(nextQ);
        setFollowUpRound(0);
        await supabase.from('mock_interviews').update({ current_question: nextQ }).eq('id', interview.id);
        await streamAIReply(interview, newLlm, nextQ, 0, false);
      } else {
        // 所有题目完成，发送结束语
        await supabase.from('mock_interviews').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', interview.id);
        await streamAIReply(interview, newLlm, nextQ, 0, true);
      }
    }
    textareaRef.current?.focus();
  };

  // ── 主动结束 ────────────────────────────────────────────────
  const handleEndInterview = async () => {
    if (!interview) return;
    abortRef.current?.abort();
    await supabase.from('mock_interviews').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', interview.id);
    generateReport(interview, llmMessages);
  };

  interface ReportPayload {
    overall_score: number;
    radar_data: RadarItem[];
    question_reviews: Array<{ question: string; pros: string; cons: string; score: number }>;
    suggestions: Array<{ dimension: string; advice: string; resources: string }>;
    summary: string;
  }

  // ── 生成评估报告 ────────────────────────────────────────────
  const generateReport = async (
    iv: MockInterview,
    msgs: typeof llmMessages,
  ) => {
    setIsGeneratingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ success: boolean; report: ReportPayload }>('mock-interview-report', {
        body: {
          messages: msgs,
          direction: iv.direction,
          difficulty: iv.difficulty,
        },
      });

      if (error || !data?.report) {
        const errMsg = await error?.context?.text();
        throw new Error(errMsg || '报告生成失败');
      }

      const r = data.report;

      // 保存报告到 DB
      const { data: savedReport } = await supabase
        .from('mock_interview_reports')
        .insert({
          interview_id: iv.id,
          profile_id: user!.id,
          overall_score: r.overall_score,
          radar_data: r.radar_data,
          question_reviews: r.question_reviews,
          suggestions: r.suggestions,
          summary: r.summary,
        })
        .select()
        .maybeSingle();

      setReport(savedReport as MockInterviewReport ?? { ...r, id: '', interview_id: iv.id, profile_id: user!.id, created_at: new Date().toISOString() });
      setStage('report');
    } catch (e) {
      toast.error('评估报告生成失败：' + (e as Error).message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // ── 同步雷达图到能力图谱 ─────────────────────────────────────
  const handleSyncToProfile = async () => {
    if (!report || !user) return;
    setSyncingToProfile(true);
    try {
      const radarObj: Record<string, number> = {};
      report.radar_data.forEach((r: RadarItem) => { radarObj[r.subject] = r.value; });
      const { data: existing } = await supabase
        .from('capability_data')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();
      if (existing?.id) {
        await supabase.from('capability_data').update({ radar_data: radarObj }).eq('id', existing.id);
      } else {
        await supabase.from('capability_data').insert({ profile_id: user.id, radar_data: radarObj, tree_data: {}, industry: 'tech', skills: [] });
      }
      toast.success('能力图谱已同步至简历管理页');
    } catch {
      toast.error('同步失败，请重试');
    } finally {
      setSyncingToProfile(false);
    }
  };

  // ── 重新面试 ────────────────────────────────────────────────
  const handleRestart = () => {
    abortRef.current?.abort();
    setStage('config');
    setInterview(null);
    setDisplayMessages([]);
    setLlmMessages([]);
    setReport(null);
    setQuestionIndex(0);
    setFollowUpRound(0);
  };

  // ── 键盘发送 ────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAnswer();
    }
  };

  // ── 进度计算 ────────────────────────────────────────────────
  const progress = interview
    ? Math.round(((questionIndex + (followUpRound / (MAX_FOLLOW_UP + 1))) / interview.total_questions) * 100)
    : 0;

  // ════════════════════════════════════════════════════════════
  // 渲染：配置阶段
  // ════════════════════════════════════════════════════════════
  if (stage === 'config') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-2">
            <BrainCircuit className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground text-balance">AI 模拟面试</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            AI 面试官结合思维链技术追问技术细节，面试结束后生成含雷达图的评估报告
          </p>
        </div>

        {/* 选择方向 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">选择面试方向</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {DIRECTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={`rounded-md px-3 py-2 text-sm font-medium border transition-colors text-left ${
                    direction === d
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-foreground hover:border-primary/40'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 选择难度 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">选择难度</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value as typeof difficulty)}
                  className={`rounded-lg p-3 border text-left transition-colors ${
                    difficulty === d.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/40'
                  }`}
                >
                  <p className={`text-sm font-semibold ${difficulty === d.value ? 'text-primary' : 'text-foreground'}`}>
                    {d.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 text-pretty">{d.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 面试说明 */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p className="flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-0.5 text-primary shrink-0" />共 {TOTAL_QUESTIONS} 道题，每题追问最多 {MAX_FOLLOW_UP} 轮</p>
              <p className="flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-0.5 text-primary shrink-0" />AI 面试官结合思维链挖掘技术细节与底层原理</p>
              <p className="flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-0.5 text-primary shrink-0" />面试结束后生成包含雷达图和改进建议的评估报告</p>
              <p className="flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-0.5 text-primary shrink-0" />评估报告可一键同步到您的能力图谱</p>
            </div>
          </CardContent>
        </Card>

        <Button className="w-full h-11" onClick={handleStartInterview}>
          开始面试
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // 渲染：面试中
  // ════════════════════════════════════════════════════════════
  if (stage === 'interview') {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto px-4">
        {/* 顶部进度条 */}
        <div className="py-3 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-primary" />
              {interview?.direction} · {DIFFICULTIES.find(d => d.value === interview?.difficulty)?.label}
            </span>
            <span>第 {questionIndex + 1} / {TOTAL_QUESTIONS} 题{followUpRound > 0 ? `（追问 ${followUpRound}/${MAX_FOLLOW_UP}）` : ''}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* 对话区 */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2"
        >
          {displayMessages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* 头像 */}
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                msg.role === 'interviewer' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              }`}>
                {msg.role === 'interviewer' ? 'AI' : '我'}
              </div>
              {/* 气泡 */}
              <div className={`max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'interviewer'
                  ? 'bg-muted text-foreground'
                  : 'bg-primary text-primary-foreground'
              }`}>
                {msg.content || (msg.streaming ? (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>思考中…</span>
                  </span>
                ) : '')}
                {msg.streaming && msg.content && (
                  <span className="inline-block w-1 h-3.5 bg-current ml-0.5 animate-pulse rounded-sm" />
                )}
              </div>
            </div>
          ))}

          {isGeneratingReport && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              正在生成评估报告，请稍候…
            </div>
          )}
        </div>

        {/* 输入区 */}
        <div className="shrink-0 py-3 border-t border-border space-y-2">
          <Textarea
            ref={textareaRef}
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的回答，Enter 发送，Shift+Enter 换行"
            rows={3}
            disabled={isStreaming || isGeneratingReport}
            className="resize-none text-sm px-3"
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSendAnswer}
              disabled={!userInput.trim() || isStreaming || isGeneratingReport}
              className="flex-1 h-9"
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
              发送回答
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={handleEndInterview}
              disabled={isGeneratingReport}
              title="结束面试并生成报告"
            >
              <StopCircle className="w-4 h-4 mr-1" />
              结束
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // 渲染：评估报告
  // ════════════════════════════════════════════════════════════
  if (!report) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            面试评估报告
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {interview?.direction} · {DIFFICULTIES.find(d => d.value === interview?.difficulty)?.label}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={handleRestart}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            重新面试
          </Button>
          <Button
            size="sm"
            className="h-8"
            onClick={handleSyncToProfile}
            disabled={syncingToProfile}
          >
            {syncingToProfile
              ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
            同步至能力图谱
          </Button>
        </div>
      </div>

      {/* 综合评分 */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-6">
            <div className="text-center shrink-0">
              <p className={`text-5xl font-bold tabular-nums ${scoreColor(report.overall_score)}`}>
                {report.overall_score}
              </p>
              <p className="text-xs text-muted-foreground mt-1">综合得分</p>
            </div>
            <div className="flex-1 min-w-0">
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${scoreBarColor(report.overall_score)}`}
                  style={{ width: `${report.overall_score}%` }}
                />
              </div>
              {report.summary && (
                <p className="text-sm text-muted-foreground leading-relaxed text-pretty">{report.summary}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 雷达图 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            能力维度雷达图
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CapabilityRadarChart data={report.radar_data} height={280} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
            {report.radar_data.map((r: RadarItem) => (
              <div key={r.subject} className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2">
                <span className="text-xs text-muted-foreground truncate flex-1 min-w-0 mr-2">{r.subject}</span>
                <span className={`text-xs font-semibold tabular-nums shrink-0 ${scoreColor(r.value)}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 题目点评 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            题目详细点评
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.question_reviews.map((qr, i) => (
            <div key={i} className="border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-foreground flex-1 min-w-0">
                  <span className="text-primary mr-1.5">Q{i + 1}.</span>
                  {qr.question}
                </p>
                <Badge variant="outline" className={`shrink-0 text-xs ${scoreColor(qr.score)}`}>
                  {qr.score} 分
                </Badge>
              </div>
              {qr.pros && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-chart-2 shrink-0 font-medium mt-0.5">✓ 优点</span>
                  <span className="text-muted-foreground text-pretty">{qr.pros}</span>
                </div>
              )}
              {qr.cons && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-chart-4 shrink-0 font-medium mt-0.5">△ 不足</span>
                  <span className="text-muted-foreground text-pretty">{qr.cons}</span>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 改进建议 */}
      {report.suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              改进建议
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.suggestions.map((s, i) => (
              <div key={i} className="bg-primary/5 border border-primary/15 rounded-lg p-4 space-y-1.5">
                <p className="text-sm font-semibold text-primary">{s.dimension}</p>
                <p className="text-xs text-foreground leading-relaxed text-pretty">{s.advice}</p>
                {s.resources && (
                  <p className="text-xs text-muted-foreground">
                    📚 参考资源：{s.resources}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
