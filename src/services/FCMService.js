// import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import Constants from 'expo-constants';
// import messaging from '@react-native-firebase/messaging';

// class FCMService {
//   constructor() { 
//     this.token = null;
//   }

//   // Configure notification handling
//   configure() {
//     Notifications.setNotificationHandler({
//       handleNotification: async (notification) => ({
//         shouldShowBanner: true,
//         shouldPlaySound: true,
//         shouldSetBadge: true,
//         priority: Notifications.AndroidNotificationPriority.HIGH,
//       }),
//     });
//   }

//   // Get Expo push token
//   async getExpoPushToken() {
//     if (!Device.isDevice) {
//       console.log('Must use physical device for notifications');
//       return null;
//     }

//     try {
//       // Check and request permission
//       const { status: existingStatus } = await Notifications.getPermissionsAsync();
//       let finalStatus = existingStatus;
      
//       if (existingStatus !== 'granted') {
//         const { status } = await Notifications.requestPermissionsAsync();
//         finalStatus = status;
//       }
      
//       if (finalStatus !== 'granted') {
//         console.log('Failed to get push token permission');
//         return null;
//       }

//       // Get project ID
//       const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
//                        Constants.easConfig?.projectId;
      
//       if (!projectId) {
//         console.log('Project ID not found');
//         return null;
//       }
      
//       // Get Expo push token
//       const token = (await Notifications.getExpoPushTokenAsync({
//         projectId: projectId,
//       })).data;
      
//       this.token = token;
//       console.log('📱 Expo Push Token:', token);
      
//       // Store token locally
//       await AsyncStorage.setItem('expoPushToken', token);
      
//       return token;
//     } catch (error) {
//       console.error('Error getting Expo push token:', error);
//       return null;
//     }
//   }

//   // Store topics from decoded JWT
//   async storeTopics(decodedToken) {
//     try {
//       const topics = [];
//       topics=decodedToken ? JSON.parse(decodedToken).topics || [] : [];

//       for (const topic of topics) {
//         await messaging().subscribeToTopic(topicName);
//         console.log(`Subscribed to topic: ${topic}`);
//       }

//       // Store topics locally
//       await AsyncStorage.setItem('userTopics', JSON.stringify(topics));
      
//       console.log('✅ Topics stored:', topics);
//       return topics;
      
//     } catch (error) {
//       console.error('Error storing topics:', error);
//       return [];
//     }
//   }

//   // Get stored topics
//   async getStoredTopics() {
//     try {
//       const topics = await AsyncStorage.getItem('userTopics');
//       return topics ? JSON.parse(topics) : [];
//     } catch (error) {
//       console.error('Error getting stored topics:', error);
//       return [];
//     }
//   }

//   // Listen for notifications
//   listenForNotifications() {
//     // Foreground notifications

    

//     const foregroundSubscription = Notifications.addNotificationReceivedListener(
//       (notification) => {
//         console.log('🔔 Notification received while app is open:', notification);
//         this.handleForegroundNotification(notification);
//       }
//     );

//     // Background notification tapped
//     const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(
//       (response) => {
//         console.log('📱 Notification tapped:', response);
//         this.handleNotificationTap(response);
//       }
//     );

//     return { foregroundSubscription, backgroundSubscription };
//   }

//   // Handle foreground notification
//   handleForegroundNotification(notification) {
//     const title = notification.request.content.title;
//     const body = notification.request.content.body;
//     const data = notification.request.content.data;
    
//     console.log(`📢 ${title}: ${body}`);
    
//     // You can show an in-app alert here if needed
//     // For example, using a toast or modal
//   }

//   // Handle notification tap
//   handleNotificationTap(response) {
//     const data = response.notification.request.content.data;
//     console.log('Notification data:', data);
    
//     // TODO: Add navigation logic based on notification type
//     // For example:
//     // if (data.screen === 'LiveData') {
//     //   navigation.navigate('LiveData', { deviceId: data.deviceId });
//     // }
//   }

//   // Clear all notification data on logout
//   async clearNotificationData() {
//     try {
//       await AsyncStorage.multiRemove(['expoPushToken', 'userTopics']);
//       console.log('Cleared notification data');
//     } catch (error) {
//       console.error('Error clearing notification data:', error);
//     }
//   }

