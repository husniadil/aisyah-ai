#!/usr/bin/env node

// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
const { execSync } = require("child_process");

if (process.argv.length < 4) {
  console.error(
    "Usage: yarn w <workspace_name> <command> [additional_args...]",
  );
  process.exit(1);
}

const [, , workspaceName, command, ...restArgs] = process.argv;

try {
  execSync(`yarn workspace ${workspaceName} ${command} ${restArgs.join(" ")}`, {
    stdio: "inherit",
  });
} catch (error) {
  console.error(`Error executing command: ${error.message}`);
  process.exit(1);
}
