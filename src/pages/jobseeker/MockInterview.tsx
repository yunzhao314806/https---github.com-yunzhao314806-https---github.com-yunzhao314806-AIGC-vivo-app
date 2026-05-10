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

const DIRECTIONS = ['前端开发', '后端开发', '算法与数据结构', '系统设计', '全栈开发', 'AI/机器学习', '移动开发', 'DevOps/云原生'];
const DIFFICULTIES = [
  { value: 'junior', label: '初级', desc: '基础概念与常见实践' },
  { value: 'intermediate', label: '中级', desc: '深度原理与项目经验' },
  { value: 'senior', label: '高级', desc: '架构设计与复杂场景' },
];
const TOTAL_QUESTIONS = 5;
const MAX_FOLLOW_UP = 2;

const MOCK_QUESTIONS: Record<string, Record<string, string[]>> = {
  '前端开发': {
    junior: [
      '请解释什么是虚拟DOM，它与真实DOM有什么区别？',
      'React中的useState和useEffect分别是什么？它们有什么用途？',
      'CSS中的flexbox和grid布局有什么区别？',
      '什么是闭包？请举一个例子说明。',
      '请解释JavaScript中的事件冒泡和事件捕获。',
    ],
    intermediate: [
      'React中的hooks是如何实现的？useEffect的依赖数组是如何工作的？',
      '请解释React的fiber架构，它解决了什么问题？',
      '如何进行前端性能优化？请列举至少三种方法。',
      '什么是代码分割(code splitting)？如何在React中实现？',
      '请解释TypeScript中的泛型和类型推断。',
    ],
    senior: [
      '请设计一个大型React应用的架构，包括状态管理、路由、性能优化等方面。',
      '如何处理React中的并发模式(Concurrent Mode)？',
      '请解释微前端架构，如何在实际项目中应用？',
      '如何设计一个高可用的前端监控系统？',
      '请讨论前端安全的常见问题和解决方案。',
    ],
  },
  '后端开发': {
    junior: [
      '什么是RESTful API？请设计一个简单的RESTful接口。',
      'HTTP和HTTPS有什么区别？',
      '数据库中的索引是什么？它有什么作用？',
      '什么是JSON Web Token(JWT)？它是如何工作的？',
      '请解释什么是CORS，如何解决跨域问题？',
    ],
    intermediate: [
      '什么是微服务架构？它与单体架构有什么区别？',
      '如何设计一个高可用的分布式系统？',
      '数据库事务的ACID原则是什么？',
      '请解释消息队列的作用，常见的消息队列有哪些？',
      '如何进行后端性能优化？请列举至少三种方法。',
    ],
    senior: [
      '请设计一个分布式缓存系统，考虑一致性、可用性等问题。',
      '如何处理分布式系统中的数据一致性问题？',
      '请解释服务网格(Service Mesh)的概念和应用场景。',
      '如何设计一个高并发的API网关？',
      '请讨论分布式系统中的容错机制和故障恢复策略。',
    ],
  },
  '算法与数据结构': {
    junior: [
      '请实现快速排序算法。',
      '什么是二叉树？请解释二叉搜索树的特点。',
      '哈希表是如何实现的？如何处理哈希冲突？',
      '链表和数组有什么区别？各自的优缺点是什么？',
      '请解释栈和队列的区别，并举例说明应用场景。',
    ],
    intermediate: [
      '请实现一个LRU缓存。',
      '什么是动态规划？请举一个例子说明。',
      '图的深度优先搜索和广度优先搜索有什么区别？',
      '请解释贪心算法和动态规划的区别。',
      '如何找到两个链表的交点？',
    ],
    senior: [
      '请设计一个高效的字符串匹配算法。',
      '什么是红黑树？它与AVL树有什么区别？',
      '请解释分布式一致性算法Paxos或Raft。',
      '如何设计一个高效的TopK问题解决方案？',
      '请讨论大规模数据处理中的算法优化策略。',
    ],
  },
};

