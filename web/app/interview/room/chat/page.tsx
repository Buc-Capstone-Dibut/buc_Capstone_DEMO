"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PhoneOff, MessageSquare, Send, Loader2, Clock3 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { Input } from "@/components/ui/input";

interface ChatMessage {
   role: 'user' | 'model';
   parts: string;
}

interface RuntimeMeta {
   targetDurationSec: number;
   closingThresholdSec: number;
   elapsedSec: number;
   remainingSec: number;
   timeProgressPercent: number;
   estimatedTotalQuestions: number;
   questionCount: number;
   isClosingPhase: boolean;
   interviewComplete: boolean;
   finishReason: string;
}

const DEFAULT_TARGET_DURATION_SEC = 7 * 60;

const clampDurationMinute = (raw: string | null): number => {
   if (!raw) return 7;
   const parsed = Number(raw);
   if (parsed === 5 || parsed === 7 || parsed === 10) return parsed;
   return 7;
};

const formatTime = (seconds: number): string => {
   const safe = Math.max(0, Math.floor(seconds));
   const minutes = Math.floor(safe / 60);
   const remains = safe % 60;
   return `${String(minutes).padStart(2, "0")}:${String(remains).padStart(2, "0")}`;
};

export default function InterviewRoomPage() {
   const router = useRouter();
   const searchParams = useSearchParams();
   const durationMinutes = clampDurationMinute(searchParams.get("duration"));
   const requestedTargetDurationSec = durationMinutes * 60;
   const {
      jobData,
      resumeData,
      interviewerPersonality,
      interviewSessionId,
      setInterviewSessionId,
      setChatHistory,
   } = useInterviewSetupStore();

   const [messages, setMessages] = useState<ChatMessage[]>([]);
   const [input, setInput] = useState("");
   const [isLoading, setIsLoading] = useState(false);
   const [interviewComplete, setInterviewComplete] = useState(false);
   const [runtimeMeta, setRuntimeMeta] = useState<RuntimeMeta>({
      targetDurationSec: requestedTargetDurationSec || DEFAULT_TARGET_DURATION_SEC,
      closingThresholdSec: 60,
      elapsedSec: 0,
      remainingSec: requestedTargetDurationSec || DEFAULT_TARGET_DURATION_SEC,
      timeProgressPercent: 0,
      estimatedTotalQuestions: 6,
      questionCount: 0,
      isClosingPhase: false,
      interviewComplete: false,
      finishReason: "",
   });

   const scrollRef = useRef<HTMLDivElement>(null);
   const inputRef = useRef<HTMLInputElement>(null);
   const hasStarted = useRef(false);
   const isStartingSession = useRef(false);

   // Auto scroll to bottom
   useEffect(() => {
      if (scrollRef.current) {
         scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
   }, [messages]);

   // Auto focus input when AI finishes talking
   useEffect(() => {
      if (!isLoading && messages.length > 0) {
         inputRef.current?.focus();
      }
   }, [isLoading, messages.length]);

   useEffect(() => {
      setRuntimeMeta((prev) => ({
         ...prev,
         targetDurationSec: requestedTargetDurationSec || prev.targetDurationSec,
         remainingSec: prev.elapsedSec > 0 ? prev.remainingSec : requestedTargetDurationSec,
      }));
   }, [requestedTargetDurationSec]);

   // Start interview (Get initial question)
   useEffect(() => {
      if (!hasStarted.current) {
         hasStarted.current = true;
         handleSendMessage(true);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   useEffect(() => {
      if (!interviewSessionId || interviewComplete) return;
      const timer = setInterval(() => {
         setRuntimeMeta((prev) => {
            if (prev.interviewComplete || prev.remainingSec <= 0) {
               return prev;
            }
            const elapsedSec = Math.min(prev.targetDurationSec, prev.elapsedSec + 1);
            const remainingSec = Math.max(0, prev.remainingSec - 1);
            const timeProgressPercent = Math.max(
               0,
               Math.min(100, Math.round((elapsedSec / Math.max(1, prev.targetDurationSec)) * 100)),
            );
            return {
               ...prev,
               elapsedSec,
               remainingSec,
               timeProgressPercent,
            };
         });
      }, 1000);
      return () => clearInterval(timer);
   }, [interviewSessionId, interviewComplete]);

   const ensureSessionId = async (): Promise<string | null> => {
      if (interviewSessionId) return interviewSessionId;
      if (isStartingSession.current) return null;

      isStartingSession.current = true;
      try {
         const response = await fetch('/api/interview/session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               mode: "chat",
               personality: interviewerPersonality || 'professional',
               jobData,
               resumeData,
               targetDurationSec: requestedTargetDurationSec,
               closingThresholdSec: 60,
            })
         });

         const result = await response.json();
         if (result.success && result.data?.sessionId) {
            setInterviewSessionId(result.data.sessionId);
            if (result.data?.targetDurationSec || result.data?.closingThresholdSec) {
               setRuntimeMeta((prev) => ({
                  ...prev,
                  targetDurationSec: Number(result.data.targetDurationSec || prev.targetDurationSec),
                  remainingSec: Number(result.data.targetDurationSec || prev.targetDurationSec),
                  closingThresholdSec: Number(result.data.closingThresholdSec || prev.closingThresholdSec),
                  estimatedTotalQuestions: Number(result.data.estimatedTotalQuestions || prev.estimatedTotalQuestions),
               }));
            }
            return result.data.sessionId;
         }

         throw new Error(result.error || '세션 시작 실패');
      } catch (error) {
         console.error('Session Start Error:', error);
         return null;
      } finally {
         isStartingSession.current = false;
      }
   };

   const handleSendMessage = async (isInitial = false) => {
      if (!isInitial && !input.trim()) return;
      if (isLoading || interviewComplete) return;

      const userMessage: ChatMessage | null = isInitial ? null : { role: 'user', parts: input };
      const newMessages = userMessage ? [...messages, userMessage] : messages;

      if (userMessage) {
         setMessages(newMessages);
         setInput("");
      }

      setIsLoading(true);

      try {
         const sessionId = await ensureSessionId();

         const response = await fetch('/api/interview/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               messages: newMessages,
               jobData,
               resumeData,
               personality: interviewerPersonality,
               sessionId,
               targetDurationSec: runtimeMeta.targetDurationSec || requestedTargetDurationSec,
               closingThresholdSec: runtimeMeta.closingThresholdSec || 60,
            })
         });

         const result = await response.json();
         if (result.success) {
            if (result.sessionId && !interviewSessionId) {
               setInterviewSessionId(result.sessionId);
            }
            const aiMessage = result.data;
            const updatedMessages = [...newMessages, aiMessage];
            setMessages(updatedMessages);
            if (result.meta) {
               setRuntimeMeta((prev) => ({
                  ...prev,
                  ...result.meta,
                  targetDurationSec: Number(result.meta.targetDurationSec ?? prev.targetDurationSec),
                  closingThresholdSec: Number(result.meta.closingThresholdSec ?? prev.closingThresholdSec),
                  elapsedSec: Number(result.meta.elapsedSec ?? prev.elapsedSec),
                  remainingSec: Number(result.meta.remainingSec ?? prev.remainingSec),
                  timeProgressPercent: Number(result.meta.timeProgressPercent ?? prev.timeProgressPercent),
                  estimatedTotalQuestions: Number(result.meta.estimatedTotalQuestions ?? prev.estimatedTotalQuestions),
                  questionCount: Number(result.meta.questionCount ?? prev.questionCount),
                  isClosingPhase: Boolean(result.meta.isClosingPhase),
                  interviewComplete: Boolean(result.meta.interviewComplete),
                  finishReason: String(result.meta.finishReason || ""),
               }));
            }

            const complete = Boolean(result.interviewComplete || result.meta?.interviewComplete);
            if (complete) {
               setInterviewComplete(true);
               setTimeout(() => {
                  setChatHistory(updatedMessages);
                  router.push('/interview/result');
               }, 1800);
            }
         } else {
            throw new Error(result.error);
         }
      } catch (error: unknown) {
         const message = error instanceof Error ? error.message : "알 수 없는 오류";
         console.error("Chat Error:", error);
         alert(`AI와의 연결에 실패했습니다: ${message}`);
      } finally {
         setIsLoading(false);
      }
   };

   const handleEndCall = () => {
      if (confirm("면접을 종료하고 결과를 확인하시겠습니까?")) {
         setInterviewComplete(true);
         setChatHistory(messages);
         router.push('/interview/result');
      }
   };

   return (
      <div className="h-[calc(100vh-3.5rem)] bg-muted/40 flex flex-col items-center p-4 md:p-6 lg:p-8 overflow-hidden">
         <div className="w-full max-w-6xl h-full flex flex-col lg:flex-row gap-6">

            {/* Left Info Panel (Desktop) */}
            <div className="hidden lg:flex w-64 flex-col gap-4 shrink-0">
               <div className="bg-card border rounded-3xl p-5 space-y-5 shadow-sm">
                  <div className="flex items-center justify-between">
                     <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 px-2 py-0.5 text-[10px] font-semibold">
                        LIVE INTERVIEW
                     </Badge>
                     <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        {interviewerPersonality === 'cold' ? '압박 모드' : interviewerPersonality === 'friendly' ? '친절 모드' : '전문가 모드'}
                     </div>
                  </div>
                  <div>
                     <h2 className="text-base font-bold text-foreground tracking-tight truncate">
                        {jobData?.company || "AI 면접관"}
                     </h2>
                     <p className="text-xs text-muted-foreground font-medium truncate opacity-80">
                        {jobData?.role || "포지션 분석 중..."}
                     </p>
                  </div>
               </div>

               <div className="bg-card border rounded-3xl p-5 shadow-sm flex-1 flex flex-col">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] mb-6 italic opacity-70">Session Status</h3>
                  <div className="flex-1 flex flex-col justify-center items-center gap-6">
                     <div className="relative w-36 h-36 flex flex-col items-center justify-center bg-muted/20 rounded-full border-2 border-dashed border-muted-foreground/10">
                        <span className="text-4xl font-black text-primary tracking-tighter">
                           {messages.filter(m => m.role === 'model').length}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">Questions</span>
                     </div>
                     <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                        <Clock3 className="w-3.5 h-3.5" />
                        {formatTime(runtimeMeta.remainingSec)} / {formatTime(runtimeMeta.targetDurationSec)}
                     </div>
                     {runtimeMeta.isClosingPhase && (
                        <Badge variant="outline" className="text-[10px] border-orange-200 text-orange-600 bg-orange-50">
                           마무리 단계 진행 중
                        </Badge>
                     )}
                     <div className="w-full space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground/80">
                           <span>Time Progress</span>
                           <span>{runtimeMeta.timeProgressPercent}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden shadow-inner">
                           <div
                              className="h-full bg-primary transition-all duration-700 ease-out shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                              style={{ width: `${runtimeMeta.timeProgressPercent}%` }}
                           />
                        </div>
                     </div>
                  </div>
               </div>

               <Button
                  variant="outline"
                  className="w-full h-12 rounded-2xl gap-2 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200 text-xs font-bold shadow-sm"
                  onClick={handleEndCall}
               >
                  <PhoneOff className="w-4 h-4" /> 면접 조기 종료
               </Button>
            </div>

            {/* Main Center Chat Container */}
            <div className="flex-1 flex flex-col bg-card border rounded-[2rem] shadow-xl shadow-primary/5 overflow-hidden min-w-0 relative">
               <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none" />

               {/* Messages Area */}
               <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scrollbar-hide pt-12 pb-24">
                  {messages.length === 0 && !isLoading && (
                     <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-30">
                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                           <MessageSquare className="w-10 h-10" />
                        </div>
                        <p className="text-sm font-medium">면접관이 입장을 준비 중입니다...</p>
                     </div>
                  )}

                  {messages.map((msg, idx) => (
                     <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`flex gap-4 max-w-[95%] md:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                           <Avatar className={`w-9 h-9 shrink-0 border-2 shadow-sm ${msg.role === 'user' ? 'border-primary/30' : 'border-primary/20'}`}>
                              <AvatarFallback className={msg.role === 'user' ? 'bg-primary text-primary-foreground font-bold text-xs' : 'bg-primary/20 text-primary font-bold text-xs'}>
                                 {msg.role === 'user' ? 'ME' : 'AI'}
                              </AvatarFallback>
                           </Avatar>
                           <div className={`p-5 rounded-3xl text-[14px] md:text-[15px] leading-[1.6] shadow-sm ${msg.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-tr-none font-medium'
                              : 'bg-muted/40 text-foreground border border-muted-foreground/10 rounded-tl-none'
                              }`}>
                              {msg.parts}
                           </div>
                        </div>
                     </div>
                  ))}

                  {isLoading && (
                     <div className="flex justify-start items-center gap-4 text-muted-foreground">
                        <Avatar className="w-9 h-9 shrink-0 border-2 border-primary/10 shadow-sm animate-pulse">
                           <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                        </Avatar>
                        <div className="bg-muted/20 px-5 py-2.5 rounded-full border border-dashed border-muted-foreground/20 flex items-center gap-2.5 text-[11px] font-semibold italic">
                           <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                           면접관이 답변을 정리하고 있습니다...
                        </div>
                     </div>
                  )}
               </div>

               {/* Integrated Search/Input Box */}
               <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-card via-card/95 to-transparent pt-12">
                  <div className="max-w-3xl mx-auto flex gap-3 items-center bg-muted/60 backdrop-blur-md p-2 border border-muted-foreground/10 rounded-2xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all duration-300 shadow-lg">
                     <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading || interviewComplete}
                        onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                              handleSendMessage();
                           }
                        }}
                        placeholder="솔직하고 구체적인 답변을 입력하세요..."
                        className="flex-1 bg-transparent border-none focus-visible:ring-0 h-12 text-[15px] shadow-none placeholder:text-muted-foreground/50"
                     />
                     <Button
                        onClick={() => handleSendMessage()}
                        disabled={isLoading || interviewComplete || !input.trim()}
                        className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 active:scale-95 shadow-lg shadow-primary/20 text-primary-foreground shrink-0 transition-all font-bold"
                     >
                        <Send className="w-5 h-5" />
                     </Button>
                  </div>
               </div>
            </div>

            {/* Right Panel (Desktop) - Focus Analysis */}
            <div className="hidden xl:flex w-56 flex-col gap-5 shrink-0">
               <div className="bg-card border rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-4 bg-primary rounded-full" />
                     <h3 className="text-xs font-bold text-foreground">핵심 키워드</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                     {['경험 중심', '문제 해결', '기술 역량', '압박 대응'].map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary font-medium px-2.5 py-1 border-none transition-colors">
                           #{tag}
                        </Badge>
                     ))}
                  </div>
               </div>

               <div className="bg-primary/5 border border-primary/20 rounded-3xl p-5 space-y-3">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Tip</p>
                  <p className="text-[11px] text-primary/70 leading-relaxed font-medium">
                     문장이 길어질 때는 <strong>두괄식</strong>으로 먼저 말해보세요. 핵심 역량을 명확히 전달할 수 있습니다.
                  </p>
               </div>
            </div>

         </div>
      </div>
   );
}
