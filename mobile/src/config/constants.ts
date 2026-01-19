export const STORAGE_KEYS = {
  SERVER_IP: '@memento_server_ip',
  CHAT_ID: '@memento_chat_id',
  LAST_SYNC: '@memento_last_sync',
  ID_MAP: '@memento_id_map',
};

export const DEFAULT_CONFIG = {
  // Default fallback IP (useful for local development)
  // 10.0.2.2 is the special alias to your host loopback interface (127.0.0.1) on the Android emulator
  // Replace with your machine's LAN IP if testing on a physical device
  FALLBACK_IP: '10.0.2.2', 
  PORT: 3000,
  API_TIMEOUT: 10000,
};
