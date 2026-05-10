import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Message } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  MessageSquare, Send, Users, Sparkles, Globe, Mic, MicOff,
  RefreshCw, Copy, ChevronDown, ChevronUp, Loader2, Languages,
  FileText, Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { sendStreamRequest } from '@/lib/sse';

interface Contact {
  id: string;
  display_name?: string;
  username?: string;
  jobTitle?: string;
  lastMessage?: string;
  hasMessage: boolean;
}

// 翻译目标语言选项
const LANG_OPTIONS = [
  { code: 'en', label: '英语' },
  { code: 'jp', label: '日语' },
  { code: 'kor', label: '韩语' },
  { code: 'fra', label: '法语' },
  { code: 'de', label: '德语' },
  { code: 'spa', label: '西班牙语' },
  { code: 'zh', label: '中文' },
];

// 快捷回复模板
const QUICK_TEMPLATES = [
  { label: '面试邀约', text: '您好！感谢您投递我们的职位，经过简历筛选，我们希望邀请您参加面试。请问您方便的时间是？' },
  { label: '薪资沟通', text: '您好！关于薪资待遇，我们的范围是 [区间]，同时提供 [福利]。请问这符合您的期望吗？' },
  { label: '录用通知', text: '恭喜您！经过严格的面试评估，我们决定录用您担任 [职位] 一职。请问您方便的入职时间是？' },
  { label: '婉拒感谢', text: '感谢您对我司职位的关注！经过综合评估，您此次申请暂未通过，欢迎关注我们后续的招聘机会。' },
  { label: '岗位介绍', text: '您好！该岗位主要负责 [职责]，要求 [经验/技能]，工作地点在 [城市]，欢迎了解更多详情。' },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function EnterpriseMessages() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI 智能辅助状态
  const [aiPanel, setAiPanel] = useState<'suggest' | 'template' | 'analyze'>('suggest');
  const [aiContent, setAiContent] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const aiAbortRef = useRef<AbortController | null>(null);

  // 翻译状态
  const [translateTarget, setTranslateTarget] = useState('en');
  const [translating, setTranslating] = useState(false);
  const [translateMsgId, setTranslateMsgId] = useState<string | null>(null);
  const [translateResult, setTranslateResult] = useState<Record<string, string>>({});

  // 语音输入状态
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, title')
      .eq('enterprise_id', user.id);

    const jobMap: Record<string, string> = {};
    (jobs ?? []).forEach((j: { id: string; title: string }) => { jobMap[j.id] = j.title; });
    const jobIds = Object.keys(jobMap);

    const applicantMap: Record<string, string> = {};
    if (jobIds.length > 0) {
      const { data: apps } = await supabase
        .from('applications')
        .select('applicant_id, job_id')
        .in('job_id', jobIds);
      (apps ?? []).forEach((a: { applicant_id: string; job_id: string }) => {
        if (!applicantMap[a.applicant_id]) applicantMap[a.applicant_id] = jobMap[a.job_id] ?? '';
      });
    }

    const { data: msgData } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, content, created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    const msgContactIds = new Set<string>();
    const lastMsgMap: Record<string, string> = {};
    (msgData ?? []).forEach((m: { sender_id: string; receiver_id: string; content: string }) => {
      const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!lastMsgMap[otherId]) lastMsgMap[otherId] = m.content;
      msgContactIds.add(otherId);
    });

    const allIds = new Set([...Object.keys(applicantMap), ...msgContactIds]);
    if (allIds.size === 0) { setLoading(false); return; }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username')
      .in('id', Array.from(allIds));

    const contactList: Contact[] = (profiles ?? []).map((p: { id: string; display_name?: string; username?: string }) => ({
      id: p.id,
      display_name: p.display_name,
      username: p.username,
      jobTitle: applicantMap[p.id],
      lastMessage: lastMsgMap[p.id],
      hasMessage: msgContactIds.has(p.id),
    }));

    contactList.sort((a, b) => {
      if (a.hasMessage !== b.hasMessage) return a.hasMessage ? -1 : 1;
      return (a.display_name || a.username || '').localeCompare(b.display_name || b.username || '');
    });

    setContacts(contactList);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id);
      setAiContent('');
      setTranslateResult({});
    }
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async (contactId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user!.id})`)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages(Array.isArray(data) ? data as Message[] : []);
  };

  const handleSend = async (text?: string) => {
    const content = (text ?? inputText).trim();
    if (!content || !selectedContact || sending) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      sender_id: user!.id,
      receiver_id: selectedContact.id,
      content,
    });
    if (error) {
      toast.error('发送失败');
    } else {
      if (!text) setInputText('');
      await fetchMessages(selectedContact.id);
      setContacts(prev => prev.map(c =>
        c.id === selectedContact.id ? { ...c, lastMessage: content, hasMessage: true } : c
      ));
    }
    setSending(false);
  };

  // ── AI 智能辅助 ──
  const handleAiAssist = useCallback(async (mode: 'suggest' | 'template' | 'analyze') => {
    if (!selectedContact || messages.length === 0) {
      toast.info('请先选择候选人并有消息记录后再使用 AI 辅助');
      return;
    }
    setAiPanel(mode);
    setAiContent('');
    setAiStreaming(true);
    aiAbortRef.current?.abort();
    aiAbortRef.current = new AbortController();

    // 将消息转换为 AI 上下文
    const msgHistory = messages.slice(-10).map(m => ({
      role: m.sender_id === user!.id ? 'assistant' : 'user',
      content: m.content,
    }));

    await sendStreamRequest({
      functionUrl: `${SUPABASE_URL}/functions/v1/chat-ai-assist`,
      requestBody: {
        messages: msgHistory,
        mode,
        context: selectedContact.jobTitle ? `投递职位：${selectedContact.jobTitle}` : '',
      },
      supabaseAnonKey: SUPABASE_ANON_KEY,
      onData: (data) => {
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          const chunk = parsed.choices?.[0]?.delta?.content ?? '';
          if (chunk) setAiContent(prev => prev + chunk);
        } catch { /* 跳过无法解析的帧 */ }
      },
      onComplete: () => setAiStreaming(false),
      onError: (err) => {
        console.error('AI 辅助出错:', err);
        setAiStreaming(false);
        toast.error('AI 辅助请求失败，请稍后重试');
      },
      signal: aiAbortRef.current.signal,
    });
  }, [selectedContact, messages, user]);

  // ── 翻译功能 ──
  const handleTranslate = async (msgId: string, text: string) => {
    if (translateResult[msgId]) {
      // 已翻译，切换显示/隐藏
      setTranslateMsgId(prev => prev === msgId ? null : msgId);
      return;
    }
    setTranslating(true);
    setTranslateMsgId(msgId);
    try {
      const { data, error } = await supabase.functions.invoke('text-translation', {
        body: { q: text, from: 'auto', to: translateTarget },
      });
      if (error) throw error;
      if (data?.result?.trans_result) {
        const translated = data.result.trans_result.map((r: { dst: string }) => r.dst).join('\n');
        setTranslateResult(prev => ({ ...prev, [msgId]: translated }));
      }
    } catch (err) {
      toast.error('翻译失败，请稍后重试');
    } finally {
      setTranslating(false);
    }
  };

  // ── 语音录入 ──
  const handleVoiceToggle = async () => {
    if (recording) {
      // 停止录音
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 尝试用 wav 录制，fallback 到 webm
      const mimeType = MediaRecorder.isTypeSupported('audio/wav') ? 'audio/wav' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setTranscribing(true);

        try {
          let wavBlob = blob;
          // 如果不是 wav，需要转换
          if (mimeType !== 'audio/wav') {
            wavBlob = await convertToWav(blob);
          }
          const base64 = await blobToBase64(wavBlob);
          const { data, error } = await supabase.functions.invoke('short-speech-recognition', {
            body: { speech: base64, len: wavBlob.size, format: 'wav', rate: 16000, cuid: user!.id.slice(0, 32) },
          });
          if (error) throw error;
          if (data?.err_no === 0 && data?.result?.[0]) {
            setInputText(prev => prev + (prev ? ' ' : '') + data.result[0]);
          } else {
            toast.error(`语音识别失败：${data?.err_msg ?? '未知错误'}`);
          }
        } catch (err) {
          toast.error('语音识别失败，请重试');
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      toast.error('无法访问麦克风，请检查权限设置');
    }
  };

  // 工具函数：Blob → Base64
  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // 工具函数：webm → wav（通过 AudioContext 重采样）
  async function convertToWav(blob: Blob): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const pcm = audioBuffer.getChannelData(0);
    await audioCtx.close();
    const wav = new ArrayBuffer(44 + pcm.length * 2);
    const v = new DataView(wav);
    const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE');
    w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([wav], { type: 'audio/wav' });
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('已复制'));
  };

  const useAsSuggest = (text: string) => {
    setInputText(text);
    toast.success('已填入输入框');
  };

  return (
    <TooltipProvider>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <h1 className="text-xl font-bold text-foreground mb-4 text-balance">沟通协作</h1>

        <div className="flex gap-3 h-[calc(100vh-160px)] min-h-[560px]">
          {/* ── 候选人列表 ── */}
          <Card className="w-56 shrink-0 hidden md:flex flex-col">
            <CardHeader className="pb-2 shrink-0 border-b border-border px-3 pt-3">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                候选人
                {!loading && contacts.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs h-4 px-1.5">{contacts.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="p-2 space-y-1.5">
                    {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 bg-muted" />)}
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="p-4 text-center space-y-2">
                    <Users className="w-7 h-7 text-muted-foreground/30 mx-auto" />
                    <p className="text-xs text-muted-foreground">暂无候选人</p>
                    <p className="text-xs text-muted-foreground/50">发布职位后投递者将显示在此</p>
                  </div>
                ) : (
                  <div className="p-1.5 space-y-0.5">
                    {contacts.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => setSelectedContact(contact)}
                        className={`w-full text-left p-2 rounded-md transition-colors flex items-start gap-2 ${
                          selectedContact?.id === contact.id
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-muted border border-transparent'
                        }`}
                      >
                        <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                          <AvatarFallback className={`text-xs ${selectedContact?.id === contact.id ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20'}`}>
                            {(contact.display_name || contact.username || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-medium text-foreground truncate">
                              {contact.display_name || contact.username}
                            </p>
                            {contact.hasMessage && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                          </div>
                          {contact.jobTitle && (
                            <p className="text-xs text-primary/70 truncate">投递：{contact.jobTitle}</p>
                          )}
                          {contact.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* ── 消息主区 ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {!selectedContact ? (
              <Card className="flex-1">
                <CardContent className="flex-1 h-full flex flex-col items-center justify-center gap-3 text-muted-foreground p-8">
                  <MessageSquare className="w-12 h-12 opacity-20" />
                  <p className="text-sm font-medium">选择一位候选人开始沟通</p>
                  <p className="text-xs opacity-60 text-center text-pretty max-w-xs">
                    左侧列表包含所有投递了贵司职位的候选人，点击即可发起沟通并获得 AI 辅助建议
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 消息区卡片 */}
                <Card className="flex-1 min-h-0 flex flex-col">
                  {/* 消息头 */}
                  <CardHeader className="pb-2 shrink-0 border-b border-border px-4 pt-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {(selectedContact.display_name || selectedContact.username || '?')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {selectedContact.display_name || selectedContact.username}
                        </p>
                        {selectedContact.jobTitle && (
                          <p className="text-xs text-muted-foreground truncate">投递职位：{selectedContact.jobTitle}</p>
                        )}
                      </div>
                      {/* 翻译语言选择 */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                        <select
                          value={translateTarget}
                          onChange={e => { setTranslateTarget(e.target.value); setTranslateResult({}); setTranslateMsgId(null); }}
                          className="text-xs border border-border rounded px-1.5 py-0.5 bg-background text-foreground cursor-pointer"
                        >
                          {LANG_OPTIONS.map(l => (
                            <option key={l.code} value={l.code}>{l.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </CardHeader>

                  {/* 消息列表 */}
                  <CardContent className="flex-1 min-h-0 p-0 flex flex-col">
                    <ScrollArea className="flex-1">
                      <div className="p-4 space-y-3">
                        {messages.length === 0 && (
                          <div className="text-center py-10">
                            <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">还没有消息，点击下方快捷模板发起沟通</p>
                          </div>
                        )}
                        {messages.map(msg => {
                          const isMine = msg.sender_id === user!.id;
                          const translated = translateResult[msg.id];
                          const showTranslation = translateMsgId === msg.id && translated;
                          return (
                            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
                              <div className="max-w-[68%] space-y-1">
                                <div className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                                  isMine
                                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                    : 'bg-muted text-foreground rounded-tl-sm'
                                }`}>
                                  {msg.content}
                                </div>
                                {/* 翻译结果 */}
                                {showTranslation && (
                                  <div className={`text-xs px-3 py-1.5 rounded-lg border ${
                                    isMine ? 'bg-primary/5 border-primary/20 text-foreground' : 'bg-muted/50 border-border text-muted-foreground'
                                  }`}>
                                    <span className="text-primary/60 mr-1">译文：</span>{translated}
                                  </div>
                                )}
                                {/* 消息操作栏 */}
                                <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'justify-end' : 'justify-start'}`}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => handleTranslate(msg.id, msg.content)}
                                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                        disabled={translating && translateMsgId === msg.id}
                                      >
                                        {translating && translateMsgId === msg.id
                                          ? <Loader2 className="w-3 h-3 animate-spin" />
                                          : <Languages className="w-3 h-3" />
                                        }
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">翻译为{LANG_OPTIONS.find(l => l.code === translateTarget)?.label}</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button onClick={() => copyText(msg.content)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">复制</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    {/* 快捷模板栏 */}
                    <div className="px-3 py-2 border-t border-border/50 shrink-0">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <span className="text-xs text-muted-foreground shrink-0">快捷：</span>
                        {QUICK_TEMPLATES.map(t => (
                          <button
                            key={t.label}
                            onClick={() => setInputText(t.text)}
                            className="text-xs px-2 py-0.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30 transition-colors whitespace-nowrap shrink-0"
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 输入栏 */}
                    <div className="p-3 border-t border-border shrink-0 bg-background/50">
                      <div className="flex gap-2 items-center">
                        {/* 语音按钮 */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              className={`shrink-0 h-9 w-9 ${recording ? 'bg-destructive/10 border-destructive text-destructive animate-pulse' : ''}`}
                              onClick={handleVoiceToggle}
                              disabled={transcribing}
                            >
                              {transcribing
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />
                              }
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">{recording ? '停止录音' : '语音输入'}</TooltipContent>
                        </Tooltip>

                        <Input
                          placeholder={recording ? '录音中，点击麦克风结束...' : '输入消息，Enter 发送...'}
                          value={inputText}
                          onChange={e => setInputText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                          className="flex-1 px-3"
                          disabled={sending || recording}
                        />
                        <Button
                          size="icon"
                          className="shrink-0 h-9 w-9"
                          onClick={() => handleSend()}
                          disabled={sending || !inputText.trim()}
                        >
                          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ── AI 智能辅助面板 ── */}
                <Card className="shrink-0">
                  <CardHeader className="py-2 px-4 shrink-0 cursor-pointer" onClick={() => setAiPanelOpen(v => !v)}>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium text-foreground">AI 智能辅助</span>
                      <span className="text-xs text-muted-foreground ml-1">· 意图分析 · 回复建议 · 模板生成</span>
                      <div className="ml-auto flex items-center gap-2">
                        {aiStreaming && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                        {aiPanelOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardHeader>

                  {aiPanelOpen && (
                    <CardContent className="pt-0 px-4 pb-3 space-y-3">
                      {/* 模式切换 */}
                      <Tabs value={aiPanel} onValueChange={v => setAiPanel(v as typeof aiPanel)}>
                        <TabsList className="h-7 gap-0.5">
                          <TabsTrigger value="suggest" className="text-xs h-6 px-2.5">
                            <Lightbulb className="w-3 h-3 mr-1" />回复建议
                          </TabsTrigger>
                          <TabsTrigger value="template" className="text-xs h-6 px-2.5">
                            <FileText className="w-3 h-3 mr-1" />模板生成
                          </TabsTrigger>
                          <TabsTrigger value="analyze" className="text-xs h-6 px-2.5">
                            <Sparkles className="w-3 h-3 mr-1" />意图分析
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs px-3"
                          onClick={() => handleAiAssist(aiPanel)}
                          disabled={aiStreaming || messages.length === 0}
                        >
                          {aiStreaming
                            ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />生成中...</>
                            : <><RefreshCw className="w-3 h-3 mr-1.5" />生成</>
                          }
                        </Button>
                        {aiStreaming && (
                          <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={() => { aiAbortRef.current?.abort(); setAiStreaming(false); }}>
                            停止
                          </Button>
                        )}
                        {aiContent && !aiStreaming && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={() => copyText(aiContent)}>
                              <Copy className="w-3 h-3 mr-1" />复制
                            </Button>
                            {aiPanel === 'suggest' && (
                              <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={() => {
                                // 取第一条建议填入输入框
                                const firstLine = aiContent.split('\n').find(l => l.trim().startsWith('•'))?.replace(/^•\s*/, '').trim();
                                if (firstLine) useAsSuggest(firstLine);
                              }}>
                                使用第一条
                              </Button>
                            )}
                          </>
                        )}
                      </div>

                      {/* AI 输出区 */}
                      {(aiContent || aiStreaming) && (
                        <div className="bg-muted/50 rounded-lg p-3 max-h-36 overflow-y-auto border border-border/50">
                          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                            {aiContent}
                            {aiStreaming && <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 animate-pulse rounded-sm" />}
                          </p>
                        </div>
                      )}

                      {!aiContent && !aiStreaming && (
                        <p className="text-xs text-muted-foreground/60">
                          {aiPanel === 'suggest' && '点击"生成"，AI 将分析对话并提供个性化回复建议'}
                          {aiPanel === 'template' && '点击"生成"，AI 将根据场景生成面试邀约、薪资谈判等标准化模板'}
                          {aiPanel === 'analyze' && '点击"生成"，AI 将分析候选人最近消息的意图与情绪倾向'}
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