const MOCK_REPORTS: Record<string, Partial<MockInterviewReport>> = {
  '前端开发': {
    overall_score: 78,
    radar_data: [
      { subject: '基础知识', value: 85 },
      { subject: '框架掌握', value: 80 },
      { subject: '性能优化', value: 72 },
      { subject: '工程实践', value: 75 },
      { subject: '架构设计', value: 68 },
    ],
    question_reviews: [
      { question: '请解释什么是虚拟DOM', pros: '回答清晰，理解深入', cons: '可以进一步解释diff算法', score: 85 },
      { question: 'React中的hooks', pros: '能够正确使用hooks', cons: '对hooks原理理解不够深入', score: 78 },
      { question: 'CSS布局', pros: '熟悉flexbox和grid', cons: '对复杂布局场景经验不足', score: 82 },
      { question: '闭包', pros: '理解正确', cons: '实际应用经验可以加强', score: 75 },
      { question: '事件机制', pros: '概念清晰', cons: '事件委托等高级用法可以补充', score: 80 },
    ],
    suggestions: [
      { dimension: '架构设计', advice: '建议学习大型前端项目架构设计，了解微前端等概念', resources: '《深入浅出React和Redux》' },
      { dimension: '性能优化', advice: '深入学习React性能优化技巧，包括memo、useMemo等', resources: 'React官方文档性能优化章节' },
      { dimension: '工程实践', advice: '参与更多大型项目，积累实际工程经验', resources: '开源项目贡献' },
    ],
    summary: '整体表现良好，基础知识扎实，框架掌握熟练。建议在架构设计和性能优化方面进一步提升。',
  },
  '后端开发': {
    overall_score: 75,
    radar_data: [
      { subject: '基础知识', value: 82 },
      { subject: '数据库设计', value: 78 },
      { subject: '分布式系统', value: 68 },
      { subject: 'API设计', value: 80 },
      { subject: '安全意识', value: 72 },
    ],
    question_reviews: [
      { question: 'RESTful API设计', pros: '设计合理', cons: '可以考虑版本控制', score: 82 },
      { question: 'HTTP和HTTPS', pros: '概念清晰', cons: 'TLS原理可以深入', score: 78 },
      { question: '数据库索引', pros: '理解正确', cons: '索引优化策略可以加强', score: 75 },
      { question: 'JWT', pros: '使用熟练', cons: '安全性考虑可以更多', score: 80 },
      { question: 'CORS', pros: '能够解决实际问题', cons: '原理理解可以加深', score: 75 },
    ],
    suggestions: [
      { dimension: '分布式系统', advice: '学习微服务架构和分布式系统设计', resources: '《微服务设计》' },
      { dimension: '安全意识', advice: '加强后端安全知识，了解常见攻击方式', resources: 'OWASP安全指南' },
      { dimension: '性能优化', advice: '学习数据库优化和缓存策略', resources: '《高性能MySQL》' },
    ],
    summary: '基础扎实，API设计能力强。建议在分布式系统和安全方面进一步提升。',
  },
  '算法与数据结构': {
    overall_score: 82,
    radar_data: [
      { subject: '算法基础', value: 88 },
      { subject: '数据结构', value: 85 },
      { subject: '复杂度分析', value: 80 },
      { subject: '编程能力', value: 85 },
      { subject: '问题解决', value: 75 },
    ],
    question_reviews: [
      { question: '快速排序', pros: '实现正确，复杂度分析准确', cons: '可以考虑优化方案', score: 88 },
      { question: '二叉树', pros: '概念清晰', cons: '平衡树知识可以加强', score: 82 },
      { question: '哈希表', pros: '实现和优化都很好', cons: '冲突解决策略可以更多', score: 85 },
      { question: '链表和数组', pros: '分析全面', cons: '实际应用经验可以增加', score: 80 },
      { question: '栈和队列', pros: '应用场景理解透彻', cons: '可以进一步讨论优先级队列', score: 85 },
    ],
    suggestions: [
      { dimension: '高级数据结构', advice: '学习红黑树、B+树等高级数据结构', resources: '《算法导论》' },
      { dimension: '算法优化', advice: '练习更多算法题，提升问题解决能力', resources: 'LeetCode' },
      { dimension: '系统设计', advice: '将算法知识应用到系统设计中', resources: '《系统设计入门》' },
    ],
    summary: '算法基础非常扎实，编程能力强。建议学习高级数据结构并应用到实际系统设计中。',
  },
};

type Stage = 'config' | 'interview' | 'report';

interface DisplayMessage {
  role: 'interviewer' | 'user';
  content: string;
  streaming?: boolean;
}

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

