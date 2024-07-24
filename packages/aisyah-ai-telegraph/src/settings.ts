import { AgentTool } from "@packages/shared/tools/agent";
import { SonataTool } from "@packages/shared/tools/sonata";
import { Settings } from "@packages/shared/types/settings";
import { type ZodAny, z } from "zod";

interface Env {
  AISYAH_AI_AGENT: Fetcher;
  AISYAH_AI_SONATA: Fetcher;
  SETTINGS: KVNamespace<string>;
}

type SettingMenu = {
  label: string;
  data: string;
  children: SettingMenu[];
};

export class SettingsManager {
  private currentSettings: Settings;
  private agentTool: AgentTool;
  private sonataTool: SonataTool;
  private SETTINGS: KVNamespace<string>;

  constructor(env: Env, currentSettings: Settings) {
    this.currentSettings = currentSettings;

    this.SETTINGS = env.SETTINGS;
    this.agentTool = new AgentTool(env.AISYAH_AI_AGENT);
    this.sonataTool = new SonataTool(env.AISYAH_AI_SONATA);
  }

  private getSchema(path: string[]): z.ZodTypeAny | null {
    let schema: z.ZodTypeAny | null = Settings;
    for (const key of path) {
      if (schema instanceof z.ZodObject && schema.shape[key]) {
        schema = schema.shape[key];
      } else if (schema instanceof z.ZodOptional) {
        schema = schema._def.innerType.shape[key];
      } else {
        return null;
      }
    }
    return schema;
  }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  private setValue(obj: any, path: string[], value: any): any {
    const key = path[0];
    if (path.length === 1) {
      obj[key] = value;
    } else {
      if (!obj[key]) {
        obj[key] = {};
      }
      obj[key] = this.setValue(obj[key], path.slice(1), value);
    }
    return obj;
  }

  private updateSettings(settings: Settings, data: string): Settings {
    const [pathStr, valueStr] = data.split("::").reduce(
      (acc, part, index, array) => {
        if (index === array.length - 1) {
          return [acc[0], part];
        }
        acc[0].push(part);
        return acc;
      },
      [[] as string[], ""],
    );

    const path = pathStr;
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    let value: any = valueStr;

    const schema = this.getSchema(path);
    if (schema && schema instanceof z.ZodOptional) {
      const innerType = schema._def.innerType;
      if (
        innerType instanceof z.ZodEnum ||
        innerType instanceof z.ZodNativeEnum
      ) {
        value = Object.values(innerType._def.values).find((v) => {
          const vZod = v as ZodAny;
          return (
            typeof vZod.toString === "function" && vZod.toString() === valueStr
          );
        });
      } else if (innerType instanceof z.ZodLiteral) {
        value = innerType._def.value;
      } else if (innerType instanceof z.ZodNumber) {
        value = Number(valueStr);
      }
    }

    const newSettings = { ...settings };
    return this.setValue(newSettings, path, value);
  }

  getCurrentSettings = () => this.currentSettings;

  async saveSetting(key: string, data: string) {
    const newSettings = this.updateSettings(this.currentSettings, data);
    const { agent, sonata, telegraph } = newSettings;
    await this.SETTINGS.put(key, JSON.stringify(telegraph));
    await this.agentTool.setSettings(key, agent);
    await this.sonataTool.setSettings(key, sonata);
  }
}
