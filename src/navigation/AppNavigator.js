// src/navigation/AppNavigator.js
import React, { useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthContext } from '../../AuthContext';
import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated } = useContext(AuthContext);

  console.log('AppNavigator - isAuthenticated:', isAuthenticated);

  if (isAuthenticated === null) {
    console.log('AppNavigator - Waiting for authentication state');
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          {console.log('AppNavigator - Navigating to MainTabNavigator')}
          <Stack.Screen name="Main" component={MainTabNavigator} />
        </>
      ) : (
        <>
          {console.log('AppNavigator - Navigating to LoginScreen')}
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}