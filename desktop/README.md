# OpenAlice Desktop

OpenAlice Desktop 基于 OpenBB 发布的 Open Data Platform Desktop 源码，提供本地
环境、扩展、API Keys、REST/MCP 后端与 JupyterLab 管理。OpenBB 原始版权、许可证
与归属信息继续保留；OpenAlice 与 OpenBB 官方不存在赞助、背书或隶属关系。

Desktop 管理的 CLI、REST、MCP、Jupyter 与 Provider 共享同一个 Python 环境；
启动链和 Windows 验收方式见
[`DESKTOP_RUNTIME_TOOLCHAIN.zh-CN.md`](../docs/DESKTOP_RUNTIME_TOOLCHAIN.zh-CN.md)。

测试安装包发布在
[OpenAlice Releases](https://github.com/2233admin/openalice-data/releases)。当前 Windows
Beta 为未签名构建，Windows SmartScreen 可能提示未知发布者。

## Development

The ODP Desktop Application enhances the developer experience by lowering the technical barriers to entry
for building, presenting, and sharing data pipelines, insights or dashboarding experiences over multiple interfaces.

This code library represents the complete source code for the Open Data Platform (ODP) desktop application and system tray icon, as published by OpenBB.

The distributed binaries (currently macOS and Windows) are the direct output of build actions, located in this repository, responsible for generating release artifacts.

Please note that while there are no build pipelines for a Linux distribution, it is possible to build and install locally.

## User Documentation & Installation

Official user documentation is located [here](https://docs.openbb.co/desktop).

Download the latest version [here](https://github.com/OpenBB-finance/OpenBB/releases/tag/odp)

The remainder of this document is intended for orienting and onboarding to the codebase.

## OpenBB Studio

The user-facing Studio navigation and its runtime Inspector are documented in
[`STUDIO_IMPLEMENTATION.md`](./STUDIO_IMPLEMENTATION.md). Studio reuses the
existing ODP Desktop service, runtime, credential, extension, and logging
commands. Added dependency licenses are recorded in
[`THIRD_PARTY_LICENSES_STUDIO.md`](./THIRD_PARTY_LICENSES_STUDIO.md).

## Stack Overview

ODP Desktop is built with a Tauri & React framework, the code is approximately 50/50, Rust/TypeScript.

This stack reduces the distribution size by relying on the operating system for window creation.
Installed, it is approximately 35 MB; compressed, 12 MB.

The application is tray icon - background service - where functions rely on developer tools that are installed separately via ODP.
In other words, the application itself is a GUI and wrapper for interacting with the operating system and command line.

It is assumed that no developer tools are installed in the operating system, and the user does not have admin/root access to the machine.
Multi-user machines must be configured per-user.

To facilitate environment management and dependency solving, Miniforge is installed when ODP Desktop is first run.
Conda was selected for its effective isolation patterns, as well as platform and language-agnostic qualities.

The initial installation environment provides a production-ready REST API, MCP server, NodeJS, and Jupyter Lab IDE.

## Running Code

Run this code locally from a development server by following the steps below.

### Rust

You must install, or update, Rust to use version 1.90.0

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

If you have previously installed Rust, update to the latest version (currently rustc 1.90.0)

```sh
rustup update
```

### NodeJS

NodeJS and NPM must also be available on $PATH.

Follow the instructions [here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) if you do not have it installed.

If you already have `npm`, update it before installing the project.

### OpenSSL

OpenSSL must be installed on the system, with exposed environment variables for:

```env
OPENSSL_DIR
OPENSSL_INCLUDE_DIR
OPENSSL_LIB_DIR
```

### Install Project

With those three, items installed and updated, install the project by running the command from the `/desktop` root folder.

```sh
npm install
```

### Develop

Build and start the development server:

```sh
npm run tauri dev
```

This will start the development server and watch for changes to the codebase. Most changes will be picked up, but some events may require a full restart.

If you use a browser, instead of the window, to view the development server there will be stuff that just doesn't work. This is expected.

Ignore all of the warning messages for now, we'll clean those up later.

## OpenBB Studio

The normal desktop workflow is organized around five user intents:
Home, Workspaces, Data Sources, Query, and Advanced. Extensions and
Diagnostics are direct support destinations. The Home action center shows the
live OpenBB API and OpenBB MCP services together, with one handoff to
`/backends` for choosing which services to start; runtime, credential,
extension-internal, and log tools remain available through Advanced rather than
being removed.

`/data-sources/add` is the dedicated Provider installation flow. Its official
Provider catalog is a shortcut, not a restriction: custom Providers, PyPI
packages, Conda packages, routers, and other OpenBB extensions remain available
through the original `/extensions` installer. Credentials, capability
inspection, and testing continue in the selected data source.

The Studio state adapter in `src/studio/client.ts` selects the managed OpenBB
runtime and calls the existing Tauri `inspect_studio_environment` command.
The Rust adapter reads the live OpenAPI and coverage endpoints; credential
names come from the OpenBB `ProviderInterface.credentials` registry bridge and
only configured booleans are returned. Provider-native dataset identity and
declared schema fields remain the source of truth.

Workspaces are versioned, local, allow-listed records in
`src/studio/workspace-store.ts`. They contain explicit Provider-native dataset
references and mapping evidence, never credentials or secret values. P1
mapping, comparison, apply, and compatibility gates are represented as
contracts; P2 Dataset/Router/Provider generation remains an explicit handoff
to the existing OpenBB build and registry path.

Native query execution remains in `src/studio/actions.ts` and uses the
existing OpenBB REST API. Query history and diagnostics preserve the selected
dataset/Provider, safe submitted inputs, warnings, duration, row counts, and
redacted raw/error evidence.

### Verification

From `desktop/`:

```sh
npm run test -- --run
npm run build
```

For a managed OpenBB integration run, set `OPENBB_STUDIO_API_URL` and run the
opt-in integration test:

```sh
OPENBB_STUDIO_API_URL=http://127.0.0.1:6900 npm run test -- --run src/tests/integration/studio-real-provider.test.ts
```

The Rust tests require a Windows OpenSSL installation exposed through
`OPENSSL_DIR`, `OPENSSL_INCLUDE_DIR`, and `OPENSSL_LIB_DIR`. Browser previews
do not provide Tauri commands and therefore show the runtime recovery state;
use `npm run tauri dev` for the complete desktop flow.

Known P0 limitation: workspace mapping and apply/build integration are not
implemented yet. The UI preserves native sources and fails closed until the
P1 validation boundary is available.

### Dependency and license note

The Studio UI adds these npm dependencies and no Rust dependencies:

- `@tanstack/react-query` 5.101.4 — MIT
- `@tanstack/react-table` 8.21.3 — MIT
- `@tanstack/react-virtual` 3.14.9 — MIT
- `echarts` 6.1.0 — Apache-2.0

It also reuses these MIT-licensed packages already present in `package.json`:

- `@tanstack/react-router` 1.168.13
- `react-hook-form` 7.72.1
- `zod` 3.25.76

The versions and license metadata above are from the installed package
manifests; the complete transitive inventory remains `package-lock.json`.


### Helpful VS Code Extension

- rust-analyzer
- Tauri
- Tailwind CSS IntelliSense

## Building

Production builds are intended to be completed and signed via GitHub actions. Adjustments to `beforeBundleCommand` may be required for builds outside of the official release structure.

