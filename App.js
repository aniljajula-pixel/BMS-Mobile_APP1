import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, Alert, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from './AuthContext';
import { SelectionProvider } from './SelectionContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [isAppAccessible, setIsAppAccessible] = useState(true);

  const linking = {
    prefixes: ['yourapp://'],
    config: {
      screens: {
        Login: 'login',
        Main: {
          path: 'main',
          screens: {
            Home: 'home',
            LiveData: 'livedata',
            DeviceDetails: 'devicedetails',
            Notifications: 'notifications',
          },
        },
      },
    },
    async getInitialURL() {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return null;
    },
  };

  useEffect(() => {
    const initializeApp = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsReady(true);
    };
    initializeApp();
  }, []);

  if (!isReady) {
    return null;
  }

  if (!isAppAccessible) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Access Expired</Text>
        <Text style={{ marginTop: 10, color: 'gray' }}>
          This app's access period has expired.
        </Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <SelectionProvider>
        <NavigationContainer linking={linking}>
          <AppNavigator />
        </NavigationContainer>
      </SelectionProvider>
    </AuthProvider>
  );
}