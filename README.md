# CamiApp 📱🦎

> **Native mobile chat client for [OpenClaw](https://github.com/openclaw/openclaw)** — your AI assistant in your pocket.

Built with [Expo](https://expo.dev) and [expo-openclaw-chat](https://github.com/brunobar79/expo-openclaw-chat) SDK.

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

Scan the QR code with **Expo Go** app on your phone.

## ⚙️ Configuration

Create `.env.local`:
```bash
GATEWAY_URL=wss://your-gateway.example.com
GATEWAY_TOKEN=your-auth-token
```

## 🏗️ Tech Stack

- **Expo** — React Native framework
- **expo-openclaw-chat** — Gateway WebSocket SDK by [@brunobar79](https://github.com/brunobar79)
- **TypeScript** — Type safety
- **React Native** — Native UI

## 🙏 Credits

- **[expo-openclaw-chat](https://github.com/brunobar79/expo-openclaw-chat)** by [Bruno Barbieri](https://github.com/brunobar79) — Gateway SDK that powers the connection
- **[OpenClaw](https://github.com/openclaw/openclaw)** — The AI gateway
- **[OpenCami](https://github.com/robbyczgw-cla/opencami)** — Web client (sister project)

## 📄 License

MIT
