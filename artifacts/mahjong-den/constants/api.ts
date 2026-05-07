import { Platform } from 'react-native';

const DEV_DOMAIN = '60fde465-9d40-46c6-9252-e84b22518431-00-p2ibuy931gr2.janeway.replit.dev';

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web'
    ? `https://${DEV_DOMAIN}/api-server`
    : `https://${DEV_DOMAIN}/api-server`);

export const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ??
  `wss://${DEV_DOMAIN}/api-server/ws`;
