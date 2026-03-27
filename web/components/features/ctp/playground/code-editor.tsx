"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { useRef, useEffect } from "react";

interface CodeEditorProps {
  initialCode?: string;
  value?: string; // Controlled value
  onChange?: (value: string | undefined) => void;
  readOnly?: boolean;
  activeLine?: number; // 1-based line number to highlight
  hiddenLinePatterns?: RegExp[];
  hideFromMarker?: string;
}

export function CodeEditor({
  initialCode = "",
  value,
  onChange,
  readOnly = false,
  activeLine,
  hiddenLinePatterns = [],
  hideFromMarker
}: CodeEditorProps) {
  type MonacoEditorInstance = Parameters<OnMount>[0];
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const decorationsRef = useRef<string[]>([]); // Store current decoration IDs

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Optional: Configure compiler options or custom theme here
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });
  };

  // Execution Highlight Effect
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (activeLine && activeLine > 0) {
      // Add new decoration
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
        {
          range: {
            startLineNumber: activeLine,
            startColumn: 1,
            endLineNumber: activeLine,
            endColumn: 1
          },
          options: {
            isWholeLine: true,
            className: "line-execution-highlight" // defined in global.css
            // inlineClassName: "myInlineDecoration" // if we wanted text color change
          }
        }
      ]);

      // Auto-scroll to active line if out of view (Optional, but good UX)
      editor.revealLineInCenterIfOutsideViewport(activeLine);

    } else {
      // Clear decorations if no active line
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }
  }, [activeLine]);

  // Hidden Lines Effect (for visualization/output helpers)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    const text: string = model.getValue();
    const lines: string[] = text.split("\n");
    const ranges: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }[] = [];

    let hideFromIndex: number | null = null;
    if (hideFromMarker) {
      const idx = lines.findIndex((line: string) => line.includes(hideFromMarker));
      if (idx >= 0) hideFromIndex = idx;
    }

    const matchesPattern = (line: string) => hiddenLinePatterns.some((re) => re.test(line));

    lines.forEach((line: string, idx: number) => {
      if (hideFromIndex !== null && idx >= hideFromIndex) {
        return;
      }
      if (matchesPattern(line)) {
        ranges.push({
          startLineNumber: idx + 1,
          endLineNumber: idx + 1,
          startColumn: 1,
          endColumn: 1
        });
      }
    });

    if (hideFromIndex !== null) {
      ranges.push({
        startLineNumber: hideFromIndex + 1,
        endLineNumber: lines.length,
        startColumn: 1,
        endColumn: 1
      });
    }

    // Monaco type definitions can differ by version; guard optional API at runtime.
    const setHiddenAreas = (
      editor as MonacoEditorInstance & {
        setHiddenAreas?: (
          ranges: {
            startLineNumber: number;
            startColumn: number;
            endLineNumber: number;
            endColumn: number;
          }[],
        ) => void;
      }
    ).setHiddenAreas;
    if (typeof setHiddenAreas === "function") {
      setHiddenAreas(ranges);
    }
  }, [value, hiddenLinePatterns, hideFromMarker]);

  return (
    <div className="h-full w-full min-h-[300px] rounded-md overflow-hidden border border-border/50">
      <Editor
        height="100%"
        defaultLanguage="python"
        language="python"
        defaultValue={initialCode}
        value={value}
        theme="light"
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: readOnly,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          fontFamily: "'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace",
        }}
      />
    </div>
  );
}
