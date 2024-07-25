import { Settings } from "@packages/shared/types/settings";
import { type ZodLiteralDef, z } from "zod";

type SettingMenu = {
  label: string;
  data: string;
  children: SettingMenu[];
};

const camelToSentence = (camelCase: string): string => {
  return camelCase
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
};

const createSettingsMenu = (
  schema: z.ZodTypeAny,
  parentKey = "",
): SettingMenu[] => {
  const shape = schema._def.shape ? schema._def.shape() : {};

  return Object.keys(shape).map((key) => {
    const fullKey = parentKey ? `${parentKey}::${key}` : key;
    const subSchema = shape[key];
    const label = camelToSentence(key);

    if (subSchema._def.innerType instanceof z.ZodObject) {
      return {
        label,
        data: fullKey,
        children: createSettingsMenu(subSchema._def.innerType, fullKey),
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

    if (
      subSchema._def.innerType instanceof z.ZodNativeEnum ||
      subSchema._def.innerType instanceof z.ZodEnum
    ) {
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
        subSchema._def.innerType._def.innerType instanceof z.ZodNativeEnum ||
        subSchema._def.innerType._def.innerType instanceof z.ZodEnum
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
        children: createSettingsMenu(subSchema, fullKey),
      } as SettingMenu;
    }

    return {
      label,
      data: fullKey,
      children: [],
    } as SettingMenu;
  });
};

export const findMenuRecursively = (
  data: string,
  menu: SettingMenu,
): SettingMenu | undefined => {
  for (const item of menu.children) {
    if (item.data === data) {
      return item;
    }
    if (item.children) {
      const found = findMenuRecursively(data, item);
      if (found) {
        return found;
      }
    }
  }
};

export const settingsMenu = {
  label: "Settings",
  data: "settings",
  children: createSettingsMenu(Settings),
};
