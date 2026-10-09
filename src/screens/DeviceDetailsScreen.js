// src/screens/DeviceDetails.js
import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome';
import { AuthContext } from '../../AuthContext';
import { useSelection } from '../../SelectionContext';

const API_URL = 'https://rbms.mahadiscom.in/mseb';

/* --------------------------------------------------------------
   MOCK DATA (offline mode)
   -------------------------------------------------------------- */
const MOCK_STATES = ['MAHARASHTRA'];
const MOCK_ZONES = ['Bhandup', 'Kalyan', 'Nashik'];
const MOCK_CIRCLES = ['Thane', 'Pune'];
const MOCK_DIVISIONS = [
  'BHANDUP (E)',
  'GADKARI',
  'ISHWAR NAGAR',
  'KISAN NAGAR',
  'KOLSHETH URBAN',
  'LOKMANYA NAGAR',
  'NEELAM NAGAR',
  'PACH RASTA',
  'PANNALAL',
  'POWER HOUSE',
  'SARVODAY',
  'THANE (E)',
  'VIKAS COMPLEX',
  'WAGLE ESTATE',  
];
const MOCK_AREAS = [
  'POWER HOUSE', 
  'AMFORGE',
  'DREAMS',
  'HARIYALI',
  'HAWARE',
  'HIRANANDANI',
  'KOLSHET',
  'KOPRI',
  'LOKMANYA NAGAR',
  'LOKPRIYA',
  'PIRMAL',
  'ROMA',
  'SELF DEVELOPER',
  'SOHAM',
  'VASANTH VIHAR',
];
const MOCK_DETAILS = {
  manufacturerName: 'Exide',
  ahCapacity: '100',
  firstUsedDate: '2023-01-01',
  batterySerialNumber: 'BSN123',
  batteryBankType: 'Lead-Acid',
  designVoltage: '48V',
  individualCellVoltage: '2V',
  kva: '10',
  lowVoltage: '1.9',
  openBattery: '1.7',
  highVoltage: '2.4',
  highTemperature: '45',
  batteryAboutToDie: '1.8',
  latitude: 19.247524,
  longitude: 73.17312,
  location: 'Mock Location',
};
const MOCK_STATUS = [
  { siteId: 'SITE001', statusType: 1 },
  { siteId: 'SITE002', statusType: 0 },
];

/* --------------------------------------------------------------
   Leaflet Map Component
   -------------------------------------------------------------- */
