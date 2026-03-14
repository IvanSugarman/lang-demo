import { ChatOpenAI } from "@langchain/openai";
import type { RuntimeConfig } from "../config/runtime-config.ts";

/**
 * 创建 ARK 对应的 LangChain 模型实例。
 * @description 通过 OpenAI 兼容协议把 LangChain 模型指向 ARK。
 * @param {RuntimeConfig} config 运行时配置
 * @return {ChatOpenAI}
 */
export function createArkModel(config: RuntimeConfig): ChatOpenAI {
  return new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.model,
    temperature: 0,
    useResponsesApi: false,
    configuration: {
      baseURL: config.baseURL,
    },
  });
}
