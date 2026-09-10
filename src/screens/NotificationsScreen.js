import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Avatar, Card } from 'react-native-paper';
import axios from 'axios';
import { AuthContext } from '../../AuthContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = "https://rbms.mahadiscom.in/mseb";

const NotificationScreen = () => {
  const { userToken, isOfflineMode, logout } = useContext(AuthContext);
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'open', 'closed'
  const flatListRef = useRef(null);

  const MOCK_NOTIFICATIONS = [
    {
      id: 1,
      message: "Battery voltage critically low",
      raiseTime: "2025-06-14T05:57:07.137+0000",
      closeTime: null,
      status: "Open",
      siteId: "POWER HOUSE",
      serialNumber: "SERIAL_001",
      area: "POWER HOUSE"
    },
    {
      id: 2,
      message: "Temperature exceeds safe limit",
      raiseTime: "2025-06-14T05:47:07.137+0000",
      closeTime: "2025-06-14T06:05:38.007+0000",
      status: "Closed",
      siteId: "AMFORGE",
      serialNumber: "SERIAL_002",
      area: "AMFORGE"
    },
    {
      id: 3,
      message: "System performance degraded",
      raiseTime: "2025-06-14T04:57:07.137+0000",
      closeTime: null,
      status: "Open",
      siteId: "HIRANANDANI",
      serialNumber: "SERIAL_003",
      area: "HIRANANDANI"
    },
    {
      id: 4,
      message: "Charger trip detected",
      raiseTime: "2025-06-14T03:57:07.137+0000",
      closeTime: "2025-06-14T04:30:38.007+0000",
      status: "Closed",
      siteId: "ELPHINSTONE",
      serialNumber: "SERIAL_004",
      area: "ELPHINSTONE"
    },
    {
      id: 5,
      message: "DC earth fault detected",
      raiseTime: "2025-06-14T02:57:07.137+0000",
      closeTime: null,
      status: "Open",
      siteId: "SINDHRI",
      serialNumber: "SERIAL_005",
      area: "SINDHRI"
    },
  ];

  const filterNotificationsByStatus = (notifications, filterType) => {
    if (filterType === 'all') return notifications;
    if (filterType === 'open') {
      return notifications.filter(item => item.status?.toLowerCase() === 'open');
    }
    if (filterType === 'closed') {
      return notifications.filter(item => item.status?.toLowerCase() === 'closed');
    }
    return notifications;
  };

  const fetchNotifications = async () => {
    let fetchedNotifications = [];

    if (isOfflineMode) {
      Alert.alert("Info", "You are in offline mode. Showing mock notifications.");
      fetchedNotifications = filterNotificationsByStatus(MOCK_NOTIFICATIONS, filter);
    } else {
      if (!userToken) {
        Alert.alert("Error", "Authentication token is missing. Please log in again.");
        await logout();
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/tickets/last-hour`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        });

        if (!Array.isArray(response.data)) {
          Alert.alert("Error", "Invalid response from server. Showing mock data.");
          fetchedNotifications = filterNotificationsByStatus(MOCK_NOTIFICATIONS, filter);
        } else {
          // Map the response to include area name
          const mappedData = response.data.map(item => ({
            ...item,
            area: item.area || item.siteId || "N/A"
          }));
          fetchedNotifications = filterNotificationsByStatus(mappedData, filter)
            .sort((a, b) => {
              const timeA = a.raiseTime ? new Date(a.raiseTime) : new Date(0);
              const timeB = b.raiseTime ? new Date(b.raiseTime) : new Date(0);
              return timeB - timeA;
            });
        }
      } catch (error) {
        if (error.response?.status === 401) {
          Alert.alert("Error", "Session expired. Please log in again.");
          await logout();
        } else {
          Alert.alert("Connection Error", "Couldn't connect to server. Showing mock data.");
          fetchedNotifications = filterNotificationsByStatus(MOCK_NOTIFICATIONS, filter);
        }
      }
    }

    setNotifications(fetchedNotifications.length > 0 ? fetchedNotifications : MOCK_NOTIFICATIONS);
    setLoading(false);
    setRefreshing(false);

    if (fetchedNotifications.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: 0, animated: true });
      }, 100);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setRefreshing(true);
      fetchNotifications();
    }, [filter])
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNotifications(prev => {
        const filtered = filterNotificationsByStatus(prev, filter);
        return filtered.length > 0 ? filtered : MOCK_NOTIFICATIONS;
      });
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const formatTime = (time) => {
    try {
      if (!time) return "N/A";
      const date = new Date(time);
      if (isNaN(date.getTime())) return "Invalid Date";

      return date.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).replace(',', '');
    } catch (error) {
      console.error("Error formatting time:", error);
      return "Invalid Date";
    }
  };

  const getNotificationIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'closed':
        return {
          icon: 'check-circle',
          color: '#4CAF50',
          bgColor: '#E8F5E9'
        };
      case 'open':
      default:
        return {
          icon: 'alert-circle',
          color: '#FF5252',
          bgColor: '#FFEBEE'
        };
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'closed':
        return '#4CAF50';
      case 'open':
      default:
        return '#FF5252';
    }
  };

  const getOpenCount = () => {
    return notifications.filter(item => item.status?.toLowerCase() === 'open').length;
  };

  const getClosedCount = () => {
    return notifications.filter(item => item.status?.toLowerCase() === 'closed').length;
  };

  const renderNotification = ({ item }) => {
    const { icon, color, bgColor } = getNotificationIcon(item.status);
    const isClosed = item.status?.toLowerCase() === 'closed';

    return (
      <Card style={[
        styles.card,
        isClosed ? styles.closedCard : styles.openCard
      ]}>
        <View style={styles.messageBox}>
          <Avatar.Icon
            size={44}
            icon={icon}
            style={[
              styles.icon,
              { backgroundColor: bgColor }
            ]}
            color={color}
          />
          <View style={styles.messageContent}>
            <View style={styles.headerRow}>
              <Text style={styles.areaName} numberOfLines={1}>
                SubStation: {item.area || item.siteId || "N/A"}
              </Text>
              <Text style={[
                styles.statusBadge,
                { backgroundColor: bgColor, color }
              ]}>
                {item.status?.toUpperCase() || "OPEN"}
              </Text>
            </View>
            <Text style={styles.messageText}>{item.message || "No message available"}</Text>
            <View style={styles.footerRow}>
              <View style={styles.timestampRow}>
                <Text style={[styles.timeLabel, styles.labelContainer]}>Raised</Text>
                <Text style={styles.colon}>:</Text>
                <Text style={styles.timestampValue}>{formatTime(item.raiseTime)}</Text>
              </View>
              {isClosed && (
                <View style={styles.timestampRow}>
                  <Text style={[styles.timeLabel, styles.labelContainer]}>Closed</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.timestampValue}>{formatTime(item.closeTime)}</Text>
                </View>
              )}
              <View style={styles.timestampRow}>
                <Text style={[styles.timeLabel, styles.labelContainer]}>Serial No</Text>
                <Text style={styles.colon}>:</Text>
                <Text style={styles.timestampValue}>{item.serialNumber || "N/A"}</Text>
              </View>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  const renderFilterButton = (label, filterType, count) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.filterButtonActive
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[
        styles.filterButtonText,
        filter === filterType && styles.filterButtonTextActive
      ]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );
 
  // const renderHeader = () => (
  //   <View style={styles.headerContainer}>
  //     <View style={styles.headerLeft}>
  //       <TouchableOpacity
  //         style={styles.backButton}
  //         onPress={() => navigation.goBack()}
  //       >
  //         <Ionicons name="arrow-back" size={24} color="#333" />
  //       </TouchableOpacity>
  //       <Text style={styles.headerTitle}>Notifications</Text>
  //     </View>
  //     <TouchableOpacity
  //       style={styles.refreshButton}
  //       onPress={onRefresh}
  //     >
  //       <Ionicons name="refresh" size={22} color="#4CAF50" />
  //     </TouchableOpacity>
  //   </View>
  // );

  const renderFilterBar = () => (
    <View style={styles.filterBar}>
      {renderFilterButton('All', 'all', notifications.length)}
      {renderFilterButton('Open', 'open', getOpenCount())}
      {renderFilterButton('Closed', 'closed', getClosedCount())}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* {renderHeader()} */}
      {renderFilterBar()}

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loaderText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id ? item.id.toString() : `${item.siteId}-${item.raiseTime}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4CAF50"]}
              tintColor="#4CAF50"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No notifications available</Text>
              <Text style={styles.emptySubText}>Pull down to refresh</Text>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.emptyListContent
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: "#555",
  },
  listContent: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  openCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF5252',
  },
  closedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    opacity: 0.9,
  },
  messageBox: {
    flexDirection: "row",
    padding: 16,
    alignItems: "flex-start",
  },
  icon: {
    marginRight: 10,
    elevation: 1,
  },
  messageContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  areaName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  messageText: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 8,
    color: "#222",
    lineHeight: 20,
  },
  footerRow: {
    marginTop: 4,
    flexDirection: 'column',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timeLabel: {
    width: 100,
    fontWeight: 'bold',
    color: '#555',
  },
  colon: {
    fontSize: 14,
    color: '#555',
    width: 10,
    textAlign: 'center',
  },
  timestampValue: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: "#555",
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
  },
});

export default NotificationScreen;