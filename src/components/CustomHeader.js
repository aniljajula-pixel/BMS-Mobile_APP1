import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../AuthContext';
import { useNavigation } from '@react-navigation/native';
import api from '../Api';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import messaging from '@react-native-firebase/messaging';

const API_URL = "https://rbms.mahadiscom.in/mseb";

const CustomHeader = () => {
  const [showLogout, setShowLogout] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const { isAuthenticated, logout, userToken } = useContext(AuthContext);
  const navigation = useNavigation();

  const handleMenuPress = (e) => {
    e.stopPropagation();
    setShowLogout(!showLogout);
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  // Fetch notification count from the existing API
  const fetchNotificationCount = async () => {
    if (!isAuthenticated || !userToken) {
      setNotificationCount(0);
      return;
    }

    try {
      // Use the existing notifications API
      const response = await api.get(`${API_URL}/tickets/last-hour`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (Array.isArray(response.data)) {
        // Count only OPEN notifications
        const openCount = response.data.filter(
          item => item.status?.toLowerCase() === 'open'
        ).length;
        setNotificationCount(openCount);
      } else {
        setNotificationCount(0);
      }
    } catch (error) {
      // Silently handle error
      console.log('Could not fetch notification count');
      setNotificationCount(0);
    }
  };

  async function unsubscribeFromTopic(topicName) {
    try {
      // Native unbinding via Google SDK
      // await messaging().unsubscribeFromTopic(topicName);
      console.log(`Successfully unbound from topic: ${topicName}`);
    } catch (error) {
      console.error(`Failed to unsubscribe from ${topicName}:`, error);
    }
  }

  const handleLogout = async (e) => {
    e.stopPropagation();
    try {
      await logout();
      const decodedToken = await AsyncStorage.getItem('userTopics');
      if (decodedToken) {
        try {
          const topics = JSON.parse(decodedToken);
          for (const topic of topics) {
            await unsubscribeFromTopic(topic);
          }
        } catch (parseError) {
          console.error('Error parsing topics:', parseError);
        }
      }
      setShowLogout(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to log out. Please try again.');
      console.error('Logout error:', error);
    }
  };

  const handleOutsideClick = () => {
    setShowLogout(false);
  };

  useEffect(() => {
    if (isAuthenticated && userToken) {
      fetchNotificationCount();
      
      // Refresh count every 60 seconds
      const interval = setInterval(fetchNotificationCount, 60000);
      
      return () => {
        clearInterval(interval);
      };
    } else {
      setNotificationCount(0);
    }
  }, [isAuthenticated, userToken]);

  // Refresh count when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isAuthenticated && userToken) {
        fetchNotificationCount();
      }
    });

    return unsubscribe;
  }, [navigation, isAuthenticated, userToken]);

  return (
    <TouchableWithoutFeedback onPress={handleOutsideClick}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.menuContainer}>
            {isAuthenticated && (
              <>
                <Image source={require('../../assets/images/maha-removebg-preview.png')} style={styles.rightLogo} resizeMode="contain" />
                
                {/* Notification Icon */}
                <TouchableOpacity 
                  style={styles.notificationButton} 
                  onPress={handleNotificationPress}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={24} color="#FFF" />
                  {notificationCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Three Dots Menu */}
                <TouchableOpacity onPress={handleMenuPress}>
                  <Ionicons name="ellipsis-vertical" size={24} color="#FFF" />
                </TouchableOpacity>

                {showLogout && (
                  <>
                    <View style={styles.overlay} />
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                      <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        </View>
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>Remote Battery Monitoring & Battery Charger Monitoring System</Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#003844',
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  headerRow: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  menuContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  logo: {
    width: 80,
    height: 80,
  },
  rightLogo: {
    width: 80,
    height: 80,
    marginRight: 10,
  },
  notificationButton: {
    padding: 8,
    marginRight: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#003844',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logoutButton: {
    position: 'absolute',
    top: 60,
    right: 0,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 5,
    zIndex: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  logoutText: {
    color: '#003844',
    fontWeight: 'bold',
  },
  labelContainer: {
    backgroundColor: '#003844',
    paddingVertical: 10,
    alignItems: 'center',
  },
  labelText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
});

export default CustomHeader;