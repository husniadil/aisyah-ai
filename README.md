
# 🌟 Cloudflare Workers Monorepo Project Template 🌟

<p align="center">
<img align="left" src="https://github.com/user-attachments/assets/9eee11a7-f404-460f-a2f9-65dddc04d1dd" width="256" alt="logo" />
</p>

### 🚀 Overview

Welcome to the **Cloudflare Workers Monorepo Project Template**! This repository provides a structured environment for developing, testing, and deploying Cloudflare Workers using a monorepo setup managed with Yarn workspaces. The project includes shared utilities and a worker template to expedite your serverless application development workflow.

### 🎯 Goal

The primary goal of this project is to offer a robust framework for creating and deploying serverless functions using Cloudflare Workers. It aims to provide a seamless development experience with shared resources, TypeScript support, and automated deployment scripts.

### 🎨 Purpose

The purpose of this repository is to:
- 🏎️ Enable fast and efficient development of serverless applications via Cloudflare Workers.
- 🔄 Promote code reuse through shared utilities.
- 🛠️ Simplify the development and deployment process with comprehensive configurations and tools.

### 🗂️ Repository Structure

```plaintext
cloudflare-workers-monorepo/
├── package.json
├── tsconfig.json
└── packages
    ├── shared
    │   ├── index.ts
    │   ├── package.json
    │   └── random.ts
    └── worker-template
        ├── .dev.vars
        ├── package.json
        ├── tsconfig.json
        ├── worker-configuration.d.ts
        ├── wrangler.toml
        └── src
            └── index.ts
```

#### 🔑 Key Directories and Files

- **`package.json`**: Root package management with Yarn workspaces. Includes scripts for various tasks.
- **`tsconfig.json`**: TypeScript configuration for the entire monorepo.
- **`packages/shared`**: This is an example of shared library packages.
- **`packages/worker-template`**: This is an example of a worker.
  - **`.dev.vars`**: Store local development secrets.
  - **`src/index.ts`**: Example worker function that utilizes shared utilities.
  - **`worker-configuration.d.ts`**: Generated environment bindings configuration.
  - **`package.json`**: Worker package management. Set your worker name here.
  - **`wrangler.toml`**: Cloudflare Worker configuration file.

You can import dependencies from local packages using the `@packages/<package_name>` alias. For example:
```javascript
import { generateRandomNumber, generateRandomString } from "@packages/shared";
```

#### 🌱 Creating a New Package/Worker

If you want to create a new package or worker, you can copy the `worker-template` folder and adjust the names in both `package.json` and `wrangler.toml`. This approach avoids the need to run `yarn create cloudflare` and set up everything from scratch.

### 🚀 Getting Started

#### 🛠️ Prerequisites

- 🧶 Yarn (v4.3.1)
- 🔧 Node.js
- ☁️ Cloudflare Account (for deploying workers)

#### 🏗️ Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/husniadil/cloudflare-workers-monorepo-project-template
   cd cloudflare-workers-monorepo-project-template
   ```

2. Install dependencies:
   ```bash
   yarn
   ```

You can alternatively create a new repository by using GitHub's "**Use this template**" feature, located at the top right corner.

<img width="203" alt="image" src="https://github.com/user-attachments/assets/8e2a23d7-1eeb-42b6-8d94-3e6c70274586" />

#### 👩‍💻 Development

In the root `package.json`, several scripts are defined for managing the monorepo and Cloudflare Workers projects:

- **`yarn w <workspace_name> <command> [additional_args...]`**: A custom script to run a command in a specific workspace.
- **`yarn deploy`**: Deploy all workspaces using Wrangler.
- **`yarn types`**: Generate Cloudflare Workers type definitions for all workspaces.
- **`yarn format`**: Format the codebase using Biome.

#### 📝 Usage

1. **Run a command in a specific workspace**:
   ```sh
   yarn w worker-template dev
   ```

2. **Deploy all workers**:
   ```sh
   yarn deploy
   ```

3. **Generate type definitions for Cloudflare Workers**:
   ```sh
   yarn types
   ```

4. **Format the codebase**:
   ```sh
   yarn format
   ```

### ⚙️ Configuration in `wrangler.toml`

The `wrangler.toml` file is used to configure Cloudflare Workers. Below is a detailed breakdown of its contents:

- **`name`**: The name of the worker.
- **`compatibility_flags`**: Compatibility flags for specific features.
- **`node_compat`**: Enable Node.js compatibility.

#### 🔧 Default Configuration (local and dev environment)

```toml
name = "worker-template"
main = "src/index.ts"
compatibility_date = "2024-07-12"
compatibility_flags = ["nodejs_compat"]

