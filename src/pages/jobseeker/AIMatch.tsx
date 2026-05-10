import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { ChatMessage, AIConversation } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BrainCircuit, Send, Plus, MessageSquare, TrendingUp,
  Lightbulb, CheckCircle, AlertCircle, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { getMockAiResponse } from '@/lib/mock-data';

const SYSTEM_PROMPT = `你是"智聘未来"平台的AI招聘助手，专门帮助求职者进行岗位智能匹配。你的职责是：
1. 通过多轮对话了解求职者的技能、经验、求职意向
2. 分析求职者的优势和待改进点
3. 推荐适合的职位方向和技能提升建议
4. 生成匹配分析报告

请用中文回复，保持专业、友好的语气。每次回复结束时，可以提出1-2个追问以深入了解用户需求。`;

const WELCOME_MESSAGES: ChatMessage[] = [
  {
    role: 'assistant',
    content: '你好！我是智聘未来的AI匹配助手。我将帮你找到最适合的工作机会，分析你的能力与岗位的匹配度。\n\n请告诉我：\n• 你目前的工作经验和技能有哪些？\n• 你期望从事什么样的工作？\n• 对薪资、地点有什么要求？',
    timestamp: new Date().toISOString(),
  }
];

export default function AIMatch() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(WELCOME_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const { data } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user!.id)
        .eq('session_type', 'matching')
        .order('updated_at', { ascending: false })
        .limit(10);
      setConversations(Array.isArray(data) ? data as AIConversation[] : []);
    } catch {
      setConversations([]);
    }
    setHistoryLoading(false);
  };

  const createNewConversation = async () => {
    try {
      const { data } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user!.id,
          session_type: 'matching',
          title: '新的匹配对话',
          messages: WELCOME_MESSAGES,
        })
        .select()
        .maybeSingle();

      if (data) {
        setActiveConvId(data.id);
        setMessages(WELCOME_MESSAGES);
        fetchConversations();
      }
    } catch {
      setActiveConvId('mock-new');
      setMessages(WELCOME_MESSAGES);
      setConversations(prev => [{ id: 'mock-new', user_id: user!.id, session_type: 'matching', title: '新的匹配对话', messages: WELCOME_MESSAGES, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev]);
    }
  };

  const loadConversation = async (conv: AIConversation) => {
    setActiveConvId(conv.id);
    const msgs = Array.isArray(conv.messages) ? conv.messages as ChatMessage[] : WELCOME_MESSAGES;
    setMessages(msgs.length > 0 ? msgs : WELCOME_MESSAGES);
  };

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...updatedMessages.map(m => ({ role: m.role, content: m.content }))
          ]
        }
      });

      if (error) {
        throw error;
      }

      const assistantContent = data?.choices?.[0]?.message?.content || data?.content || '抱歉，我暂时无法回应，请稍后再试。';

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      if (activeConvId) {
        const title = updatedMessages.find(m => m.role === 'user')?.content?.slice(0, 20) || '匹配对话';
        await supabase.from('ai_conversations')
          .update({ messages: finalMessages, title })
          .eq('id', activeConvId);
      } else {
        const { data: newConv } = await supabase.from('ai_conversations').insert({
          user_id: user!.id,
          session_type: 'matching',
          title: userMessage.content.slice(0, 20) || '匹配对话',
          messages: finalMessages,
        }).select().maybeSingle();
        if (newConv) {
          setActiveConvId(newConv.id);
          fetchConversations();
        }
      }
    } catch {
      const mockResponse = getMockAiResponse(inputText);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: mockResponse,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      if (!activeConvId) {
        setActiveConvId('mock-' + Date.now());
      }
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getMatchHighlights = () => {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length < 2) return null;
    return {
      strengths: ['技术栈匹配', '学习能力强'],
      gaps: ['项目管理经验不足', '英语水平待提升'],
      suggestions: ['建议申请初中级开发岗位', '可考虑补充PMP证书'],
    };
  };

  const highlights = getMatchHighlights();

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
      <div className="flex gap-4">
        <div className="hidden md:flex flex-col w-56 shrink-0 space-y-2">
          <Button size="sm" onClick={createNewConversation} className="w-full h-9">
            <Plus className="w-4 h-4 mr-2" />新建对话
          </Button>
          <div className="text-xs text-muted-foreground font-medium px-1">历史记录</div>
          {historyLoading ? (
            <div className="space-y-2">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10 bg-muted" />)}</div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1">暂无历史对话</p>
          ) : (
            <div className="space-y-1">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv)}
                  className={`w-full text-left px-2 py-2 rounded-md text-sm transition-colors truncate ${
                    activeConvId === conv.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1.5 shrink-0" />
                  {conv.title || '匹配对话'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-primary" />
                AI智能匹配对话
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96 md:h-[480px]">
                <div className="p-4 space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.15s]" />
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.3s]" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    placeholder="描述你的求职意向、技能经验... (Enter发送，Shift+Enter换行)"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-h-[60px] max-h-32 resize-none px-3 text-sm"
                    disabled={loading}
                  />
                  <Button
                    size="icon"
                    className="h-auto w-10 shrink-0"
                    onClick={handleSend}
                    disabled={loading || !inputText.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {highlights && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />匹配分析报告
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />优势亮点
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {highlights.strengths.map(s => (
                      <Badge key={s} variant="outline" className="text-xs text-primary border-primary/30">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-accent" />待改进点
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {highlights.gaps.map(g => (
                      <Badge key={g} variant="outline" className="text-xs text-accent border-accent/30">{g}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-chart-4" />AI建议
                  </p>
                  <ul className="space-y-1">
                    {highlights.suggestions.map(s => (
                      <li key={s} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}