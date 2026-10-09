// src/navigation/MainTabNavigator.js
import React, { useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import LiveDataScreen from '../screens/LiveDataScreen';
import DeviceDetailsScreen from '../screens/DeviceDetailsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import CellsScreen from '../screens/CellsScreen';
import SiteDetailsScreen from '../screens/SiteDetails';
import CustomHeader from '../components/CustomHeader';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

const getIconName = (routeName, focused) => {
  switch (routeName) {
    case 'Home':          return focused ? 'home' : 'home-outline';
    case 'DeviceDetails': return focused ? 'list' : 'list-outline';
    case 'Notifications': return focused ? 'notifications' : 'notifications-outline';
    case 'LiveData':      return focused ? 'pulse' : 'pulse-outline';
    case 'Cells':         return focused ? 'grid' : 'grid-outline';
    case 'SiteDetails':   return focused ? 'location' : 'location-outline';
    default:              return 'ellipse';
  }
};

const MainTabNavigator = ({ isLoggedIn }) => {
  // 🔹 Header WITH pickers (Home, LiveData, DeviceDetails, Cells)
  const headerWithPickers = useCallback(
    () => <CustomHeader isLoggedIn={isLoggedIn} showSelectionBar={true} />,
    [isLoggedIn]
  );

  // 🔹 Header WITHOUT pickers (Notifications, SiteDetails)
  const headerNoPickers = useCallback(
    () => <CustomHeader isLoggedIn={isLoggedIn} showSelectionBar={false} />,
    [isLoggedIn]
  );

  const screenOptions = useCallback(
    ({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => (
        <Ionicons name={getIconName(route.name, focused)} size={size} color={color} />
      ),
      tabBarActiveTintColor: '#FFF700',
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: { backgroundColor: '#003844' },
    }),
    []
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ header: headerWithPickers }}
      />
      <Tab.Screen
        name="LiveData"
        component={LiveDataScreen}
        options={{ header: headerWithPickers }}
      />
      <Tab.Screen
        name="DeviceDetails"
        component={DeviceDetailsScreen}
        options={{ header: headerWithPickers }}
      />
      <Tab.Screen
        name="Cells"
        component={CellsScreen}
        options={{ header: headerWithPickers }}
      />
      {/* 🔹 No pickers on these two */}
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ header: headerNoPickers }}
      />
      <Tab.Screen
        name="SiteDetails"
        component={SiteDetailsScreen}
        options={{ header: headerNoPickers }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;