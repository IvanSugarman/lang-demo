import type { DemoAgent } from "../agents/create-demo-agent.ts";

/**
 * 格式化最终输出。
 * @description 提取最后一条消息，统一转成字符串输出。
 * @param {Awaited<ReturnType<DemoAgent["invoke"]>>} response Agent 返回值
 * @return {string}
 */
export function formatAgentResponse(
  response: Awaited<ReturnType<DemoAgent["invoke"]>>,
): string {
  /** 最后一条消息。 */
  const lastMessage = response.messages.at(-1);

  if (lastMessage == null) {
    return "No response returned.";
  }

  if (typeof lastMessage.content === "string") {
    return lastMessage.content;
  }

  return JSON.stringify(lastMessage.content, null, 2);
}
