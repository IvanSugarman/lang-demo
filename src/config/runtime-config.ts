/**
 * 运行时配置。
 */
export type RuntimeConfig = {
  /** ARK API Key。 */
  apiKey: string;
  /** ARK 模型标识。 */
  model: string;
  /** ARK OpenAI 兼容地址。 */
  baseURL: string;
  /** 用户输入的问题。 */
  prompt: string;
  /** 是否启用 LangSmith tracing。 */
  tracingEnabled: boolean;
  /** LangSmith 项目名。 */
  langsmithProject: string;
  /** Tavily API Key。 */
  tavilyApiKey: string;
};

/**
 * 默认的用户问题。
 */
const DEFAULT_PROMPT =
  "请设计一个最小的 TypeScript 工具函数，并说明你会采用的项目目录结构。";

/**
 * ARK Coding Plan 的默认模型标识。
 */
const DEFAULT_ARK_MODEL = "ark-code-latest";

/**
 * 根据环境变量读取配置。
 * @return {RuntimeConfig}
 */
export function readRuntimeConfig(): RuntimeConfig {
  /** ARK API Key。 */
  const apiKey = process.env.ARK_API_KEY ?? "";
  /** ARK 模型名。 */
  const model = process.env.ARK_CODING_MODEL ?? DEFAULT_ARK_MODEL;
  /** ARK 兼容接口地址。 */
  const baseURL = process.env.ARK_BASE_URL ?? "";
  /** 当前会话的用户问题。 */
  const prompt = process.argv.slice(2).join(" ").trim() || DEFAULT_PROMPT;
  /** 是否启用 LangSmith tracing。 */
  const tracingEnabled = process.env.LANGSMITH_TRACING === "true";
  /** LangSmith 项目名。 */
  const langsmithProject = process.env.LANGSMITH_PROJECT ?? "default";
  /** Tavily API Key。 */
  const tavilyApiKey = process.env.TAVILY_API_KEY ?? "";

  return {
    apiKey,
    model,
    baseURL,
    prompt,
    tracingEnabled,
    langsmithProject,
    tavilyApiKey,
  };
}

/**
 * 校验运行所需的环境变量。
 * @description 缺少关键配置时直接抛错，避免把错误带到模型调用阶段。
 * @param {RuntimeConfig} config 运行时配置
 * @return {void}
 */
export function assertRuntimeConfig(config: RuntimeConfig): void {
  if (config.apiKey && config.baseURL) {
    return;
  }

  throw new Error(
    [
      "Missing ARK_API_KEY or ARK_BASE_URL.",
      "Example:",
      "ARK_API_KEY=your-api-key ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/coding/v3 npm run demo",
    ].join("\n"),
  );
}
