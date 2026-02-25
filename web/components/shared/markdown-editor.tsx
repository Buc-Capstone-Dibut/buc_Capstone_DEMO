"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import { common, createLowlight } from "lowlight";
import { useEffect, useState } from "react";
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
import "highlight.js/styles/github-dark.css"; // Or any style you prefer

// Initialize lowlight for syntax highlighting
const lowlight = createLowlight(common);

interface MarkdownEditorProps {
  initialContent?: string;
  onChange?: (markdown: string) => void;
  editable?: boolean;
  className?: string;
}

export default function MarkdownEditor({
  initialContent = "",
  onChange,
  editable = true,
  className,
}: MarkdownEditorProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    ] as any[],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[300px] p-4",
      },
      handleDrop: (view, event, slice, moved) => {
        if (
          !moved &&
          event.dataTransfer &&
          event.dataTransfer.files &&
          event.dataTransfer.files[0]
        ) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            event.preventDefault(); // Stop default Drop
            uploadCommunityImage(file).then((url) => {
              const { schema } = view.state;
              const coordinates = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (coordinates) {
                view.dispatch(
                  view.state.tr.insert(
                    coordinates.pos,
                    schema.nodes.image.create({ src: url })
                  )
                );
              }
            });
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find((item) => item.type.startsWith("image"));

        if (imageItem) {
          event.preventDefault();
          const file = imageItem.getAsFile();
          if (file) {
            uploadCommunityImage(file).then((url) => {
              const { schema } = view.state;
              view.dispatch(
                view.state.tr.insert(
                  view.state.selection.from,
                  schema.nodes.image.create({ src: url })
                )
              );
            });
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        // @ts-ignore
        const markdown = editor.storage.markdown.getMarkdown();
        onChange(markdown);
      }
    },
  });

  // Setup initial content once mounted if needed (Tiptap handles content prop well, but good to be safe for updates)
  useEffect(() => {
    if (
      editor &&
      initialContent &&
      // @ts-ignore
      editor.storage.markdown.getMarkdown() !== initialContent
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
      <Button
        size="icon"
        variant="ghost"
        onClick={() => {
          const url = window.prompt("이미지 URL을 입력하세요:");
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }}
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