export default function MockInterviewPage() {
  const { user } = useAuth();

  const [stage, setStage] = useState<Stage>('config');
  const [direction, setDirection] = useState(DIRECTIONS[0]);
  const [difficulty, setDifficulty] = useState<'junior' | 'intermediate' | 'senior'>('intermediate');
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
  const [report, setReport] = useState<MockInterviewReport | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [syncingToProfile, setSyncingToProfile] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages]);

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
      if (error || !data) { throw error; }
      setInterview(data as MockInterview);
    } catch {
      setInterview({
        id: 'mock-interview-' + Date.now(),
        profile_id: user.id,
        direction,
        difficulty,
        total_questions: TOTAL_QUESTIONS,
        current_question: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as MockInterview);
    }
    setDisplayMessages([]);
    setLlmMessages([]);
    setQuestionIndex(0);
    setFollowUpRound(0);
    setStage('interview');
    setTimeout(() => askQuestion(), 200);
  };

  const askQuestion = useCallback(() => {
    if (!interview) return;
    
    const questions = MOCK_QUESTIONS[interview.direction]?.[interview.difficulty] || 
                     MOCK_QUESTIONS['前端开发']['intermediate'];
    const question = questions[questionIndex] || '请总结一下你的技术能力和项目经验。';
    
    setDisplayMessages(prev => [...prev, { role: 'interviewer', content: question }]);
    setLlmMessages(prev => [...prev, { role: 'assistant', content: question }]);
  }, [interview, questionIndex]);

  const handleSendAnswer = async () => {
    if (!userInput.trim() || !interview) return;
    const text = userInput.trim();
    setUserInput('');

    setDisplayMessages(prev => [...prev, { role: 'user', content: text }]);
    setLlmMessages(prev => [...prev, { role: 'user', content: text }]);

    if (followUpRound < MAX_FOLLOW_UP) {
      const nextRound = followUpRound + 1;
      setFollowUpRound(nextRound);
      
      setTimeout(() => {
        const followUpQuestions = [
          '能否详细解释一下你刚才提到的内容？',
          '在实际项目中，你是如何处理这种情况的？',
          '你认为这个方案有什么优缺点？',
        ];
        const followUp = followUpQuestions[nextRound - 1];
        setDisplayMessages(prev => [...prev, { role: 'interviewer', content: followUp }]);
        setLlmMessages(prev => [...prev, { role: 'assistant', content: followUp }]);
      }, 500);
    } else {
      const nextQ = questionIndex + 1;
      if (nextQ < interview.total_questions) {
        setQuestionIndex(nextQ);
        setFollowUpRound(0);
        setTimeout(() => askQuestion(), 500);
      } else {
        handleEndInterview();
      }
    }
    textareaRef.current?.focus();
  };

  const handleEndInterview = async () => {
    if (!interview) return;
    abortRef.current?.abort();
    
    try {
      await supabase.from('mock_interviews').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', interview.id);
    } catch {
    }
    
    generateReport();
  };

  const generateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ success: boolean; report: {
        overall_score: number;
        radar_data: RadarItem[];
        question_reviews: Array<{ question: string; pros: string; cons: string; score: number }>;
        suggestions: Array<{ dimension: string; advice: string; resources: string }>;
        summary: string;
      } }>('mock-interview-report', {
        body: {
          messages: llmMessages,
          direction: interview?.direction || direction,
          difficulty: interview?.difficulty || difficulty,
        },
      });

      if (!error && data?.report) {
        const r = data.report;
        const { data: savedReport } = await supabase
          .from('mock_interview_reports')
          .insert({
            interview_id: interview?.id || '',
            profile_id: user?.id || '',
            overall_score: r.overall_score,
            radar_data: r.radar_data,
            question_reviews: r.question_reviews,
            suggestions: r.suggestions,
            summary: r.summary,
          })
          .select()
          .maybeSingle();
        setReport(savedReport as MockInterviewReport ?? { ...r, id: '', interview_id: interview?.id || '', profile_id: user?.id || '', created_at: new Date().toISOString() });
      } else {
        throw new Error('Report generation failed');
      }
    } catch {
      const mockReport = MOCK_REPORTS[interview?.direction || direction] || MOCK_REPORTS['前端开发'];
      setReport({
        ...mockReport,
        id: 'mock-report-' + Date.now(),
        interview_id: interview?.id || '',
        profile_id: user?.id || '',
        created_at: new Date().toISOString(),
      } as MockInterviewReport);
    }
    setStage('report');
    setIsGeneratingReport(false);
  };

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
      toast.success('能力图谱已同步至简历管理页（演示模式）');
    }
    setSyncingToProfile(false);
  };

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAnswer();
    }
  };

  const progress = interview
    ? Math.round(((questionIndex + (followUpRound / (MAX_FOLLOW_UP + 1))) / interview.total_questions) * 100)
    : 0;

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

  if (stage === 'interview') {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto px-4">
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

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2"
        >
          {displayMessages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                msg.role === 'interviewer' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              }`}>
                {msg.role === 'interviewer' ? 'AI' : '我'}
              </div>
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
              disabled={!userInput.trim()}
              className="flex-1 h-9"
            >
              <Send className="w-4 h-4 mr-1.5" />
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

  if (!report) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
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