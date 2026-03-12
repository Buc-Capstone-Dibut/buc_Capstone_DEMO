"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";  // Basic textarea for simple manual input backup
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, FileText, Loader2, Sparkles, Upload } from "lucide-react";
import { useInterviewSetupStore } from "@/store/interview-setup-store";
import { MOCK_RESUME_RESULT } from "@/mocks/interview-setup-data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function ResumeInputStep() {
    const { setResumeData, setResumePrefillSource, setStep, resumeData, resumePrefillSource } = useInterviewSetupStore();
    const [activeTab, setActiveTab] = useState("file");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const { toast } = useToast();

    // File State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Manual State (Simple structure for now to match Mock)
    // In a real app complexity would be higher.
    const [manualText, setManualText] = useState("");

    const handleImportFromMyPage = async () => {
        setIsImporting(true);
        try {
            const res = await fetch("/api/my/resume/active", { cache: "no-store" });
            const json = await res.json();

            if (!res.ok || !json?.success || !json?.data?.resumePayload) {
                throw new Error(json?.error || "활성 이력서가 없습니다.");
            }

            setResumeData({
                fileName: json.data.sourceFileName || "마이페이지 활성 이력서",
                parsedContent: json.data.resumePayload,
            });
            setResumePrefillSource("active_resume");
            setSelectedFile(null);
            setManualText("");
            setActiveTab("file");
            toast({
                title: "불러오기 완료",
                description: "마이페이지 활성 이력서를 불러왔습니다.",
            });
        } catch (error: any) {
            toast({
                title: "불러오기 실패",
                description: error?.message || "활성 이력서를 찾을 수 없습니다.",
                variant: "destructive",
            });
        } finally {
            setIsImporting(false);
        }
    };

    const handleNext = async () => {
        // If we already have data and no new file/text is selected, just proceed
        if (resumeData?.parsedContent && !selectedFile && !manualText) {
            setStep('resume-check');
            return;
        }

        setIsAnalyzing(true);

        try {
            const formData = new FormData();
            if (activeTab === 'file' && selectedFile) {
                formData.append('file', selectedFile);
            } else if (activeTab === 'text' && manualText) {
                formData.append('text', manualText);
            }

            const response = await fetch('/api/interview/parse-resume', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '이력서 분석에 실패했습니다.');
            }

            const result = await response.json();

            if (result.success) {
                setResumeData({
                    fileName: selectedFile?.name || (manualText ? "직접 입력" : "기존 이력서"),
                    parsedContent: result.data
                });
                setStep('resume-check');
            } else {
                throw new Error(result.error || '분석 중 오류가 발생했습니다.');
            }
        } catch (error: any) {
            console.error("Resume Analysis Error:", error);
            alert(error.message || "이력서 분석 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const hasExistingData = !!resumeData?.parsedContent;

    return (
        <div className="max-w-3xl mx-auto py-12 px-6">
            <div className="mb-10 text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">이력서를 등록해주세요</h1>
                <p className="text-muted-foreground text-lg">
                    PDF 파일을 업로드하거나, 핵심 경력을 직접 입력할 수 있습니다.<br />
                    입력된 내용은 면접관 AI에게 전달됩니다.
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleImportFromMyPage}
                        disabled={isImporting}
                        className="h-10"
                    >
                        {isImporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                마이페이지 이력서 불러오는 중...
                            </>
                        ) : (
                            "마이페이지에서 불러오기"
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                            window.location.href = "/resume?mode=setup";
                        }}
                        className="h-10 gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
                    >
                        <Sparkles className="w-4 h-4 text-primary" />
                        AI와 함께 새로 작성
                    </Button>
                </div>
                {resumePrefillSource === "active_resume" && (
                    <p className="text-sm text-primary font-medium">
                        마이페이지 활성 이력서가 자동으로 불러와졌습니다.
                    </p>
                )}
            </div>

            <Tabs defaultValue="file" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
                    <TabsTrigger value="file" className="text-base">파일 업로드 (PDF)</TabsTrigger>
                    <TabsTrigger value="text" className="text-base">직접 입력</TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="space-y-6">
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-xl h-80 flex flex-col items-center justify-center cursor-pointer transition-all gap-4 relative",
                            (selectedFile || hasExistingData) ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
                        )}
                        onClick={() => document.getElementById('resume-upload')?.click()}
                    >
                        <input
                            id="resume-upload"
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        {(selectedFile || hasExistingData) ? (
                            <>
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <FileText className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <p className="font-semibold text-lg">
                                        {selectedFile ? selectedFile.name : (resumeData?.fileName || "기존 이력서 데이터")}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) + " MB" : "분석 완료됨"}
                                    </p>
                                </div>
                                <Button variant="ghost" size="sm" className="absolute top-4 right-4" onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFile(null);
                                    // If needed, we could clear store data here, but safer to keep it until explicit overwrite
                                }}>
                                    변경
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="font-medium text-lg">이력서 파일을 이곳에 드래그하세요</p>
                                    <p className="text-sm text-muted-foreground">또는 클릭하여 파일 선택 (PDF, Word)</p>
                                </div>
                            </>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="text" className="space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label>간편 이력서 입력</Label>
                                <Textarea
                                    placeholder="주요 경력, 프로젝트 경험, 기술 스택 등을 자유롭게 입력해주세요."
                                    className="min-h-[300px] resize-none text-base leading-relaxed"
                                    value={manualText}
                                    onChange={(e) => setManualText(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="flex justify-between mt-10">
                <Button variant="outline" onClick={() => setStep('jd-check')} className="px-6 h-12">
                    <ArrowLeft className="mr-2 w-4 h-4" /> 이전 단계 (JD)
                </Button>

                <Button
                    size="lg"
                    className="px-8 h-12 text-base shadow-lg shadow-primary/20"
                    onClick={handleNext}
                    disabled={isAnalyzing || (activeTab === 'file' && !selectedFile && !hasExistingData) || (activeTab === 'text' && !manualText)}
                >
                    {isAnalyzing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 분석 중...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" /> 분석 및 확인
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
