# mobile-app-v2
# Spending Tracker Mobile App

A React Native mobile application for tracking spending and managing bank connections, built with Expo.

## Tech Stack

- React Native with Expo (v52.0.0)
- TypeScript for type safety
- Supabase for backend services
- TrueLayer for bank integration
- React Navigation for routing
- React Native Paper for UI components
- React Native Chart Kit for visualizations
- Expo Notifications for push notifications
- Jest and React Testing Library for testing

## Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for Mac users) or Android Studio (for Android development)
- [Expo Go](https://expo.dev/client) app on your physical device (optional, for testing)
- Supabase account for backend services
- TrueLayer account for bank integration

## Setup

1. Clone the repository:

```bash
git clone https://github.com/beny2783/mobile-app-v2.git
cd spending-tracker-v2
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_ENCRYPTION_KEY=your_32_byte_secret_key
EXPO_PUBLIC_OAUTH_REDIRECT_URL=spendingtracker://auth/callback
EXPO_PUBLIC_TRUELAYER_CLIENT_ID=your_truelayer_client_id
EXPO_PUBLIC_TRUELAYER_CLIENT_SECRET=your_truelayer_client_secret
EXPO_PUBLIC_TRUELAYER_REDIRECT_URI=spendingtracker://auth/callback
EXPO_PROJECT_ID=your_expo_project_id
```

4. Set up Supabase:

   - Create a new Supabase project
   - Set up the required database tables (see `/supabase` directory for schema)
   - Update the `.env` file with your Supabase credentials

5. Set up TrueLayer:
   - Create a TrueLayer account
   - Configure OAuth settings
   - Update the `.env` file with your TrueLayer credentials

## Running the App

1. Start the development server:

```bash
npm start
```

2. Run on specific platforms:

- iOS: `npm run ios`
- Android: `npm run android`
- Web: `npm run web`

## Development Scripts

- `npm start` - Start the Expo development server (runs tests first)
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run prepare` - Install Husky git hooks
- `npm run lint-staged` - Run linters on staged files

## Features

- Bank account connection via TrueLayer
  - Secure OAuth authentication
  - Real-time balance updates
  - Transaction history
- Spending tracking and analytics
  - Categorized transactions
  - Spending trends
  - Budget tracking
- Push notifications
  - Balance alerts
  - Budget warnings
  - Transaction notifications
- Secure data storage
  - Encrypted sensitive data
  - Secure key storage
- Interactive charts and visualizations
  - Spending breakdown
  - Monthly trends
  - Category analysis

## Testing

The project uses Jest and React Testing Library for testing. Run tests with:

```bash
npm test
```

Test files are located next to the components they test with the `.test.tsx` extension.

## Code Quality

- ESLint and Prettier are configured for code quality
- Pre-commit hooks using Husky ensure code quality
- TypeScript for type safety
- Continuous Integration via GitHub Actions
- Automated testing on pull requests

## Project Structure

- `/src` - Main source code
  - `/components` - Reusable React components
  - `/screens` - Screen components
  - `/services` - Business logic and API services
  - `/navigation` - Navigation configuration
  - `/types` - TypeScript type definitions
  - `/hooks` - Custom React hooks
  - `/utils` - Utility functions
  - `/constants` - Application constants
- `/assets` - Static assets (images, fonts)
- `/supabase` - Supabase configuration and migrations
- `/__tests__` - Test files
- `/__mocks__` - Test mocks

## Environment Setup

### iOS Development

1. Install Xcode
2. Install CocoaPods
3. Run `cd ios && pod install`

### Android Development

1. Install Android Studio
2. Set up Android SDK
3. Configure environment variables (ANDROID_HOME)

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run tests and ensure they pass
4. Submit a pull request

### Commit Guidelines

- Follow conventional commits format
- Ensure commit messages are descriptive
- Reference issues in commit messages when applicable

## Troubleshooting

If you encounter any issues:

1. Ensure all environment variables are correctly set
2. Try clearing the npm cache: `npm cache clean --force`
3. Delete `node_modules` and run `npm install` again
4. Ensure Expo CLI is up to date: `npm install -g expo-cli`

Common Issues:

- iOS build fails: Try cleaning the build folder `cd ios && xcodebuild clean`
- Android build fails: Check Android SDK setup and environment variables
- Metro bundler issues: Clear Metro cache `npm start -- --reset-cache`

## Support

For support, please:

1. Check the existing issues
2. Create a new issue with detailed information about your problem
3. Include relevant logs and screenshots

## License

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
