import { Settings } from "@packages/shared/types/settings";
import { InlineKeyboard } from "grammy";
import { type ZodAny, type ZodLiteralDef, any, set, z } from "zod";

type SettingMenu = {
  label: string;
  data: string;
  children: SettingMenu[];
};

export class SettingsManager {
  private settings: Settings;
  private settingsMenu: SettingMenu;

  constructor(settings: Settings) {
    this.settingsMenu = {
      label: "Settings",
      data: "settings",
      children: this.createSettingMenu(Settings),
    };
    this.settings = settings;
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
}
