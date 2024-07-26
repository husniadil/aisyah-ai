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
import { ExplorerTool } from "@packages/shared/tools/explorer";
import { ReminderTool } from "@packages/shared/tools/reminder";
import { SonataTool } from "@packages/shared/tools/sonata";
import { StormTool } from "@packages/shared/tools/storm";
import { CurrentTimeTool } from "@packages/shared/tools/time";
import { VisionTool } from "@packages/shared/tools/vision";
import { WhisperTool } from "@packages/shared/tools/whisper";
import {
  type ChatInput,
  ChatOutput,
  type IAgent,
} from "@packages/shared/types/agent";
import type { ChatHistoryList } from "@packages/shared/types/chat-history";
import {
  AgentPersona,
  type AgentSettings,
} from "@packages/shared/types/settings";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import type { StructuredTool } from "langchain/tools";

interface Env {
  OPENAI_API_KEY: string;
  AGENT_LLM_MODEL: "gpt-4o-mini";
  AGENT_LLM_MAX_TOKENS: 4096;
  AGENT_LLM_TEMPERATURE: 0.7;
  AGENT_LLM_TOP_P: 1;
  AGENT_LLM_FREQUENCY_PENALTY: 0;
  AGENT_LLM_PRESENCE_PENALTY: 0;

  AGENT_PERSONA_AISYAH_DEFAULT: string;
  AGENT_PERSONA_PERSONAL_ASSISTANT: string;

  AISYAH_AI_VISION: Fetcher;
  AISYAH_AI_SONATA: Fetcher;
  AISYAH_AI_WHISPER: Fetcher;
  AISYAH_AI_REMINDER: Fetcher;
  AISYAH_AI_STORM: Fetcher;
  AISYAH_AI_EXPLORER: Fetcher;
}

export class Agent implements IAgent {
  private readonly llm: ChatOpenAI;
  private readonly tools: StructuredTool[] = [];
  private readonly personaMap: Record<AgentPersona, string>;
  private readonly persona: AgentPersona;
  private currentTimeTool: CurrentTimeTool;

  constructor(env: Env, settings: AgentSettings, user: string) {
    this.llm = new ChatOpenAI({
      apiKey: env.OPENAI_API_KEY,
      model: settings.llm?.model || env.AGENT_LLM_MODEL,
      maxTokens: settings.llm?.maxTokens || env.AGENT_LLM_MAX_TOKENS,
      temperature: settings.llm?.temperature || env.AGENT_LLM_TEMPERATURE,
      topP: settings.llm?.topP || env.AGENT_LLM_TOP_P,
      frequencyPenalty:
        settings.llm?.frequencyPenalty || env.AGENT_LLM_FREQUENCY_PENALTY,
      presencePenalty:
        settings.llm?.presencePenalty || env.AGENT_LLM_PRESENCE_PENALTY,
      user,
    });
    this.personaMap = {
      "aisyah-default": env.AGENT_PERSONA_AISYAH_DEFAULT,
      "personal-assistant": env.AGENT_PERSONA_PERSONAL_ASSISTANT,
    };
    this.persona = settings.persona || AgentPersona["Aisyah Default"];
    this.currentTimeTool = new CurrentTimeTool();
    this.tools.push(
      new Calculator(),
      this.currentTimeTool,
      new VisionTool(env.AISYAH_AI_VISION),
      new SonataTool(env.AISYAH_AI_SONATA),
      new WhisperTool(env.AISYAH_AI_WHISPER),
      new ReminderTool(env.AISYAH_AI_REMINDER),
      new StormTool(env.AISYAH_AI_STORM),
      new ExplorerTool(env.AISYAH_AI_EXPLORER),
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

  private async createToolCallingAgentExecutor(): Promise<AgentExecutor> {
    const agent = createToolCallingAgent({
      llm: this.llm,
      prompt: this.createChatPromptTemplate(),
      tools: this.tools,
    });
    return new AgentExecutor({ agent, tools: this.tools });
  }

  private async createChatHistoryMessages(
    chatHistory: ChatHistoryList,
  ): Promise<BaseMessage[]> {
    const messages: BaseMessage[] = [];
    for (const message of chatHistory) {
      const template =
        message.type === "ai"
          ? AIMessagePromptTemplate.fromTemplate(
              "[{timestamp}] {sender}: {message}",
            )
          : HumanMessagePromptTemplate.fromTemplate(
              "[{timestamp}] {sender}: {message}",
            );
      const formattedMessage = await template.format({
        sender: message.senderName,
        message: message.message,
        timestamp: message.timestamp,
      });
      messages.push(formattedMessage);
    }
    return messages;
  }

  private formatOutput(output: string): string {
    const regex = /(?:\[\d{4}-\d{2}-\d{2} \d{2}\.\d{2}\.\d{2}\] )?(?:\w+: )?/;
    return output.replace(regex, "");
  }

  async chat(input: ChatInput): Promise<ChatOutput> {
    const { chatId, messageId, senderId, senderName, message, chatHistory } =
      input;
    console.log(
      "Agent ~ chat ~ input:",
      chatId,
      messageId,
      senderId,
      senderName,
      message,
    );

    const userInput: BaseMessagePromptTemplateLike = [
      "human",
      `${senderName}: ${message}`,
    ];

    const agentExecutor = await this.createToolCallingAgentExecutor();
    const response = await agentExecutor
      .invoke({
        system_message: new SystemMessage(this.personaMap[this.persona]),
        current_time: new SystemMessage(
          `Context: current date-time: ${this.currentTimeTool.getCurrentDateTime(
            {
              timeZone: "Asia/Jakarta",
            },
          )}`,
        ),
        chat_id: new SystemMessage(`Context: chatId: ${chatId}`),
        message_id: new SystemMessage(`Context: messageId: ${messageId}`),
        chat_history: await this.createChatHistoryMessages(chatHistory),
        user_input: userInput,
      })
      .then((response) => this.formatOutput(response.output));

    return ChatOutput.parse({
      data: response,
    });
  }
}
