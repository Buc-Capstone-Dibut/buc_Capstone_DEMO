"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import useSWR from "swr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_BASE = process.env.NEXT_PUBLIC_AI_ADMIN_BASE_URL || "http://localhost:8001/admin";
const USERNAME = "dibut";
const PASSWORD = "asd123";

const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      "Authorization": "Basic " + btoa(`${USERNAME}:${PASSWORD}`)
    }
  }).then((res) => res.json());

export default function AdminDashboard() {
  const { data: health, error: healthError } = useSWR(`${API_BASE}/health`, fetcher, { refreshInterval: 5000 });
  const { data: sessions, error: sessionsError } = useSWR(`${API_BASE}/sessions`, fetcher, { refreshInterval: 2000 });

  const [selectedSessionUid, setSelectedSessionUid] = useState<string | null>(null);

  // Auto-select first session if none selected
  useEffect(() => {
    if (sessions && sessions.length > 0 && !selectedSessionUid) {
      setSelectedSessionUid(sessions[0].uid);
    }
  }, [sessions]);

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-900">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-indigo-700">Dibut AI Admin</h1>
          <p className="text-slate-500">Real-time Debugging & Monitoring</p>
        </div>

        {/* Server Status Card */}
        <Card className="w-64">
           <CardContent className="pt-6 flex justify-between items-center">
              <div>
                <div className="text-sm text-slate-500">Server Status</div>
                <div className={`font-bold ${health?.status === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                   {health ? "Online 🟢" : "Offline 🔴"}
                </div>
              </div>
              <div className="text-right">
                 <div className="text-sm text-slate-500">Active Sessions</div>
                 <div className="font-bold text-xl">{health?.active_sessions ?? 0}</div>
              </div>
           </CardContent>
        </Card>
      </header>

      <div className="grid grid-cols-12 gap-6 h-[800px]">
        {/* Left: Session List */}
        <Card className="col-span-3 h-full flex flex-col">
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
             <div className="p-4 space-y-2">
                {sessions?.map((sess: any) => (
                  <div
                    key={sess.uid}
                    onClick={() => setSelectedSessionUid(sess.uid)}
                    className={`p-3 rounded-lg cursor-pointer border transition-colors ${selectedSessionUid === sess.uid ? 'bg-indigo-50 border-indigo-500' : 'bg-white hover:bg-slate-50'}`}
                  >
                     <div className="flex justify-between mb-1">
                        <span className="font-mono text-xs text-slate-400">{sess.uid.slice(0,8)}...</span>
                        <Badge variant={sess.status === 'running' ? 'default' : 'secondary'}>{sess.status}</Badge>
                     </div>
                     <div className="text-xs text-slate-500">
                        {new Date(sess.created_at * 1000).toLocaleTimeString()}
                     </div>
                     <div className="mt-2 flex gap-2 text-xs">
                        <span className="bg-slate-100 px-1 rounded">Q: {sess.question_count}</span>
                        <span className="bg-slate-100 px-1 rounded">Evt: {sess.event_count}</span>
                     </div>
                  </div>
                ))}
                {sessions?.length === 0 && <div className="text-center text-slate-400 py-10">No sessions</div>}
             </div>
          </ScrollArea>
        </Card>

        {/* Right: Session Detail */}
        <Card className="col-span-9 h-full flex flex-col">
            {selectedSessionUid ? (
              <SessionDetailView uid={selectedSessionUid} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                 Select a session to inspect
              </div>
            )}
        </Card>
      </div>
    </div>
  );
}

function SessionDetailView({ uid }: { uid: string }) {
  const { data: session, isLoading } = useSWR(`${API_BASE}/sessions/${uid}`, fetcher, { refreshInterval: 1000 });

  if (isLoading) return <div className="p-10 text-center">Loading detail...</div>;
  if (!session) return <div className="p-10 text-center text-red-500">Session not found</div>;

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="border-b bg-slate-50/50">
         <div className="flex justify-between items-start">
            <div>
               <CardTitle className="font-mono text-lg">{session.client_uid}</CardTitle>
               <div className="text-xs text-slate-500 mt-1">
                  Phase: <span className="font-semibold text-indigo-600">{session.current_phase}</span> |
                  Tail Depth: {session.tail_question_depth}
               </div>
            </div>
            <div className="text-xs text-right space-y-1">
               <div>Total Events: {session.debug_events.length}</div>
            </div>
          </div>
      </CardHeader>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="events" className="h-full flex flex-col">
          <div className="px-6 pt-4">
            <TabsList>
              <TabsTrigger value="events">Timeline</TabsTrigger>
              <TabsTrigger value="testlab">Test Lab</TabsTrigger>
              <TabsTrigger value="analysis">JD Analysis</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="context">Raw Context</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="testlab" className="flex-1 p-6 overflow-hidden">
             <DebugTools />
          </TabsContent>

          <TabsContent value="events" className="flex-1 overflow-hidden p-0 m-0">
             <ScrollArea className="h-[600px] p-6">
                <div className="border-l-2 border-indigo-100 pl-6 space-y-6">
                   {session.debug_events.slice().reverse().map((evt: any, idx: number) => (
                      <div key={idx} className="relative">
                         {/* Dot */}
                         <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm
                            ${evt.type === 'stt' ? 'bg-blue-400' :
                              evt.type === 'llm' ? 'bg-purple-500' :
                              evt.type === 'rag' ? 'bg-orange-400' : 'bg-gray-400'}`}
                         />

                         <div className="flex justify-between items-start mb-1">
                            <span className={`uppercase text-xs font-bold px-2 py-0.5 rounded
                                ${evt.type === 'stt' ? 'bg-blue-100 text-blue-700' :
                                  evt.type === 'llm' ? 'bg-purple-100 text-purple-700' :
                                  evt.type === 'rag' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                               {evt.type}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                               {new Date(evt.timestamp * 1000).toLocaleTimeString()}
                            </span>
                         </div>

                         <div className="bg-white p-3 rounded border text-sm shadow-sm">
                            <div className="font-medium text-slate-800 mb-1">{evt.summary}</div>
                            {evt.payload && Object.keys(evt.payload).length > 0 && (
                               <pre className="text-xs bg-slate-50 p-2 rounded overflow-x-auto text-slate-600 mt-2">
                                  {JSON.stringify(evt.payload, null, 2)}
                               </pre>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
             </ScrollArea>
          </TabsContent>

          <TabsContent value="analysis" className="flex-1 p-6 overflow-hidden">
             <ScrollArea className="h-full">
                <div className="space-y-6">
                   {session.analysis && Object.keys(session.analysis).length > 0 ? (
                      <div className="grid gap-6">
                         <div className="p-4 bg-white border rounded-lg shadow-sm">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-2">Company Information</div>
                            <div className="text-xl font-bold text-indigo-700">{session.analysis.company || 'Unknown'}</div>
                            <div className="text-lg text-slate-700">{session.analysis.position || 'Unknown Position'}</div>
                         </div>

                          {session.analysis.description && (
                             <div className="p-4 bg-white border rounded-lg">
                                <div className="text-xs text-slate-500 uppercase font-bold mb-2">Position Description (포지션 상세)</div>
                                <div className="text-sm text-slate-600 whitespace-pre-wrap">{session.analysis.description}</div>
                             </div>
                          )}

                          {session.analysis.responsibilities && session.analysis.responsibilities.length > 0 && (
                             <div className="p-4 bg-white border rounded-lg">
                                <div className="text-xs text-slate-500 uppercase font-bold mb-2">Key Responsibilities (주요 업무)</div>
                                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                                   {session.analysis.responsibilities.map((r: string, i: number) => (
                                      <li key={i}>{r}</li>
                                   ))}
                                </ul>
                             </div>
                          )}

                         <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white border rounded-lg">
                               <div className="text-xs text-slate-500 uppercase font-bold mb-2">Tech Stack</div>
                               <div className="flex flex-wrap gap-2">
                                  {session.analysis.techStack?.map((t: string) => (
                                     <Badge key={t} variant="secondary">{t}</Badge>
                                  )) || <span className="text-slate-400 text-sm">No data</span>}
                               </div>
                            </div>
                            <div className="p-4 bg-white border rounded-lg">
                               <div className="text-xs text-slate-500 uppercase font-bold mb-2">Process</div>
                               <div className="text-sm text-slate-600">{session.analysis.process || 'No process info'}</div>
                            </div>
                         </div>

                         <div className="p-4 bg-white border rounded-lg">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-2">Qualifications</div>
                            <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                               {session.analysis.qualifications?.map((q: string, i: number) => (
                                  <li key={i}>{q}</li>
                                )) || <li>No qualifications extracted</li>}
                            </ul>
                         </div>
                      </div>
                   ) : (
                      <div className="text-center p-10 text-slate-500">
                         No structured analysis available.
                      </div>
                   )}
                </div>
             </ScrollArea>
          </TabsContent>

          <TabsContent value="questions" className="flex-1 p-6 overflow-hidden">
             <ScrollArea className="h-full">
                <div className="space-y-4">
                   <h3 className="text-lg font-bold text-slate-800">Generated Interview Questions</h3>
                   <div className="space-y-3">
                      {session.planned_questions && session.planned_questions.length > 0 ? (
                         session.planned_questions.map((q: string, i: number) => (
                            <div key={i} className="p-4 bg-white border rounded-lg shadow-sm flex gap-3">
                               <div className="font-bold text-indigo-500">Q{i+1}.</div>
                               <div className="text-slate-800 text-sm">{q}</div>
                            </div>
                         ))
                      ) : (
                         <div className="text-slate-400 italic">No questions generated yet.</div>
                      )}
                   </div>
                </div>
             </ScrollArea>
          </TabsContent>

          <TabsContent value="context" className="flex-1 p-6 overflow-hidden">
             <div className="grid grid-cols-2 gap-4 h-full">
                <Card className="h-full flex flex-col">
                   <CardHeader className="py-2"><CardTitle className="text-sm">Job Description (Raw)</CardTitle></CardHeader>
                   <ScrollArea className="flex-1 p-4 bg-muted/20 text-xs whitespace-pre-wrap">
                      {session.jd_text || "(No JD Text)"}
                   </ScrollArea>
                </Card>
                <Card className="h-full flex flex-col">
                   <CardHeader className="py-2"><CardTitle className="text-sm">Resume (Raw)</CardTitle></CardHeader>
                   <ScrollArea className="flex-1 p-4 bg-muted/20 text-xs whitespace-pre-wrap">
                      {session.resume_text || "(No Resume Text)"}
                   </ScrollArea>
                </Card>
             </div>
          </TabsContent>

          <TabsContent value="json" className="flex-1 p-6 overflow-hidden">
             <ScrollArea className="h-full">
                <pre className="text-xs font-mono bg-slate-900 text-green-400 p-4 rounded-lg">
                   {JSON.stringify(session, null, 2)}
                </pre>
             </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DebugTools() {
  const [sttFile, setSttFile] = useState<File | null>(null);
  const [sttResult, setSttResult] = useState("");
  const [sttLoading, setSttLoading] = useState(false);

  const [ttsText, setTtsText] = useState("Hello, this is a test from Dibut AI.");
  const [ttsUrl, setTtsUrl] = useState("");
  const [ttsLoading, setTtsLoading] = useState(false);

  const handleSTT = async () => {
     if (!sttFile) return;
     setSttLoading(true);
     setSttResult("");
     try {
        const formData = new FormData();
        formData.append("file", sttFile);

        const res = await fetch(`${API_BASE}/debug/stt`, {
           method: "POST",
           headers: {
              "Authorization": "Basic " + btoa(`${USERNAME}:${PASSWORD}`)
           },
           body: formData
        });
        const data = await res.json();
        setSttResult(data.text || data.error);
     } catch (e: any) {
        setSttResult("Error: " + e.message);
     } finally {
        setSttLoading(false);
     }
  };

  const handleTTS = async () => {
     if (!ttsText) return;
     setTtsLoading(true);
     setTtsUrl("");
     try {
        const res = await fetch(`${API_BASE}/debug/tts`, {
           method: "POST",
           headers: {
              "Authorization": "Basic " + btoa(`${USERNAME}:${PASSWORD}`),
              "Content-Type": "application/json"
           },
           body: JSON.stringify({ text: ttsText })
        });

        if (res.ok) {
           const blob = await res.blob();
           const url = URL.createObjectURL(blob);
           setTtsUrl(url);
        } else {
           alert("TTS Failed");
        }
     } catch (e: any) {
        alert("Error: " + e.message);
     } finally {
        setTtsLoading(false);
     }
  };

  return (
     <div className="grid grid-cols-2 gap-8 h-full">
        <Card>
           <CardHeader><CardTitle>STT Tester (Speech-to-Text)</CardTitle></CardHeader>
           <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                 <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setSttFile(e.target.files?.[0] || null)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                 />
              </div>
              <Button onClick={handleSTT} disabled={!sttFile || sttLoading}>
                 {sttLoading ? "Transcribing..." : "Transcribe"}
              </Button>
              <div className="mt-4">
                 <label className="text-sm font-medium">Result:</label>
                 <div className="mt-1 p-3 bg-slate-100 rounded-md min-h-[100px] text-sm whitespace-pre-wrap">
                    {sttResult || <span className="text-slate-400">No output yet</span>}
                 </div>
              </div>
           </CardContent>
        </Card>

        <Card>
           <CardHeader><CardTitle>TTS Tester (Text-to-Speech)</CardTitle></CardHeader>
           <CardContent className="space-y-4">
              <textarea
                 value={ttsText}
                 onChange={(e) => setTtsText(e.target.value)}
                 className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                 placeholder="Enter text to speak..."
              />
              <Button onClick={handleTTS} disabled={!ttsText || ttsLoading}>
                 {ttsLoading ? "Generating..." : "Generate Audio"}
              </Button>

              {ttsUrl && (
                 <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
                    <div className="text-xs font-bold text-indigo-600 mb-2">GENERATED AUDIO</div>
                    <audio controls src={ttsUrl} className="w-full" />
                 </div>
              )}
           </CardContent>
        </Card>
     </div>
  );
}