//   // Remove listeners
//   removeListeners(subscriptions) {
//     if (subscriptions) {
//       if (subscriptions.foregroundSubscription) {
//         Notifications.removeNotificationSubscription(
//           subscriptions.foregroundSubscription
//         );
//       }
//       if (subscriptions.backgroundSubscription) {
//         Notifications.removeNotificationSubscription(
//           subscriptions.backgroundSubscription
//         );
//       }
//     }
//   }
// }

// export default new FCMService();



// import React, { useEffect, useState } from 'react';
// import { StyleSheet, Text, View, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
// import messaging from '@react-native-firebase/messaging';
// import notifee, { AndroidImportance } from '@notifee/react-native';

// export default function App() {
//   const [subscribedCircle, setSubscribedCircle] = useState(null);
//   const targetCircle = "NAMPUR"; // Matches your Spring Boot variable

//   useEffect(() => {
//     // 1. Request iOS/Android Notification Permissions
//     const requestUserPermission = async () => {
//       const authStatus = await messaging().requestPermission();
//       const enabled =
//         authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
//         authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
//       if (!enabled) {
//         Alert.alert("Permission Denied", "Please enable notifications in settings to receive alerts.");
//       }
//     };

//     requestUserPermission();

//     // 2. Listen for Foreground Messages (App is wide open)
//     const unsubscribeNotificationListener = messaging().onMessage(async (remoteMessage) => {
//       console.log('Received a foreground message:', remoteMessage);

//       // Create an Android Channel (Required for Android 8.0+ banners)
//       const channelId = await notifee.createChannel({
//         id: 'bms-alerts',
//         name: 'BMS Alerts Channel',
//         importance: AndroidImportance.HIGH, // Forces the banner to pop down
//       });

//       // Display the local banner popup
//       await notifee.displayNotification({
//         title: remoteMessage.notification?.title || "New Alert",
//         body: remoteMessage.notification?.body || "",
//         android: {
//           channelId: channelId,
//           importance: AndroidImportance.HIGH,
//           pressAction: {
//             id: 'default',
//           },
//         },
//       });
//     });

//     return () => {
//       unsubscribeNotificationListener();
//     };
//   }, []);

//   // 3. Handle Topic Subscription / Unsubscription
//   const toggleSubscription = async () => {
//     try {
//       if (subscribedCircle === targetCircle) { 
//         // Unsubscribe from Firebase Topic
//         await messaging().unsubscribeFromTopic(targetCircle);
//         setSubscribedCircle(null);
//         Alert.alert("Unsubscribed", `You stopped following alerts for ${targetCircle}`);
//       } else {
//         // Subscribe to Firebase Topic
//         await messaging().subscribeToTopic(targetCircle);   
//         setSubscribedCircle(targetCircle);
//         Alert.alert("Subscribed!", `You will now receive alerts for ${targetCircle}`);
//       }
//     } catch (error) {
//       console.error("FCM Topic Error: ", error);
//       Alert.alert("Error", "Failed to update subscription status.");
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.card}>
//         <Text style={styles.title}>BMS Monitoring Dashboard</Text>
//         <Text style={styles.subtitle}>Circle: {targetCircle}</Text>
        
//         <TouchableOpacity 
//           style={[styles.button, subscribedCircle === targetCircle ? styles.activeButton : styles.inactiveButton]} 
//           onPress={toggleSubscription}
//         >
//           <Text style={styles.buttonText}>
//             {subscribedCircle === targetCircle ? "✓ Subscribed to Alerts" : "Subscribe to Alerts"}
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   card: {
//     width: '85%',
//     backgroundColor: '#ffffff',
//     borderRadius: 16,
//     padding: 24,
//     alignItems: 'center',
//     elevation: 4,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//   },
//   title: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#666',
//     marginBottom: 24,
//   },
//   button: {
//     width: '100%',
//     paddingVertical: 14,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   inactiveButton: {
//     backgroundColor: '#007AFF',
//   },
//   activeButton: {
//     backgroundColor: '#4CD964',
//   },
//   buttonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
// });