vars = { ENVIRONMENT = "dev", KEY = "value" }
kv_namespaces = [
  # Run yarn w worker-template wrangler kv:namespace create MY_KV_NAMESPACE, then copy the ID here
  { binding = "MY_KV_NAMESPACE", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
]
```

#### 🔧 Staging Configuration

```toml
[env.staging]
workers_dev = true
vars = { ENVIRONMENT = "staging", KEY = "value" }
kv_namespaces = [
   # Run yarn w worker-template wrangler kv:namespace create MY_KV_NAMESPACE --env staging, then copy the ID here
   { binding = "MY_KV_NAMESPACE", id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy" },
]
```

#### 🔧 Production Configuration

```toml
[env.production]
workers_dev = true
vars = { ENVIRONMENT = "production", KEY = "value" }
# Run yarn w worker-template wrangler kv:namespace create MY_KV_NAMESPACE --env production, then copy the ID here
kv_namespaces = [
  { binding = "MY_KV_NAMESPACE", id = "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz" },
]
```

#### 🔑 Setting Secrets for Different Environments

To set a secret key for the appropriate environment, run the following commands. These commands will prompt you to input the secret value in the command line.

#### Setup for Dev (Remote)
```sh
yarn w worker-template wrangler secret put SECRET_KEY
```

#### Setup for Staging (Remote)
```sh
yarn w worker-template wrangler secret put SECRET_KEY -e staging
```

#### Setup for Production (Remote)
```sh
yarn w worker-template wrangler secret put SECRET_KEY -e production
```

#### Local Development
For secrets used only in local development (not to be confused with the secrets used in the “dev” environment), set the secret key as follows. **This step is required** because it will be used for typing (auto-generated after executing `yarn types`). You can put this default value into the `packages/<package_name>/.dev.vars` file, in this example `packages/worker-template/.dev.vars`. **Don’t worry**, it will not overwrite the remote secret keys.
```sh
SECRET_KEY="value"
```

#### 📤 Deployment

To deploy a worker, run the following command:

```sh
# dev environment
# https://worker-template.<your-account-name>.workers.dev
yarn w worker-template wrangler deploy

# staging environment
# https://worker-template-staging.<your-account-name>.workers.dev
yarn w worker-template wrangler deploy --env staging

# production environment
# https://worker-template-production.<your-account-name>.workers.dev
yarn w worker-template wrangler deploy --env production
```

#### 🔧 Biome VS Code Extension

For better development experience, you can install the Biome extension for Visual Studio Code. This extension helps with code formatting and linting directly within your editor.

- [Install Biome VS Code Extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)

### 🤝 Contributing

We welcome contributions! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Ensure the code passes linting and formatting checks.
5. Submit a pull request.

### 📜 License

This project is licensed under the MIT License. See the LICENSE file for more details.

### 🙌 Acknowledgments

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Wrangler](https://developers.cloudflare.com/workers/cli-wrangler)
- [TypeScript](https://www.typescriptlang.org/)
- [Yarn](https://yarnpkg.com/)
- [Biome](https://biomejs.dev/)
- [VS Code](https://code.visualstudio.com/)

Feel free to explore, extend, and customize the configuration to fit your use case. Happy coding!
