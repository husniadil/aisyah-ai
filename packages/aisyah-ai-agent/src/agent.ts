import { Calculator } from "@langchain/community/tools/calculator";
import { type BaseMessage, SystemMessage } from "@langchain/core/messages";
import {
  AIMessagePromptTemplate,
  type BaseMessagePromptTemplateLike,
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { getCurrentDateTime } from "@packages/shared/time";
import { ReminderTool } from "@packages/shared/tools/reminder";
import { SonataTool } from "@packages/shared/tools/sonata";
import { StormTool } from "@packages/shared/tools/storm";
import { VisionTool } from "@packages/shared/tools/vision";
import { WhisperTool } from "@packages/shared/tools/whisper";
import type {
  IAgent,
  inputSchema,
  outputSchema,
} from "@packages/shared/types/agent";
import type { ChatHistory } from "@packages/shared/types/chat-history";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import type { StructuredTool } from "langchain/tools";
import type { z } from "zod";

interface Env {
  OPENAI_API_KEY: string;
  AGENT_SYSTEM_PROMPT: string;
  AGENT_NAME: string;
  AGENT_LLM_MODEL: string;
  AGENT_LLM_MAX_TOKENS: number;
  AGENT_LLM_TEMPERATURE: number;
  AGENT_LLM_TOP_P: number;
  AGENT_LLM_FREQUENCY_PENALTY: number;
  AGENT_LLM_PRESENCE_PENALTY: number;
  AISYAH_AI_VISION: Fetcher;
  AISYAH_AI_SONATA: Fetcher;
  AISYAH_AI_WHISPER: Fetcher;
  AISYAH_AI_REMINDER: Fetcher;
  AISYAH_AI_STORM: Fetcher;
}

export class Agent implements IAgent {
  private readonly name: string;
  private readonly llm: ChatOpenAI;
  private readonly tools: StructuredTool[] = [];
  private readonly systemPrompt: string;

  constructor(env: Env, user: string) {
    this.llm = new ChatOpenAI({
      apiKey: env.OPENAI_API_KEY,
      model: env.AGENT_LLM_MODEL,
      maxTokens: env.AGENT_LLM_MAX_TOKENS,
      temperature: env.AGENT_LLM_TEMPERATURE,
      topP: env.AGENT_LLM_TOP_P,
      frequencyPenalty: env.AGENT_LLM_FREQUENCY_PENALTY,
      presencePenalty: env.AGENT_LLM_PRESENCE_PENALTY,
      user,
    });
    this.name = env.AGENT_NAME;
    this.systemPrompt = env.AGENT_SYSTEM_PROMPT;
    this.tools.push(
      new Calculator(),
      new VisionTool(env),
      new SonataTool(env),
      new WhisperTool(env),
      new ReminderTool(env),
      new StormTool(env),
    );
  }

  private createChatPromptTemplate(): ChatPromptTemplate {
    const messages: MessagesPlaceholder[] = [
      new MessagesPlaceholder("system_message"),
      new MessagesPlaceholder("current_time"),
      new MessagesPlaceholder("chat_id"),
      new MessagesPlaceholder("message_id"),
      new MessagesPlaceholder("chat_history"),
      new MessagesPlaceholder("user_input"),
      new MessagesPlaceholder("agent_scratchpad"),
    ];
    return ChatPromptTemplate.fromMessages(messages);
  }

  private async createAgentExecutor(): Promise<AgentExecutor> {
    const agent = createToolCallingAgent({
      llm: this.llm,
      prompt: this.createChatPromptTemplate(),
      tools: this.tools,
    });
    return new AgentExecutor({ agent, tools: this.tools });
  }

  private async createChatHistoryMessages(
    chatHistory: ChatHistory,
  ): Promise<BaseMessage[]> {
    const messages: BaseMessage[] = [];
    for (const message of chatHistory) {
      const template =
        message.type === "ai"
          ? AIMessagePromptTemplate.fromTemplate("{sender}: {message}")
          : HumanMessagePromptTemplate.fromTemplate("{sender}: {message}");
      const formattedMessage = await template.format({
        sender: message.senderName,
        message: message.message,
      });
      messages.push(formattedMessage);
    }
    return messages;
  }

  private formatOutput(output: string): string {
    return output.toLowerCase().startsWith(`${this.name.toLowerCase()}: `)
      ? output.slice(this.name.length + 2)
      : output;
  }

  async chat(
    input: z.infer<typeof inputSchema>,
  ): Promise<z.infer<typeof outputSchema>> {
    const { chatId, messageId, senderName, message, chatHistory } = input;
    const userInput: BaseMessagePromptTemplateLike = [
      "human",
      `${senderName}: ${message}`,
    ];

    const agentExecutor = await this.createAgentExecutor();
    const response = await agentExecutor
      .invoke({
        system_message: new SystemMessage(this.systemPrompt),
        current_time: new SystemMessage(
          `Context: current datetime: ${getCurrentDateTime({ timeZone: "Asia/Jakarta" })}`,
        ),
        chat_id: new SystemMessage(`Context: chatId: ${chatId}`),
        message_id: new SystemMessage(`Context: messageId: ${messageId}`),
        chat_history: await this.createChatHistoryMessages(chatHistory),
        user_input: userInput,
      })
      .then((response) => this.formatOutput(response.output));

    return response;
  }
}
