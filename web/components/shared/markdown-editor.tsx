"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import type { AnyExtension, Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import { common, createLowlight } from "lowlight";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadCommunityImage } from "@/lib/utils/upload";
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Image as ImageIcon,
  Quote,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react";
import { toast } from "sonner";
import "highlight.js/styles/github-dark.css"; // Or any style you prefer

// Initialize lowlight for syntax highlighting
const lowlight = createLowlight(common);

interface MarkdownEditorProps {
  initialContent?: string;
  onChange?: (markdown: string) => void;
  editable?: boolean;
  className?: string;
}

type MarkdownStorage = {
  markdown?: {
    getMarkdown?: () => string;
  };
};

function extractMarkdown(instance: Editor | null) {
  const storage = instance?.storage as MarkdownStorage | undefined;
  return storage?.markdown?.getMarkdown?.() ?? "";
}

export default function MarkdownEditor({
  initialContent = "",
  onChange,
  editable = true,
  className,
}: MarkdownEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default codeBlock to use Lowlight
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "javascript",
      }),
      ImageExtension.configure({
        inline: true,
        allowBase64: true,
      }),
      LinkExtension.configure({
        openOnClick: false,
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ] as AnyExtension[],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[300px] p-4",
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const files = Array.from(event.dataTransfer.files).filter((file) =>
            file.type.startsWith("image/"),
          );
          if (files.length === 0) return false;

          event.preventDefault(); // Stop default Drop

          const { schema } = view.state;
          const coordinates = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });
          const insertPos = coordinates?.pos ?? view.state.selection.from;

          void (async () => {
            let currentPos = insertPos;
            for (const file of files) {
              try {
                const url = await uploadCommunityImage(file);
                const imageNode = schema.nodes.image.create({ src: url });
                view.dispatch(view.state.tr.insert(currentPos, imageNode));
                currentPos += imageNode.nodeSize;
              } catch (error) {
                console.error(error);
                toast.error("이미지 업로드에 실패했습니다.");
              }
            }
          })();

          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []).filter(
          (item) => item.type.startsWith("image"),
        );

        if (items.length > 0) {
          event.preventDefault();

          const files = items
            .map((item) => item.getAsFile())
            .filter((file): file is File => !!file);

          if (files.length === 0) return false;

          void (async () => {
            const { schema } = view.state;
            let currentPos = view.state.selection.from;

            for (const file of files) {
              try {
                const url = await uploadCommunityImage(file);
                const imageNode = schema.nodes.image.create({ src: url });
                view.dispatch(view.state.tr.insert(currentPos, imageNode));
                currentPos += imageNode.nodeSize;
              } catch (error) {
                console.error(error);
                toast.error("이미지 업로드에 실패했습니다.");
              }
            }
          })();

          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        const markdown = extractMarkdown(editor);
        onChange(markdown);
      }
    },
  });

  // Setup initial content once mounted if needed (Tiptap handles content prop well, but good to be safe for updates)
  useEffect(() => {
    if (
      editor &&
      initialContent &&
      extractMarkdown(editor) !== initialContent
    ) {
      // Only set content if it's vastly different or empty?
      // Actually Tiptap content prop is initial content.
      // Dealing with external updates (like loading data) requires caution to not reset cursor.
      // For now, we trust initialContent logic in useEditor (initialized once).
      // If initialContent changes drastically later (like loaded from DB), we might need editor.commands.setContent()
      // But checking length to avoid reset loop.
      if (editor.getText() === "" && initialContent !== "") {
        editor.commands.setContent(initialContent);
      }
    }
  }, [initialContent, editor]);

  if (!isMounted) return null;

  if (!editor) {
    return null;
  }

  const uploadFilesAndInsert = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (imageFiles.length === 0) return;

    for (const file of imageFiles) {
      try {
        const url = await uploadCommunityImage(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch (error) {
        console.error(error);
        toast.error("이미지 업로드에 실패했습니다.");
      }
    }
  };

  // Toolbar
  const Toolbar = () => (
    <div className="border-b p-2 flex flex-wrap gap-2 items-center bg-muted/40 sticky top-0 z-10 glass">
      {/* Headings */}
      <Button
        size="icon"
        variant={
          editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"
        }
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant={
          editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"
        }
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant={
          editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"
        }
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="w-4 h-4" />
      </Button>

      <div className="w-[1px] h-6 bg-border mx-1" />

      {/* Basic formatting */}
      <Button
        size="icon"
        variant={editor.isActive("bold") ? "secondary" : "ghost"}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant={editor.isActive("italic") ? "secondary" : "ghost"}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant={editor.isActive("code") ? "secondary" : "ghost"}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="w-4 h-4" />
      </Button>

      <div className="w-[1px] h-6 bg-border mx-1" />

      {/* Lists */}
      <Button
        size="icon"
        variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="w-4 h-4" />
      </Button>

      <div className="w-[1px] h-6 bg-border mx-1" />

      {/* Image Upload Button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          if (!event.target.files?.length) return;
          void uploadFilesAndInsert(event.target.files);
          event.target.value = "";
        }}
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={() => {
          fileInputRef.current?.click();
        }}
        title="이미지 업로드"
      >
        <ImageIcon className="w-4 h-4" />
      </Button>

      {/* Code Block Language Selector - Shows only when codeBlock is active? Or always allow inserting? */}
      <div className="flex items-center gap-2 ml-2">
        <Button
          variant={editor.isActive("codeBlock") ? "default" : "outline"}
          size="sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className="h-8 font-mono text-xs"
        >
          {"</>"} Code Block
        </Button>

        {editor.isActive("codeBlock") && (
          <Select
            value={editor.getAttributes("codeBlock").language || "javascript"}
            onValueChange={(value) =>
              editor.chain().focus().setCodeBlock({ language: value }).run()
            }
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="css">CSS</SelectItem>
              <SelectItem value="sql">SQL</SelectItem>
              <SelectItem value="bash">Bash</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`${
        editable
          ? "border rounded-lg overflow-hidden bg-card"
          : "bg-transparent"
      } ${className}`}
    >
      {editable && <Toolbar />}
      <EditorContent editor={editor} />
    </div>
  );
}
