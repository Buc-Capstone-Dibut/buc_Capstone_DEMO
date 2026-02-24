"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MOCK_CHAT_MESSAGES } from "@/mocks/interview-data";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PreQnAPage() {
   const router = useRouter();
   const scrollRef = useRef<HTMLDivElement>(null);
   const [messages, setMessages] = useState(MOCK_CHAT_MESSAGES);
   const [inputValue, setInputValue] = useState("");
   const [isTyping, setIsTyping] = useState(false);

   useEffect(() => {
      if (scrollRef.current) {
         scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
   }, [messages]);

   const handleSend = () => {
      if (!inputValue.trim()) return;

      const newUserMsg = {
         id: Date.now().toString(),
         role: 'user',
         content: inputValue,
         timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, newUserMsg]);
      setInputValue("");
      setIsTyping(true);

      // Mock AI Response
      setTimeout(() => {
         const newAiMsg = {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: "답변 감사합니다. 다음 질문으로 넘어가겠습니다. 리액트의 Virtual DOM에 대해 설명해주실 수 있나요?",
            timestamp: new Date().toISOString()
         };
         setMessages(prev => [...prev, newAiMsg]);
         setIsTyping(false);
      }, 1500);
   };

   return (
      <div className="flex flex-col h-screen bg-background">
         {/* Header */}
         <header className="h-16 border-b flex items-center px-6 justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={() => router.push('/interview')}>
                  <ArrowLeft className="w-5 h-5" />
               </Button>
               <div>
                  <h1 className="font-semibold text-lg flex items-center gap-2">
                     사전 탐색 질문 (Pre-QnA)
                     <span className="text-xs bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary px-2 py-0.5 rounded-full">AI Interviewer</span>
                  </h1>
                  <p className="text-xs text-muted-foreground">지원자의 기본 역량을 파악하기 위한 채팅 인터뷰입니다.</p>
               </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/interview/result')}>
               인터뷰 종료
            </Button>
         </header>

         {/* Chat Area */}
         <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-y-auto p-4 md:p-8 space-y-6" ref={scrollRef}>
               <div className="max-w-3xl mx-auto space-y-6 pb-20">
                  {messages.map((msg) => (
                     <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'ai' && (
                           <Avatar className="w-8 h-8 mt-1 border">
                              <AvatarImage src="/ai-avatar.png" />
                              <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                           </Avatar>
                        )}
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-tr-none'
                              : 'bg-muted rounded-tl-none'
                           }`}>
                           {msg.content}
                        </div>
                        {msg.role === 'user' && (
                           <Avatar className="w-8 h-8 mt-1 border">
                              <AvatarFallback className="bg-muted">Me</AvatarFallback>
                           </Avatar>
                        )}
                     </div>
                  ))}
                  {isTyping && (
                     <div className="flex gap-4 justify-start">
                        <Avatar className="w-8 h-8 mt-1 border">
                           <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                           <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" />
                           <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce [animation-delay:0.2s]" />
                           <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* Input Area */}
         <div className="p-4 border-t bg-background/80 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto relative">
               <Input
                  className="pr-12 h-12 text-base shadow-sm"
                  placeholder="답변을 입력하세요..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
               />
               <Button
                  size="icon"
                  className="absolute right-1 top-1 h-10 w-10"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
               >
                  <Send className="w-4 h-4" />
               </Button>
            </div>
            <div className="text-center mt-2 text-xs text-muted-foreground">
               AI가 답변을 분석하여 다음 질문을 생성합니다.
            </div>
         </div>
      </div>
   );
}
