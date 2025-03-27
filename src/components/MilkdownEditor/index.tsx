"use client";
import {
  useRef,
  useLayoutEffect,
  useState,
  type ReactNode,
  useEffect,
} from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Save, CodeXml, Eye } from "lucide-react";
import { Crepe } from "@milkdown/crepe";
import { editorViewOptionsCtx } from "@milkdown/kit/core";
import { replaceAll } from "@milkdown/kit/utils";
import { diagram } from "@xiangfa/milkdown-plugin-diagram";
import { math } from "@xiangfa/milkdown-plugin-math";
import { MarkdownEditor } from "@xiangfa/mdeditor";
import FloatingMenu from "@/components/FloatingMenu";
import { Button } from "@/components/Button";
import { cn } from "@/utils/style";

import "@milkdown/crepe/theme/common/style.css";
import "./style.css";

type EditorProps = {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  tools?: ReactNode;
};

function MilkdownEditor(props: EditorProps) {
  const { className, value: defaultValue, onChange, tools } = props;
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const milkdownEditorRef = useRef<HTMLDivElement>(null);
  const markdownEditorRef = useRef<HTMLDivElement>(null);
  const [milkdownEditor, setMilkdownEditor] = useState<Crepe>();
  const [markdownEditor, setMarkdownEditor] = useState<MarkdownEditor>();
  const [mode, setMode] = useState<"markdown" | "WYSIWYM">("WYSIWYM");
  const [editable, setEditable] = useState<boolean>(false);
  const [markdown, setMarkdown] = useState<string>(defaultValue);

  function handleEditable(enable: boolean) {
    milkdownEditor?.setReadonly(!enable);
    setEditable(enable);
  }

  function updateContent(content: string) {
    if (mode === "WYSIWYM") {
      if (milkdownEditor?.editor.status === "Created") {
        replaceAll(content)(milkdownEditor.editor.ctx);
      }
    } else if (mode === "markdown") {
      if (markdownEditor?.status === "create") {
        markdownEditor.update(content);
      }
    }
  }

  function changeMode(mode: "markdown" | "WYSIWYM") {
    updateContent(markdown);
    setMode(mode);
    if (!editable) handleEditable(true);
  }

  function save() {
    changeMode("WYSIWYM");
    handleEditable(false);
    onChange(markdown);
  }

  // Update editor content when external data changes, such as data streams received from a server
  useEffect(() => {
    if (mode === "WYSIWYM") {
      if (milkdownEditor?.editor.status === "Created") {
        replaceAll(defaultValue)(milkdownEditor.editor.ctx);
      }
    } else if (mode === "markdown") {
      if (markdownEditor?.status === "create") {
        markdownEditor.update(defaultValue);
      }
    }
  }, [mode, milkdownEditor, markdownEditor, defaultValue]);

  // Initialize the WYSIWYM editor
  useLayoutEffect(() => {
    const crepe = new Crepe({
      root: milkdownEditorRef.current,
      defaultValue: "",
      features: {
        [Crepe.Feature.ImageBlock]: false,
        [Crepe.Feature.Latex]: false,
      },
      featureConfigs: {
        [Crepe.Feature.Placeholder]: {
          text: t("editor.placeholder"),
        },
        [Crepe.Feature.BlockEdit]: {
          slashMenuTextGroupLabel: t("editor.text"),
          slashMenuListGroupLabel: t("editor.list"),
          slashMenuAdvancedGroupLabel: t("editor.advanced"),
          slashMenuTextLabel: t("editor.text"),
          slashMenuH1Label: t("editor.h1"),
          slashMenuH2Label: t("editor.h2"),
          slashMenuH3Label: t("editor.h3"),
          slashMenuH4Label: t("editor.h4"),
          slashMenuH5Label: t("editor.h5"),
          slashMenuH6Label: t("editor.h6"),
          slashMenuQuoteLabel: t("editor.quote"),
          slashMenuDividerLabel: t("editor.divider"),
          slashMenuBulletListLabel: t("editor.bulletList"),
          slashMenuOrderedListLabel: t("editor.orderedList"),
          slashMenuTaskListLabel: t("editor.taskList"),
          slashMenuImageLabel: t("editor.image"),
          slashMenuCodeBlockLabel: t("editor.codeBlock"),
          slashMenuTableLabel: t("editor.table"),
          slashMenuMathLabel: t("editor.math"),
        },
      },
    });
    crepe.editor.config((ctx) => {
      // Add attributes to the editor container
      ctx.update(editorViewOptionsCtx, (prev) => ({
        ...prev,
        attributes: {
          class: "milkdown-editor mx-auto outline-none",
          spellcheck: "false",
        },
      }));
    });

    crepe
      .setReadonly(true)
      .create()
      .then(() => {
        setMilkdownEditor(crepe);
      });
    crepe.editor.use(diagram).use(math);

    crepe.on((listener) => {
      listener.markdownUpdated((ctx, markdown) => {
        setMarkdown(markdown);
      });
    });

    return () => {
      crepe.destroy();
    };
  }, [t]);

  // Initialize the Markdown editor
  useLayoutEffect(() => {
    const editor = new MarkdownEditor({
      root: markdownEditorRef.current,
      defaultValue: "",
      onChange: (value) => {
        setMarkdown(value);
      },
    });

    editor.create().then(() => {
      setMarkdownEditor(editor);
    });

    return () => {
      editor.destroy();
    };
  }, []);

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div
        className={cn(
          "milkdown-editor prose prose-slate dark:prose-invert max-w-full",
          { hidden: mode !== "WYSIWYM" }
        )}
        ref={milkdownEditorRef}
      ></div>
      <div
        className={cn(
          "markdown-editor text-base whitespace-break-spaces print:hidden",
          {
            hidden: mode !== "markdown",
          }
        )}
        ref={markdownEditorRef}
      ></div>
      <FloatingMenu targetRef={containerRef} fixedTopOffset={16}>
        <div className="flex flex-col gap-1 border rounded-full py-2 p-1 bg-white/95 dark:bg-slate-800/95 print:hidden">
          {mode === "WYSIWYM" ? (
            <Button
              className="float-menu-button"
              title="Markdown"
              side="left"
              sideoffset={8}
              variant="ghost"
              onClick={() => changeMode("markdown")}
            >
              <CodeXml />
            </Button>
          ) : (
            <Button
              className="float-menu-button"
              title={t("editor.WYSIWYM")}
              side="left"
              sideoffset={8}
              variant="ghost"
              onClick={() => changeMode("WYSIWYM")}
            >
              <Eye />
            </Button>
          )}
          {editable ? (
            <Button
              className="float-menu-button"
              title={t("editor.save")}
              side="left"
              sideoffset={8}
              size="icon"
              variant="ghost"
              onClick={() => save()}
            >
              <Save />
            </Button>
          ) : (
            <Button
              className="float-menu-button"
              title={t("editor.edit")}
              side="left"
              sideoffset={8}
              size="icon"
              variant="ghost"
              onClick={() => handleEditable(true)}
            >
              <Pencil />
            </Button>
          )}
          {tools ? tools : null}
        </div>
      </FloatingMenu>
    </div>
  );
}

export default MilkdownEditor;
