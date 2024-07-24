import { AgentTool } from "@packages/shared/tools/agent";
import { SonataTool } from "@packages/shared/tools/sonata";
import { Settings } from "@packages/shared/types/settings";
import { InlineKeyboard } from "grammy";
import { type ZodAny, type ZodLiteralDef, z } from "zod";

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
  private settings: Settings;
  private readonly settingsMenu: SettingMenu;
  private agentTool: AgentTool;
  private sonataTool: SonataTool;
  private SETTINGS: KVNamespace<string>;

  constructor(env: Env, currentSettings: Settings) {
    this.settingsMenu = {
      label: "Settings",
      data: "settings",
      children: this.createSettingMenu(Settings),
    };
    this.settings = currentSettings;

    this.SETTINGS = env.SETTINGS;
    this.agentTool = new AgentTool(env.AISYAH_AI_AGENT);
    this.sonataTool = new SonataTool(env.AISYAH_AI_SONATA);
  }

  private camelToSentence(camelCase: string): string {
    return camelCase
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  }

  private createSettingMenu(
    schema: z.ZodTypeAny,
    parentKey = "",
  ): SettingMenu[] {
    const shape = schema._def.shape ? schema._def.shape() : {};

    return Object.keys(shape).map((key) => {
      const fullKey = parentKey ? `${parentKey}::${key}` : key;
      const subSchema = shape[key];
      const label = this.camelToSentence(key);

      if (subSchema._def.innerType instanceof z.ZodObject) {
        return {
          label,
          data: fullKey,
          children: this.createSettingMenu(subSchema._def.innerType, fullKey),
        } as SettingMenu;
      }

      if (subSchema._def.innerType instanceof z.ZodUnion) {
        return {
          label,
          data: fullKey,
          children: subSchema._def.innerType._def.options.map(
            (option: ZodLiteralDef) =>
              ({
                label: option.value,
                data: `${fullKey}::${option.value}`,
                children: [],
              }) as SettingMenu,
          ),
        } as SettingMenu;
      }

      if (subSchema._def.innerType instanceof z.ZodNativeEnum) {
        return {
          label,
          data: fullKey,
          children: Object.entries(subSchema._def.innerType._def.values).map(
            ([key, value]) => {
              return {
                label: key,
                data: `${fullKey}::${value}`,
                children: [],
              } as SettingMenu;
            },
          ),
        } as SettingMenu;
      }

      if (subSchema._def.innerType instanceof z.ZodOptional) {
        if (subSchema._def.innerType._def.innerType instanceof z.ZodUnion) {
          return {
            label,
            data: fullKey,
            children: subSchema._def.innerType._def.innerType._def.options.map(
              (option: ZodLiteralDef) =>
                ({
                  label: option.value,
                  data: `${fullKey}::${option.value}`,
                  children: [],
                }) as SettingMenu,
            ),
          } as SettingMenu;
        }

        if (
          subSchema._def.innerType._def.innerType instanceof z.ZodNativeEnum
        ) {
          return {
            label,
            data: fullKey,
            children: Object.entries(
              subSchema._def.innerType._def.innerType._def.values,
            ).map(([key, value]) => {
              return {
                label: key,
                data: `${fullKey}::${value}`,
                children: [],
              } as SettingMenu;
            }),
          } as SettingMenu;
        }
      }

      if (subSchema instanceof z.ZodObject) {
        return {
          label,
          data: fullKey,
          children: this.createSettingMenu(subSchema, fullKey),
        } as SettingMenu;
      }

      return {
        label,
        data: fullKey,
        children: [],
      } as SettingMenu;
    });
  }

  private findMenuRecursively(
    data: string,
    menu: SettingMenu,
  ): SettingMenu | undefined {
    for (const item of menu.children) {
      if (item.data === data) {
        return item;
      }
      if (item.children) {
        const found = this.findMenuRecursively(data, item);
        if (found) {
          return found;
        }
      }
    }
  }

  private isDataInSavedSettings(
    savedSettings: Settings,
    targetData: string[],
  ): boolean {
    const [key, ...rest] = targetData;
    const target = savedSettings[key as keyof Settings];

    if (target == null || target === undefined) {
      return false;
    }

    if (typeof target === "object") {
      return this.isDataInSavedSettings(target as Settings, rest);
    }

    const targetValue = target as ZodAny;
    if (typeof targetValue.toString === "function") {
      return rest.includes(targetValue.toString());
    }

    return false;
  }

  private getParentData(data: string): string {
    if (data === "settings") {
      return "ㄨ";
    }
    const segments = data.split("::");
    segments.pop();
    return segments.join("::") || "settings";
  }

  private createSettingsMenu(
    settings: Settings,
    data: string,
  ): [string, string][] {
    const menuItem = this.findMenuRecursively(data, this.settingsMenu);
    if (menuItem) {
      if (menuItem.children.length > 0) {
        return menuItem.children.map((child) => {
          const isSelected =
            child.children.length === 0
              ? this.isDataInSavedSettings(settings, child.data.split("::"))
              : false;
          const label = isSelected ? `${child.label} ✅` : `${child.label}`;
          return [label, child.data];
        });
      }
    } else {
      return this.settingsMenu.children.map((child) => [
        child.label,
        child.data,
      ]);
    }

    return [];
  }

  private createNavigationButtons(data: string) {
    return [
      InlineKeyboard.text("⇐ Back", this.getParentData(data)),
      InlineKeyboard.text("ㄨ Close", "ㄨ"),
    ];
  }

  private splitIntoChunks<T>(array: T[], chunkSize: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    return result;
  }

  public createKeyboard(data: string) {
    const keyboardButtons = this.createSettingsMenu(this.settings, data).map(
      (item) => {
        const [label, data] = item;
        return InlineKeyboard.text(label, data);
      },
    );
    const keyboard = new InlineKeyboard().add(
      ...this.createNavigationButtons(data),
    );
    for (const row of this.splitIntoChunks(keyboardButtons, 2)) {
      keyboard.row(...row);
    }
    return { keyboard, hasMenu: keyboardButtons.length > 0 };
  }

  updateSettings(settings: Settings, data: string): Settings {
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

    // Function to get the schema for a given path
    function getSchema(path: string[]): z.ZodTypeAny | null {
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

    // Get the schema for the given path
    const schema = getSchema(path);
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

    // Recursive function to set the value in the object
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    function setValue(obj: any, path: string[], value: any): any {
      const key = path[0];
      if (path.length === 1) {
        obj[key] = value;
      } else {
        if (!obj[key]) {
          obj[key] = {};
        }
        obj[key] = setValue(obj[key], path.slice(1), value);
      }
      return obj;
    }

    // Create a new object to avoid mutating the original settings
    const newSettings = { ...settings };
    return setValue(newSettings, path, value);
  }

  public async saveSetting(key: string, data: string) {
    const newSettings = this.updateSettings(this.settings, data);
    const { agent, sonata, telegraph } = newSettings;
    await this.SETTINGS.put(key, JSON.stringify(telegraph));
    await this.agentTool.setSettings(key, agent);
    await this.sonataTool.setSettings(key, sonata);
  }
}
