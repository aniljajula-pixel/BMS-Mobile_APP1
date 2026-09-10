import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import LiveDataScreen from '../screens/LiveDataScreen';
import DeviceDetailsScreen from '../screens/DeviceDetailsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import CellsScreen from '../screens/CellsScreen';
import SiteDetailsScreen from '../screens/SiteDetails';   // <-- NEW IMPORT
import CustomHeader from '../components/CustomHeader';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

const MainTabNavigator = ({ isLoggedIn }) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'DeviceDetails') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'LiveData') {
            iconName = focused ? 'pulse' : 'pulse-outline';
          } else if (route.name === 'Cells') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'SiteDetails') {               // <-- NEW ICON LOGIC
            iconName = focused ? 'location' : 'location-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FFF700',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#003844',
        },
        header: () => <CustomHeader isLoggedIn={isLoggedIn} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="LiveData" component={LiveDataScreen} />
      <Tab.Screen name="DeviceDetails" component={DeviceDetailsScreen} />
      <Tab.Screen name="Cells" component={CellsScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      {/* NEW TAB */}
      <Tab.Screen name="SiteDetails" component={SiteDetailsScreen} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;