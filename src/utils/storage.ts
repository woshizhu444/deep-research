import localforage from "localforage";

export const researchStore = localforage.createInstance({
  name: "DeepResearch",
  storeName: "researchStore",
  description: "Stores the history and results of in-depth research.",
});
