import type { Settings } from "@packages/shared/types/settings";
import { InlineKeyboard } from "grammy";
import type { ZodAny } from "zod";
import { findMenuRecursively, settingsMenu } from "./settings-menu";

const isDataInSettings = (
  settings: Settings,
  targetData: string[],
): boolean => {
  const [key, ...rest] = targetData;
  const target = settings[key as keyof Settings];

  if (target == null || target === undefined) {
    return false;
  }

  if (typeof target === "object") {
    return isDataInSettings(target as Settings, rest);
  }

  const targetValue = target as ZodAny;
  if (typeof targetValue.toString === "function") {
    return rest.includes(targetValue.toString());
  }

  return false;
};

const getParentData = (data: string): string => {
  if (data === "settings") {
    return "ㄨ";
  }
  const segments = data.split("::");
  segments.pop();
  return segments.join("::") || "settings";
};

function splitIntoChunks<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}

export const createKeyboardButtons = (settings: Settings, data: string) => {
  const menuItem = findMenuRecursively(data, settingsMenu);
  if (menuItem) {
    if (menuItem.children.length > 0) {
      return menuItem.children
        .map((child) => {
          const isSelected =
            child.children.length === 0
              ? isDataInSettings(settings, child.data.split("::"))
              : false;
          const label = isSelected ? `${child.label} ✅` : `${child.label}`;
          return [label, child.data];
        })
        .map((item) => {
          const [label, data] = item;
          return InlineKeyboard.text(label, data);
        });
    }
  } else {
    return settingsMenu.children
      .map((child) => [child.label, child.data])
      .map((item) => {
        const [label, data] = item;
        return InlineKeyboard.text(label, data);
      });
  }

  return [];
};

export const createNavigationButtons = (data: string) => {
  return [
    InlineKeyboard.text("⇐ Back", getParentData(data)),
    InlineKeyboard.text("ㄨ Close", "ㄨ"),
  ];
};

export const createKeyboard = (data: string, currentSettings: Settings) => {
  const keyboardButtons = createKeyboardButtons(currentSettings, data);
  const keyboard = new InlineKeyboard().add(...createNavigationButtons(data));
  for (const row of splitIntoChunks(keyboardButtons, 2)) {
    keyboard.row(...row);
  }
  return { keyboard, hasMenu: keyboardButtons.length > 0 };
};
