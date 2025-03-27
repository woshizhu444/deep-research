interface Source {
  sourceType: "url";
  id: string;
  url: string;
  title?: string;
}

interface SearchTask {
  state: "unprocessed" | "processing" | "completed";
  query: string;
  researchGoal: string;
  learning: string;
  sources: Source[];
}

interface Source {
  title?: string;
  url: string;
}

interface ResearchHistory {
  id: string;
  createdAt: number;
  updatedAt?: number;
  title: string;
  question: string;
  questions: string;
  finalReport: string;
  query: string;
  suggestion: string;
  tasks: SearchTask[];
  sources: Source[];
  feedback: string;
}

interface PartialJson {
  value: JSONValue | undefined;
  state:
    | "undefined-input"
    | "successful-parse"
    | "repaired-parse"
    | "failed-parse";
}
