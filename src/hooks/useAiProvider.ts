import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { useSettingStore } from "@/store/setting";
import { shuffle } from "radash";

export function useModelProvider() {
  const { apiKey = "", apiProxy, accessPassword } = useSettingStore();

  function createProvider(type: "google") {
    const apiKeys = shuffle(apiKey.split(","));

    if (type === "google") {
      return createGoogleGenerativeAI(
        apiKeys[0]
          ? {
              baseURL: `${
                apiProxy || "https://generativelanguage.googleapis.com"
              }/v1beta`,
              apiKey: apiKeys[0],
            }
          : {
              baseURL: "/api/ai/google/v1beta",
              apiKey: accessPassword,
            }
      );
    } else {
      throw new Error("Unsupported Provider: " + type);
    }
  }

  return {
    createProvider,
  };
}