const LeafletMapView = ({
  latitude,
  longitude,
  locationName,
  ahCapacity,
  markerIcon,
}) => {
  const webViewRef = useRef(null);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    body, html, #map { margin:0; padding:0; width:100%; height:100%; }
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([${latitude}, ${longitude}], 15);  

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.marker([${latitude}, ${longitude}], {
      icon: L.icon({
        iconUrl: '${markerIcon}',
        iconSize: [32, 32],
        iconAnchor: [16, 32],  
        popupAnchor: [0, -32]
      })
    })
    .bindPopup("<b>${locationName}</b><br>Ah: ${ahCapacity} Ah")
    .addTo(map);

    map.whenReady(() => { 
      setTimeout(() => {
        map.invalidateSize();
        map.setView([${latitude}, ${longitude}], 15); 
      }, 100);
    });
  </script>
</body> 
</html> 
  `;

  return (
    <WebView
      ref={webViewRef}
      source={{ html }}
      style={styles.map}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      startInLoadingState={true}
      scalesPageToFit={false}
      renderLoading={() => (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f0f0f0',
          }}
        >
          <ActivityIndicator size="small" color="#4CAF50" />
        </View>
      )}
    />
  );
};

/* --------------------------------------------------------------
   MAIN SCREEN
   -------------------------------------------------------------- */
const DeviceDetails = () => {
  const { userToken, isOfflineMode } = useContext(AuthContext);

  // 🔹 shared selection (from header pickers)
  const {
    selectedState,
    selectedZone,
    selectedCircle,
    selectedDivision,
    selectedArea,
  } = useSelection();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [authError, setAuthError] = useState(false);

  /* user-scoped lists */
  const [userZones, setUserZones] = useState([]);
  const [userCircles, setUserCircles] = useState([]);
  const [userDivisions, setUserDivisions] = useState([]);
  const [userAreas, setUserAreas] = useState([]);
  const [listsLoading, setListsLoading] = useState(false);

  /* device data */
  const [siteInfo, setSiteInfo] = useState(null);
  const [manufacturerDetails, setManufacturerDetails] = useState(null);
  const [thresholds, setThresholds] = useState(null);
  const [siteLocation, setSiteLocation] = useState(null);
  const [statusData, setStatusData] = useState(MOCK_STATUS);

  const lastFetchedArea = useRef('');

  /* --------------------------------------------------------------
     USER-SCOPED fetchers
     -------------------------------------------------------------- */
  const fetchUserZones = useCallback(
    async (state) => {
      if (!state) return [];
      if (isOfflineMode) return MOCK_ZONES;
      if (!userToken) return [];
      try {
        const res = await axios.get(
          `${API_URL}/getUserZones?stateName=${encodeURIComponent(state)}`,
          { headers: { Authorization: `Bearer ${userToken}` }, timeout: 10000 }
        );
        const data = Array.isArray(res.data) ? res.data : [];
        return [...new Set(data)];
      } catch (e) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          setAuthError(true);
          return [];
        }
        console.error('fetchUserZones error:', e?.message);
        return MOCK_ZONES;
      }
    },
    [userToken, isOfflineMode]
  );

  const fetchUserCircles = useCallback(
    async (zone) => {
      if (!zone) return [];
      if (isOfflineMode) return MOCK_CIRCLES;
      if (!userToken) return [];
      try {
        const res = await axios.get(
          `${API_URL}/getUserCircles?zoneName=${encodeURIComponent(zone)}`,
         );
        const data = Array.isArray(res.data) ? res.data : [];
        return [...new Set(data)];
      } catch (e) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          setAuthError(true);
          return [];
        }
        console.error('fetchUserCircles error:', e?.message);
        return MOCK_CIRCLES;
      }
    },
    [userToken, isOfflineMode]
  );

  const fetchUserDivisions = useCallback(
    async (circle) => {
      if (!circle) return [];
      if (isOfflineMode) return MOCK_DIVISIONS;
      if (!userToken) return [];
      try {
        const res = await axios.get(
          `${API_URL}/getUserDivisions?circleName=${encodeURIComponent(circle)}`,
          { headers: { Authorization: `Bearer ${userToken}` }, timeout: 10000 }
        );
        const data = Array.isArray(res.data) ? res.data : [];
        return [...new Set(data)];
      } catch (e) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          setAuthError(true);
          return [];
        }
        console.error('fetchUserDivisions error:', e?.message);
        return MOCK_DIVISIONS;
      }
    },
    [userToken, isOfflineMode]
  );

  const fetchUserAreas = useCallback(
     async (division) => { 
      if (!division) return [];
      if (isOfflineMode) return MOCK_AREAS;
      if (!userToken) return [];
      try {
        const res = await axios.get(
          `${API_URL}/getUserAreas?divisionName=${encodeURIComponent(division)}`,
          { headers: { Authorization: `Bearer ${userToken}` }, timeout: 10000 }
        );
        const data = Array.isArray(res.data) ? res.data : []; 
        return [...new Set(data)];
      } catch (e) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          setAuthError(true);
          return [];
        }
        console.error('fetchUserAreas error:', e?.message);
        return MOCK_AREAS;
      }
    },
    [userToken, isOfflineMode]
  );

  /* --------------------------------------------------------------
     Load user-scoped lists whenever selection changes
     -------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setListsLoading(true);
      try {
        const z = await fetchUserZones(selectedState);
        if (cancelled) return;
        setUserZones(z);

        const c = await fetchUserCircles(selectedZone); 
        if (cancelled) return;
        setUserCircles(c);

        const d = await fetchUserDivisions(selectedCircle);
        if (cancelled) return;
        setUserDivisions(d);

        const a = await fetchUserAreas(selectedDivision);
        if (cancelled) return;
        setUserAreas(a);
      } finally {
        if (!cancelled) setListsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [
    selectedState,
    selectedZone,
    selectedCircle,
    selectedDivision,
    fetchUserZones,
    fetchUserCircles,
    fetchUserDivisions,
    fetchUserAreas,
  ]);

  /* --------------------------------------------------------------
     Fetch device details for the selected area
     -------------------------------------------------------------- */
  const fetchDeviceData = useCallback(
    async (area) => {
      if (isOfflineMode || authError || !userToken || !area) {
        setSiteInfo({ siteId: 'SITE001', serialNumber: 'SN12345' });
        setManufacturerDetails(MOCK_DETAILS);
        setThresholds(MOCK_DETAILS);
        setSiteLocation({
          latitude: MOCK_DETAILS.latitude,
          longitude: MOCK_DETAILS.longitude,
          locationName: MOCK_DETAILS.location,
        });
        return;
      }

      setLoading(true);
      try {
        const res = await axios.get(
          `${API_URL}/getManufacturerDetailsBySiteIdAndSerialNumber?area=${encodeURIComponent(
            area
          )}`,
          {
            headers: { Authorization: `Bearer ${userToken}` },
            timeout: 15000,
          }
        );

        if (!userToken) return;

        const d = res.data || {};
        setManufacturerDetails({
          manufacturerName: d.manufacturerName || 'N/A',
          ahCapacity: d.ahCapacity || 'N/A',
          firstUsedDate: d.firstUsedDate || 'N/A',
          batterySerialNumber: d.batterySerialNumber || 'N/A',
          batteryBankType: d.batteryBankType || 'N/A',
          designVoltage: d.designVoltage || 'N/A',
          individualCellVoltage: d.individualCellVoltage || 'N/A',
          kva: d.kva || 'N/A',
        });
        setThresholds({
          lowVoltage: d.lowVoltage || 'N/A',
          openBattery: d.openBattery || 'N/A',
          highVoltage: d.highVoltage || 'N/A',
          highTemperature: d.highTemperature || 'N/A',
          batteryAboutToDie: d.batteryAboutToDie || 'N/A',
        });

        if (
          typeof d.latitude === 'number' &&
          typeof d.longitude === 'number'
        ) {
          setSiteLocation({
            latitude: d.latitude,
            longitude: d.longitude,
            locationName: d.location || 'Location',
          });
        } else {
          setSiteLocation(null);
        }
        setAuthError(false);
      } catch (e) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          if (!userToken) return;
          setManufacturerDetails(MOCK_DETAILS);
          setThresholds(MOCK_DETAILS);
          setSiteLocation({
            latitude: MOCK_DETAILS.latitude,
            longitude: MOCK_DETAILS.longitude,
            locationName: MOCK_DETAILS.location,
          });
          setAuthError(true);
          return;
        }
        console.error('Error fetching device details:', e);
        Alert.alert('Error', `Failed to load device details: ${e.message}`);
        setSiteInfo(null);
        setManufacturerDetails(null);
        setThresholds(null);
        setSiteLocation(null);
        setHasSearched(false);
      } finally {
        setLoading(false);
      }
    },
    [userToken, isOfflineMode, authError]
  );

  /* --------------------------------------------------------------
     Auto-fetch when selectedArea is present in the user's list
     -------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedArea) {
      setSiteInfo(null);
      setManufacturerDetails(null);
      setThresholds(null);
      setSiteLocation(null);
      setHasSearched(false);
      lastFetchedArea.current = '';
      return;
    }
    if (userAreas.length === 0) return;   // wait for user list
    if (!userAreas.includes(selectedArea)) {
      // header selection not accessible for this user
      setSiteInfo(null);
      setManufacturerDetails(null);
      setThresholds(null);
      setSiteLocation(null);
      setHasSearched(false);
      return;
    }
    if (lastFetchedArea.current === selectedArea) return;
    lastFetchedArea.current = selectedArea;
    setSiteInfo({ siteId: selectedArea, serialNumber: '' });
    setHasSearched(true);
    fetchDeviceData(selectedArea);
  }, [selectedArea, userAreas, fetchDeviceData]);

  /* --------------------------------------------------------------
     Refresh
     -------------------------------------------------------------- */
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (selectedArea && userAreas.includes(selectedArea)) {
        lastFetchedArea.current = '';
        await fetchDeviceData(selectedArea);
      }
    } finally {
      setRefreshing(false);
    }
  };

  /* --------------------------------------------------------------
     Manual search (banner button)
     -------------------------------------------------------------- */
  const handleManualSearch = async () => {
    if (!selectedArea) {
      Alert.alert(
        'Selection Required',
        'Pick State, Zone, Circle, Division, and Area in the header.'
      );
      return;
    }
    if (!userAreas.includes(selectedArea)) {
      Alert.alert(
        'Not Available',
        'The selected area is not in your accessible list.'
      );
      return;
    }
    lastFetchedArea.current = '';
    await fetchDeviceData(selectedArea);
  };

  /* --------------------------------------------------------------
     Map marker icon
     -------------------------------------------------------------- */
  const getMarkerIcon = () => {
    const status = statusData.find((s) => s.siteId === siteInfo?.siteId);
    return status?.statusType === 1
      ? 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-2x-green.png'
      : 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-2x-red.png';
  };

  /* --------------------------------------------------------------
     Render helpers
     -------------------------------------------------------------- */
  const renderMap = () => {
    if (!hasSearched || !siteLocation) return null;
    return (
      <View style={styles.mapContainer}>
        <LeafletMapView
          latitude={siteLocation.latitude}
          longitude={siteLocation.longitude}
          locationName={siteLocation.locationName}
          ahCapacity={manufacturerDetails?.ahCapacity || 'N/A'}
          markerIcon={getMarkerIcon()}
        />
      </View>
    );
  };

  const formatLabel = (k) =>
    ({
      manufacturerName: 'Manufacturer Name',
      ahCapacity: 'Ah Capacity',
      firstUsedDate: 'First Used Date',
      batterySerialNumber: 'Battery Serial Number',
      batteryBankType: 'Battery Bank Type',
      designVoltage: 'Design Voltage',
      individualCellVoltage: 'Individual Cell Voltage',
      kva: 'KVA Rating',
      lowVoltage: 'Low Voltage',
      openBattery: 'Open Battery',
      highVoltage: 'High Voltage',
      highTemperature: 'High Temperature',
      batteryAboutToDie: 'Battery About To Die',
    }[k] || k);

  const formatValue = (k, v) => {
    if (v === 'N/A') return v;
    if (k === 'ahCapacity') return `${v} Ah`;
    if (k === 'kva') return `${v} kVA`;
    if (k.includes('Voltage')) return `${v} V`;
    if (k === 'highTemperature') return `${v} °C`;
    return v;
  };

  const renderDetails = () => {
    if (!hasSearched) return null;
    if (!manufacturerDetails && !thresholds)
      return <Text style={styles.noDataText}>No details found.</Text>;

    return (
      <View style={styles.detailsContainer}>
        {manufacturerDetails && (
          <>
            <Text style={styles.detailTitle}>Manufacturer Details</Text>
            <View style={styles.detailCard}>
              {Object.entries(manufacturerDetails).map(([k, v]) => (
                <View key={k} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{formatLabel(k)}</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.detailValue}>{formatValue(k, v)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
        {thresholds && (
          <>
            <Text style={styles.detailTitle}>Threshold Values</Text>
            <View style={styles.detailCard}>
              {Object.entries(thresholds).map(([k, v]) => (
                <View key={k} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{formatLabel(k)}</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.detailValue}>{formatValue(k, v)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    );
  };

  /* --------------------------------------------------------------
     Selection banner
     -------------------------------------------------------------- */
  const renderSelectionBanner = () => {
    const notInUserList =
      selectedArea && userAreas.length > 0 && !userAreas.includes(selectedArea);

    return (
      <View style={styles.selectionBanner}>
        <View style={styles.selectionBannerRow}>
          <Icon name="filter" size={14} color="#003844" />
          <Text style={styles.selectionBannerTitle}>Current selection</Text>
        </View>
        <Text style={styles.selectionBannerText} numberOfLines={1}>
          {selectedArea
            ? `${selectedState || '-'} › ${selectedZone || '-'} › ${
                selectedCircle || '-'
              } › ${selectedDivision || '-'} › ${selectedArea}`
            : 'Pick State, Zone, Circle, Division and Area in the header above.'}
        </Text>

        {notInUserList && (
          <Text style={styles.selectionBannerWarning}>
            ⚠ The selected area is not in your accessible list.
          </Text>
        )}

        <View style={styles.selectionBannerActions}>
          <TouchableOpacity
            style={styles.bannerSearchBtn}
            onPress={handleManualSearch}
            disabled={loading || !selectedArea || notInUserList}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="search" size={14} color="#fff" />
                <Text style={styles.bannerSearchBtnText}>Search</Text>
              </>
            )}
          </TouchableOpacity>

          {listsLoading && (
            <ActivityIndicator
              size="small"
              color="#003844"
              style={{ marginLeft: 8 }}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
          />
        }
        contentContainerStyle={styles.contentContainer}
      >
        {/* {renderSelectionBanner()} */}

        {authError && (
          <View style={styles.authErrorContainer}>
            <Text style={styles.authErrorText}>
              ⚠️ Using demo data. Authentication issue detected. Please check
              your login.
            </Text>
          </View>
        )}

        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loaderText}>Loading...</Text>
          </View>
        )}

        {renderMap()}
        {renderDetails()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contentContainer: { padding: 10 },

  selectionBanner: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#003844',
    elevation: 2,
  },
  selectionBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectionBannerTitle: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#003844',
  },
  selectionBannerText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 8,
  },
  selectionBannerWarning: {
    fontSize: 12,
    color: '#F44336',
    marginBottom: 6,
  },
  selectionBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerSearchBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerSearchBtnText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: 'bold',
    fontSize: 12,
  },

  loaderContainer: { marginVertical: 20, alignItems: 'center' },
  loaderText: { marginTop: 10, fontSize: 16, color: '#666' },
  authErrorContainer: {
    backgroundColor: '#ff9800',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  authErrorText: { color: '#fff', textAlign: 'center', fontSize: 12 },

  mapContainer: {
    height: Dimensions.get('window').height * 0.3,
    marginVertical: 20,
    borderWidth: 2,
    borderColor: 'grey',
    borderRadius: 5,
    overflow: 'hidden',
  },
  map: { flex: 1 },

  detailsContainer: { marginTop: 20 },
  detailTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'grey',
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
    textAlign: 'left',
    width: 150,
  },
  colon: { fontSize: 14, color: '#666', textAlign: 'center', width: 10 },
  detailValue: {
    fontSize: 14,
    color: 'green',
    textAlign: 'left',
    flex: 1,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 15,
  },
});

export default DeviceDetails;