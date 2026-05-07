import {
  NotoSansJP_400Regular,
  NotoSansJP_700Bold,
  useFonts,
} from "@expo-google-fonts/noto-sans-jp";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HistoryProvider } from "@/context/HistoryContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { MultiplayerProvider } from "@/context/MultiplayerContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansJP_400Regular,
    NotoSansJP_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SettingsProvider>
              <HistoryProvider>
                <MultiplayerProvider>
                  <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="game" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="results" options={{ animation: 'fade', presentation: 'transparentModal' }} />
                    <Stack.Screen name="history" options={{ animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="settings" options={{ animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="shop" options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="multiplayer" options={{ animation: 'slide_from_right' }} />
                  </Stack>
                </MultiplayerProvider>
              </HistoryProvider>
            </SettingsProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
