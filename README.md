# CamiApp 📱🦎

> **Native mobile chat client for [OpenClaw](https://github.com/openclaw/openclaw)** — your AI assistant in your pocket.

Built with [Expo](https://expo.dev). Powered by [expo-openclaw-chat](https://github.com/brunobar79/expo-openclaw-chat) SDK by [@brunobar79](https://github.com/brunobar79).

Sister project of [OpenCami](https://github.com/robbyczgw-cla/opencami) (web client).

## ✨ Features

- 💬 Real-time chat with OpenClaw Gateway
- 🎭 Persona Picker (20 AI personalities)
- 🎨 Model Selector
- 🔊 Voice Playback (TTS)
- 📌 Pinned Sessions
- 📏 Adjustable Text Size
- 🖼️ Image Attachments
- 🦎 Chameleon Theme (light/dark)
- 🔔 Push Notifications
- 📱 Native Android & iOS

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/robbyczgw-cla/camiapp.git
cd camiapp

# Install
npm install

# Configure
cp .env.example .env.local
# Edit with your Gateway URL and token

# Run on device
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone.

## ⚙️ Configuration

Create `.env.local`:
```bash
GATEWAY_URL=wss://your-gateway.example.com
GATEWAY_TOKEN=your-auth-token
```

## 🏗️ Tech Stack

- **[Expo](https://expo.dev)** — React Native framework
- **[expo-openclaw-chat](https://github.com/brunobar79/expo-openclaw-chat)** — Gateway WebSocket SDK by [@brunobar79](https://github.com/brunobar79)
- **TypeScript** — Type safety
- **React Native** — Native UI components

## 🗺️ Roadmap

- [x] 💬 Basic chat with Gateway connection
- [x] 🦎 Chameleon Theme (light/dark)
- [ ] 🎭 Persona Picker
- [ ] 🎨 Model Selector
- [ ] 🔊 Voice Playback (TTS)
- [ ] 📌 Pin Sessions
- [ ] 📏 Text Size Settings
- [ ] 🖼️ Image Attachments
- [ ] 📋 Session Management (list, create, delete)
- [ ] 🔔 Push Notifications
- [ ] 📝 Markdown Rendering
- [ ] 🔍 Search

## 🙏 Credits

This project wouldn't exist without these amazing open-source projects:

- **[expo-openclaw-chat](https://github.com/brunobar79/expo-openclaw-chat)** by [Bruno Barbieri](https://github.com/brunobar79) — The Gateway SDK that powers all communication between CamiApp and OpenClaw. CamiApp uses this as a dependency, not a fork.
- **[OpenClaw](https://github.com/openclaw/openclaw)** — The AI gateway that makes it all possible.
- **[Expo](https://expo.dev)** — React Native framework for building native apps.
- **[OpenCami](https://github.com/robbyczgw-cla/opencami)** — Web client sister project, built on [WebClaw](https://github.com/ibelick/webclaw) by [Julien Thibeaut](https://github.com/ibelick).

See [CREDITS.md](CREDITS.md) for full attribution details.

## 📄 License

MIT — See [LICENSE](LICENSE)

---

📱 Built with 💚 as a companion to [OpenCami](https://opencami.xyz)
