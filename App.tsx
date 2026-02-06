import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ChatScreen } from './src/screens/ChatScreen';
import { ConnectScreen } from './src/screens/ConnectScreen';
import { lightTheme, darkTheme } from './src/theme/colors';

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const [connection, setConnection] = useState<{
    url: string;
    token: string;
  } | null>(null);

  const handleConnect = useCallback((url: string, token: string) => {
    setConnection({ url, token });
  }, []);

  const handleDisconnect = useCallback(() => {
    setConnection(null);
  }, []);

  return (
    <SafeAreaProvider>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        {connection ? (
          <ChatScreen
            gatewayUrl={connection.url}
            token={connection.token}
            theme={theme}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <ConnectScreen theme={theme} onConnect={handleConnect} />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
