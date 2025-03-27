import { useState } from "react";
import { streamText, smoothStream } from "ai";
import { parsePartialJson } from "@ai-sdk/ui-utils";
import { useTranslation } from "react-i18next";
import Plimit from "p-limit";
import { toast } from "sonner";
import { useModelProvider } from "@/hooks/useAiProvider";
import { useTaskStore } from "@/store/task";
import { useHistoryStore } from "@/store/history";
import { useSettingStore } from "@/store/setting";
import {
  getSystemPrompt,
  getOutputGuidelinesPrompt,
  generateQuestionsPrompt,
  generateSerpQueriesPrompt,
  processSearchResultPrompt,
  reviewSerpQueriesPrompt,
  writeFinalReportPrompt,
  getSERPQuerySchema,
} from "@/utils/deep-research";
import { parseError } from "@/utils/error";
import { pick, flat } from "radash";

function getResponseLanguagePrompt(lang: string) {
  return `**Respond in ${lang}**`;
}

function removeJsonMarkdown(text: string) {
  text = text.trim();
  if (text.startsWith("```json")) {
    text = text.slice(7);
  } else if (text.startsWith("json")) {
    text = text.slice(4);
  } else if (text.startsWith("```")) {
    text = text.slice(3);
  }
  if (text.endsWith("```")) {
    text = text.slice(0, -3);
  }
  return text.trim();
}

function handleError(error: unknown) {
  const errorMessage = parseError(error);
  toast.error(errorMessage);
}

function useDeepResearch() {
  const { t } = useTranslation();
  const taskStore = useTaskStore();
  const { createProvider } = useModelProvider();
  const [status, setStatus] = useState<string>("");

  async function askQuestions() {
    const { thinkingModel, language } = useSettingStore.getState();
    const { question } = useTaskStore.getState();
    setStatus(t("research.common.thinking"));
    const provider = createProvider("google");
    const result = streamText({
      model: provider(thinkingModel),
      system: getSystemPrompt(),
      prompt: [
        generateQuestionsPrompt(question),
        getResponseLanguagePrompt(language),
      ].join("\n\n"),
      experimental_transform: smoothStream(),
      onError: handleError,
    });
    let content = "";
    taskStore.setQuestion(question);
    for await (const textPart of result.textStream) {
      content += textPart;
      taskStore.updateQuestions(content);
    }
  }

  async function runSearchTask(queries: SearchTask[]) {
    const { language } = useSettingStore.getState();
    setStatus(t("research.common.research"));
    const plimit = Plimit(1);
    for await (const item of queries) {
      await plimit(async () => {
        let content = "";
        const sources: Source[] = [];
        taskStore.updateTask(item.query, { state: "processing" });
        const provider = createProvider("google");
        const searchResult = streamText({
          model: provider("gemini-2.0-flash-exp", { useSearchGrounding: true }),
          system: getSystemPrompt(),
          prompt: [
            processSearchResultPrompt(item.query, item.researchGoal),
            getResponseLanguagePrompt(language),
          ].join("\n\n"),
          experimental_transform: smoothStream(),
          onError: handleError,
        });
        for await (const part of searchResult.fullStream) {
          if (part.type === "text-delta") {
            content += part.textDelta;
            taskStore.updateTask(item.query, { learning: content });
          } else if (part.type === "reasoning") {
            console.log("reasoning", part.textDelta);
          } else if (part.type === "source") {
            sources.push(part.source);
          }
        }
        taskStore.updateTask(item.query, { state: "completed", sources });
        return content;
      });
    }
  }

  async function reviewSearchResult() {
    const { thinkingModel, language } = useSettingStore.getState();
    const { query, tasks, suggestion } = useTaskStore.getState();
    setStatus(t("research.common.research"));
    const learnings = tasks.map((item) => item.learning);
    const provider = createProvider("google");
    const result = streamText({
      model: provider(thinkingModel),
      system: getSystemPrompt(),
      prompt: [
        reviewSerpQueriesPrompt(query, learnings, suggestion),
        getResponseLanguagePrompt(language),
      ].join("\n\n"),
      experimental_transform: smoothStream(),
      onError: handleError,
    });

    const querySchema = getSERPQuerySchema();
    let content = "";
    let queries = [];
    for await (const textPart of result.textStream) {
      content += textPart;
      const data: PartialJson = parsePartialJson(removeJsonMarkdown(content));
      if (
        querySchema.safeParse(data.value) &&
        data.state === "successful-parse"
      ) {
        if (data.value) {
          queries = data.value.map(
            (item: { query: string; researchGoal: string }) => ({
              state: "unprocessed",
              learning: "",
              ...pick(item, ["query", "researchGoal"]),
            })
          );
        }
      }
    }
    if (queries.length > 0) {
      taskStore.update([...tasks, ...queries]);
      await runSearchTask(queries);
    }
  }

  async function writeFinalReport() {
    const { thinkingModel, language } = useSettingStore.getState();
    const { query, tasks, setId, setTitle, setSources } =
      useTaskStore.getState();
    const { save } = useHistoryStore.getState();
    setStatus(t("research.common.writing"));
    const learnings = tasks.map((item) => item.learning);
    const provider = createProvider("google");
    const result = streamText({
      model: provider(thinkingModel),
      system: [getSystemPrompt(), getOutputGuidelinesPrompt()].join("\n\n"),
      prompt: [
        writeFinalReportPrompt(query, learnings),
        getResponseLanguagePrompt(language),
      ].join("\n\n"),
      experimental_transform: smoothStream(),
      onError: handleError,
    });
    let content = "";
    for await (const textPart of result.textStream) {
      content += textPart;
      taskStore.updateFinalReport(content);
    }
    const title = content
      .split("\n\n")[0]
      .replaceAll("#", "")
      .replaceAll("**", "")
      .trim();
    setTitle(title);
    const sources = flat(
      tasks.map((item) => (item.sources ? item.sources : []))
    );
    setSources(sources);
    const id = save(taskStore.backup());
    setId(id);
    return content;
  }

  async function deepResearch() {
    const { thinkingModel, language } = useSettingStore.getState();
    const { query } = useTaskStore.getState();
    setStatus(t("research.common.thinking"));
    try {
      let queries = [];
      const provider = createProvider("google");
      const result = streamText({
        model: provider(thinkingModel),
        system: getSystemPrompt(),
        prompt: [
          generateSerpQueriesPrompt(query),
          getResponseLanguagePrompt(language),
        ].join("\n\n"),
        experimental_transform: smoothStream(),
        onError: handleError,
      });

      const querySchema = getSERPQuerySchema();
      let content = "";
      for await (const textPart of result.textStream) {
        content += textPart;
        const data: PartialJson = parsePartialJson(removeJsonMarkdown(content));
        if (querySchema.safeParse(data.value)) {
          if (
            data.state === "repaired-parse" ||
            data.state === "successful-parse"
          ) {
            if (data.value) {
              queries = data.value.map(
                (item: { query: string; researchGoal: string }) => ({
                  state: "unprocessed",
                  learning: "",
                  ...pick(item, ["query", "researchGoal"]),
                })
              );
              taskStore.update(queries);
            }
          }
        }
      }
      await runSearchTask(queries);
    } catch (err) {
      console.error(err);
    }
  }

  return {
    status,
    deepResearch,
    askQuestions,
    runSearchTask,
    reviewSearchResult,
    writeFinalReport,
  };
}

export default useDeepResearch;
