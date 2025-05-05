# LLM Financial Fraud Detection

A React Native mobile application that leverages machine learning and natural language processing to detect potential financial fraud using transformer models.

## Features

- Real-time fraud detection using transformer models
- Cross-platform support (iOS and Android)
- ONNX runtime integration for efficient model inference
- Modern and intuitive user interface
- Offline capability with local model processing

## Prerequisites

- Node.js (LTS version)
- Yarn package manager
- Expo CLI
- iOS development environment (for iOS development)
- Android development environment (for Android development)

## Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd llm-financial-fraud
```

2. Install dependencies:

```bash
yarn install
```

3. Install iOS dependencies (iOS only):

```bash
cd ios && pod install && cd ..
```

## Running the Application

### Development

Start the development server:

```bash
yarn start
```

### Platform-specific

Run on iOS:

```bash
yarn ios
```

Run on Android:

```bash
yarn android
```

Run on Web:

```bash
yarn web
```

## Project Structure

```
├── app/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Screen components
│   ├── utils/          # Utility functions
│   └── views/          # View components
├── assets/            # Static assets
├── src/              # Source code
└── patches/          # Patch files for dependencies
```

## Dependencies

Key dependencies include:

- React Native
- Expo
- ONNX Runtime
- React Native Transformers
- Async Storage
- Axios
- React Native Gesture Handler
- React Native Reanimated

## Development

The project uses TypeScript for type safety and better development experience. Make sure to:

1. Follow the TypeScript configurations in `tsconfig.json`
2. Use proper type definitions for components and functions
3. Follow the existing code structure and patterns

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- React Native community
- Expo team
- ONNX Runtime team
