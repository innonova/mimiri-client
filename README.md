# Mimiri Client

<div align="center">

![Mimiri Notes](https://mimiri.io/screenshots/windows/dark/front-page.webp)

**A secure, privacy-focused note-taking application with end-to-end encryption**

[![License: GPL v2](https://img.shields.io/badge/License-GPL%20v2-blue.svg)](https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html)
[![Privacy First](https://img.shields.io/badge/Privacy-First-success)](https://mimiri.io/privacy)
[![Discord](https://img.shields.io/discord/1296822336900567101?color=5865F2&label=Discord&logo=discord&logoColor=white&style=flat)](https://discord.gg/pg69qPAVZR)
[![Reddit](https://img.shields.io/reddit/subreddit-subscribers/mimiri?style=social)](https://www.reddit.com/r/mimiri)

[Website](https://mimiri.io) • [Documentation](https://mimiri.io/userguide) • [Web App](https://app.mimiri.io)

</div>

---

## About

Mimiri Client is the core cross-platform application for **[Mimiri Notes](https://mimiri.io)** - a secure device-synchronized notepad where you can safely store notes, confidential data, and credentials. Built with Vue.js and TypeScript, this repository serves as the foundation for all Mimiri Notes clients across web, mobile, and desktop platforms.

### Key Features

- **End-to-End Encryption** - AES-GCM-256 encryption keeps your data secure
- **Tree-Based Organization** - Hierarchical structure with unlimited nesting
- **Real-Time Sync** - Cloud synchronization across all your devices
- **Encrypted Sharing** - Collaborate securely with end-to-end encrypted sharing
- **Cross-Platform** - Available on Web, Windows, macOS, Linux, iOS, and Android
- **Privacy-First** - Zero-knowledge architecture - not even servers can read your data
- **Version History** - Full edit history with restore capability
- **Offline-First** - Local storage ensures access even without internet
- **Clean Interface** - Simple, distraction-free design optimized for productivity

## Architecture

This repository contains the **universal client codebase** that powers Mimiri Notes across all platforms:

```
┌─────────────────────────────────────────────────────────────┐
│                     mimiri-client (this repo)                │
│              Vue.js + TypeScript + Capacitor                 │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌────────┐          ┌─────────────┐      ┌──────────────┐
   │  Web   │          │   Mobile    │      │   Desktop    │
   │  App   │          │ iOS/Android │      │   Electron   │
   └────────┘          └─────────────┘      └──────────────┘
   Vite Build          Capacitor Build      Via mimiri-client-electron
```

**Related Repositories:**

- **[mimiri-client-electron](https://github.com/innonova/mimiri-client-electron)** - Electron wrapper for desktop apps (Windows, macOS, Linux)
- **[mimiri-server](https://github.com/innonova/mimiri-server)** - Backend server for sync and collaboration

## Getting Started

### Prerequisites

- **Node.js** 20+ and npm (required for Web Crypto API support in build scripts)
- **Git**
- For mobile development:
  - **iOS**: Xcode 14+ (macOS only)
  - **Android**: Android Studio with SDK 33+

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/innonova/mimiri-client.git
   cd mimiri-client
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup Environment**

   ```bash
   cp .env.example .env
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Tech Stack

- **Framework**: [Vue 3](https://vuejs.org/) with Composition API
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Mobile**: [Capacitor 7](https://capacitorjs.com/)
- **Styling**: [TailwindCSS 4](https://tailwindcss.com/)
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Real-time Sync**: [SignalR](https://dotnet.microsoft.com/apps/aspnet/signalr)
- **Local Database**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [idb](https://github.com/jakearchibald/idb)
- **Testing**: [Playwright](https://playwright.dev/)

## Contributing

We appreciate your interest in contributing to Mimiri Notes!

**Please note:** Setting up a full development environment is currently complex due to server infrastructure, RSA keys, and platform-specific build requirements. **We strongly recommend reaching out to us first** before attempting to contribute code.

The best way to get started is to **join our [Discord server](https://discord.gg/pg69qPAVZR)** where we can help guide you through the setup process and discuss how you can contribute effectively.

See our [Contributing Guidelines](CONTRIBUTING.md) for more details on how to get involved, including non-code contributions like documentation, testing, and bug reports.

## License

This project is licensed under the GNU General Public License v2.0 - see the [LICENSE](LICENSE) file for details.

## Links

- **Website**: [mimiri.io](https://mimiri.io)
- **Web App**: [app.mimiri.io](https://app.mimiri.io)
- **Documentation**: [mimiri.io/userguide](https://mimiri.io/userguide)
- **Security Details**: [mimiri.io/security](https://mimiri.io/security)
- **Download**: [mimiri.io/#downloads](https://mimiri.io/#downloads)

## Acknowledgments

Built with ❤️ by [Innonova](https://github.com/innonova) and the Mimiri community.
