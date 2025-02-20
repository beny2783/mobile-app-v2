import 'react-native-gesture-handler/jestSetup';

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    /* Buttons */
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    /* Other */
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
  };
});

// Mock TurboModuleRegistry
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  get: jest.fn(),
  getEnforcing: jest.fn(() => ({
    getConstants: () => ({
      settings: {
        AppleLocale: 'en_US',
        AppleLanguages: ['en'],
      },
    }),
  })),
}));

// Mock Dimensions before react-native
jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
  get: jest.fn().mockReturnValue({
    width: 375,
    height: 667,
    scale: 1,
    fontScale: 1,
  }),
  set: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock BackHandler
jest.mock('react-native/Libraries/Utilities/BackHandler', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
}));

// Mock Safe Area Context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 667 }),
  initialWindowMetrics: {
    frame: { x: 0, y: 0, width: 375, height: 667 },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  },
}));

// Mock React Native Paper
jest.mock('react-native-paper', () => {
  const Card = (props) => props.children;
  Card.Title = (props) => props.title;
  Card.Content = (props) => props.children;
  Card.Actions = (props) => props.children;

  return {
    Button: ({ children, onPress, mode, style }) => children,
    Card,
    Text: ({ children }) => children,
    Provider: ({ children }) => children,
    Portal: ({ children }) => children,
    Surface: ({ children }) => children,
    ActivityIndicator: ({ size, testID }) => null,
    useTheme: () => ({
      colors: {
        primary: '#000000',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        accent: '#000000',
        error: '#B00020',
        text: '#000000',
        onSurface: '#000000',
        disabled: '#000000',
        placeholder: '#000000',
        backdrop: '#000000',
        notification: '#000000',
      },
    }),
  };
});

// Mock react-native
jest.mock('react-native', () => ({
  StyleSheet: {
    create: (styles) => styles,
    hairlineWidth: 1,
    absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    flatten: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  Dimensions: {
    get: jest.fn().mockReturnValue({
      width: 375,
      height: 667,
      scale: 1,
      fontScale: 1,
    }),
    set: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  NativeModules: {
    SettingsManager: {
      settings: {
        AppleLocale: 'en_US',
        AppleLanguages: ['en'],
      },
    },
  },
  Settings: {
    get: jest.fn(),
    set: jest.fn(),
    watchKeys: jest.fn(),
    clearWatch: jest.fn(),
  },
  Animated: {
    Value: jest.fn(),
    timing: jest.fn(),
    spring: jest.fn(),
    sequence: jest.fn(),
    parallel: jest.fn(),
    createAnimatedComponent: jest.fn((component) => component),
  },
  BackHandler: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  },
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  ScrollView: 'ScrollView',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
}));

// Mock Expo vector icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: '',
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  warmUpAsync: jest.fn(),
  coolDownAsync: jest.fn(),
}));

// Mock EventEmitter
class MockEventEmitter {
  constructor() {
    this.listeners = {};
  }

  addListener(eventType, listener) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(listener);
    return {
      remove: () => {
        const index = this.listeners[eventType].indexOf(listener);
        if (index > -1) {
          this.listeners[eventType].splice(index, 1);
        }
      },
    };
  }

  removeListener(eventType, listener) {
    if (this.listeners[eventType]) {
      const index = this.listeners[eventType].indexOf(listener);
      if (index > -1) {
        this.listeners[eventType].splice(index, 1);
      }
    }
  }

  emit(eventType, ...args) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach((listener) => listener(...args));
    }
  }
}

// Mock NativeEventEmitter
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return class {
    constructor() {
      return new MockEventEmitter();
    }
  };
});

// Mock AppState
jest.mock('react-native/Libraries/AppState/AppState', () => {
  const emitter = new MockEventEmitter();
  return {
    currentState: 'active',
    addEventListener: (type, handler) => {
      const subscription = emitter.addListener(type, handler);
      return {
        remove: () => subscription.remove(),
      };
    },
    removeEventListener: (type, handler) => emitter.removeListener(type, handler),
  };
});

// Mock NavigationContainer and related hooks for testing
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock Linking from react-native
jest.mock('react-native/Libraries/Linking/Linking', () => {
  const emitter = new MockEventEmitter();
  return {
    addEventListener: (type, handler) => {
      const subscription = emitter.addListener(type, handler);
      return {
        remove: () => subscription.remove(),
      };
    },
    removeEventListener: (type, handler) => emitter.removeListener(type, handler),
    openURL: jest.fn(),
    canOpenURL: jest.fn(),
    getInitialURL: jest.fn(() => Promise.resolve('spendingtracker://auth/callback')),
  };
});

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((dict) => dict.ios),
}));

// Mock useWindowDimensions
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({
    width: 375,
    height: 667,
    scale: 1,
    fontScale: 1,
  }),
}));

// Mock the TrueLayer service
jest.mock('./src/services/trueLayer', () => ({
  getTrueLayerService: jest.fn().mockReturnValue({
    exchangeCode: jest.fn().mockResolvedValue({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
    }),
  }),
}));

// Mock the ServiceContext
jest.mock('./src/contexts/ServiceContext', () => ({
  useServices: jest.fn(),
}));

// Mock the useBankConnections hook
jest.mock('./src/hooks/useBankConnections', () => ({
  useBankConnections: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock environment variables
jest.mock('./src/constants', () => ({
  TRUELAYER: {
    CLIENT_ID: 'test-client-id',
    CLIENT_SECRET: 'test-client-secret',
    REDIRECT_URI: 'spendingtracker://auth/callback',
  },
  SUPABASE: {
    URL: 'https://test.supabase.co',
    ANON_KEY: 'test-anon-key',
  },
}));

// Mock React Native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({
  API: {
    createAnimatedNode: jest.fn(),
    startListeningToAnimatedNodeValue: jest.fn(),
    stopListeningToAnimatedNodeValue: jest.fn(),
    connectAnimatedNodes: jest.fn(),
    disconnectAnimatedNodes: jest.fn(),
    startAnimatingNode: jest.fn(),
    stopAnimation: jest.fn(),
    setAnimatedNodeValue: jest.fn(),
    setAnimatedNodeOffset: jest.fn(),
    flattenAnimatedNodeOffset: jest.fn(),
    extractAnimatedNodeOffset: jest.fn(),
    connectAnimatedNodeToView: jest.fn(),
    disconnectAnimatedNodeFromView: jest.fn(),
    dropAnimatedNode: jest.fn(),
    addAnimatedEventToView: jest.fn(),
    removeAnimatedEventFromView: jest.fn(),
  },
}));

// Global setup
global.fetch = jest.fn();
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
