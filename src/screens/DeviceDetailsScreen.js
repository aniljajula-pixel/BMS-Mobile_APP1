// src/screens/DeviceDetails.js
import React, { useState, useEffect, useContext, useRef } from 'react';
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
import RNPickerSelect from 'react-native-picker-select';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome';
import { AuthContext } from '../../AuthContext';

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
  'WAGLE ESTATE'
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
  'VASANTH VIHAR'
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
const LeafletMapView = ({ latitude, longitude, locationName, ahCapacity, markerIcon }) => {
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
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f0f0f0" }}>
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

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [circles, setCircles] = useState([]);
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [siteId, setSiteId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [siteInfo, setSiteInfo] = useState(null);
  const [manufacturerDetails, setManufacturerDetails] = useState(null);
  const [thresholds, setThresholds] = useState(null);
  const [siteLocation, setSiteLocation] = useState(null);
  const [statusData, setStatusData] = useState([]); 

  /* Auto-refresh every 60s */
  useEffect(() => {
    if (!hasSearched || !siteInfo || authError) return;
    const id = setInterval(() => fetchDeviceData(), 60_000);
    return () => clearInterval(id);
  }, [hasSearched, siteInfo, authError]);

  /* Load states */
  useEffect(() => {
    fetchStates();  
  }, [isOfflineMode]);

  /* --------------------------------------------------------------
     API: States
     -------------------------------------------------------------- */
  const fetchStates = async () => {
    if (isOfflineMode) {
      setStates(MOCK_STATES);
      return;
    }

    if (!userToken) {
      console.log('No user token available for fetching states');
      setStates(MOCK_STATES);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/states`, {
        headers: { Authorization: `Bearer ${userToken}` },
        timeout: 10000,
      });
      const valid = (res.data ?? [])
        .map(s => s.name)
        .filter(n => n && n.trim() && n !== 'MAHARASHTRA Pune');
      setStates(valid);
      setAuthError(false);
    } catch (e) {
      console.error('Error fetching states:', e);
      if (e.response?.status === 401) {
        setStates(MOCK_STATES);
        setAuthError(true);
      } else {
        Alert.alert('Error', `Failed to load states: ${e.message}`);
        setStates(MOCK_STATES);
      }
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------------------
     API: Zones
     -------------------------------------------------------------- */
  const fetchZonesForState = async (state) => {
    if (isOfflineMode) {
      setZones(MOCK_ZONES);
      return;
    }

    if (!userToken) {
      setZones(MOCK_ZONES);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/getUserZones?stateName=${encodeURIComponent(state)}`,
        { 
          headers: { Authorization: `Bearer ${userToken}` },
          timeout: 10000,
        }
      );
      const data = Array.isArray(res.data) ? res.data : [];
      const uniqueZones = [...new Set(data)];
      setZones(uniqueZones);
    } catch (e) {
      console.error('Error fetching zones:', e);
      if (e.response?.status === 401) {
        setZones(MOCK_ZONES);
        setAuthError(true);
      } else {
        Alert.alert('Error', `Failed to load zones: ${e.message}`);
        setZones(MOCK_ZONES);
      }
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------------------
     API: Circles
     -------------------------------------------------------------- */
  const fetchCirclesForZone = async (zone) => {
    if (isOfflineMode) {
      setCircles(MOCK_CIRCLES);
      return;
    }

    if (!userToken) {
      setCircles(MOCK_CIRCLES);
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/getUserCircles?zoneName=${encodeURIComponent(zone)}`,
        { 
          headers: { Authorization: `Bearer ${userToken}` },
          timeout: 10000,
        }
      );
      const data = Array.isArray(response.data) ? response.data : [];
      const uniqueCircles = [...new Set(data)];
      setCircles(uniqueCircles);
    } catch (e) {
      console.error('Error fetching circles:', e);
      if (e.response?.status === 401) {
        setCircles(MOCK_CIRCLES);
        setAuthError(true);
      } else {
        Alert.alert('Error', `Failed to load circles: ${e.message}`);
        setCircles(MOCK_CIRCLES);
      }
    }
  };

  /* --------------------------------------------------------------
     API: Divisions
     -------------------------------------------------------------- */
  const fetchDivisionsForCircle = async (circle) => {
    if (isOfflineMode) {
      setDivisions(MOCK_DIVISIONS);
      return;
    }

    if (!userToken) {
      setDivisions(MOCK_DIVISIONS);
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/getUserDivisions?circleName=${encodeURIComponent(circle)}`,
        { 
          headers: { Authorization: `Bearer ${userToken}` },
          timeout: 10000,
        }
      );
      const data = Array.isArray(response.data) ? response.data : [];
      const uniqueDivisions = [...new Set(data)];
      setDivisions(uniqueDivisions);
    } catch (e) {
      console.error('Error fetching divisions:', e);
      if (e.response?.status === 401) {
        setDivisions(MOCK_DIVISIONS);
        setAuthError(true);
      } else {
        Alert.alert('Error', `Failed to load divisions: ${e.message}`);
        setDivisions(MOCK_DIVISIONS);
      }
    }
  };

  /* --------------------------------------------------------------
     API: Areas
     -------------------------------------------------------------- */
  const fetchAreasForDivision = async (division) => {
    if (isOfflineMode) {
      setAreas(MOCK_AREAS);
      return;
    }

    if (!userToken) {
      setAreas(MOCK_AREAS);
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/getUserAreas?divisionName=${encodeURIComponent(division)}`,
        { 
          headers: { Authorization: `Bearer ${userToken}` },
          timeout: 10000,
        }
      );
      const data = Array.isArray(response.data) ? response.data : [];
      const uniqueAreas = [...new Set(data)];
      setAreas(uniqueAreas);
    } catch (e) {
      console.error('Error fetching areas:', e);
      if (e.response?.status === 401) {
        setAreas(MOCK_AREAS);
        setAuthError(true);
      } else {
        Alert.alert('Error', `Failed to load areas: ${e.message}`);
        setAreas(MOCK_AREAS);
      }
    }
  };

  /* --------------------------------------------------------------
     API: Manufacturer + Thresholds + Location
     -------------------------------------------------------------- */
  const fetchDeviceData = async () => {
    if (isOfflineMode || authError || !userToken) {
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
        `https://rbms.mahadiscom.in/mseb/getManufacturerDetailsBySiteIdAndSerialNumber?area=${selectedArea}`,
        { 
          headers: { Authorization: `Bearer ${userToken}` },
          timeout: 15000,
        }
      );

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

      if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
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
      console.error('Error fetching device details:', e);
      if (e.response?.status === 401) {
        // Use mock data on auth error
        setManufacturerDetails(MOCK_DETAILS);
        setThresholds(MOCK_DETAILS);
        setSiteLocation({
          latitude: MOCK_DETAILS.latitude,
          longitude: MOCK_DETAILS.longitude,
          locationName: MOCK_DETAILS.location,
        });
        setAuthError(true);
        Alert.alert('Notice', 'Using demo data due to authentication issue. Please check your login status.');
      } else {
        Alert.alert('Error', `Failed to load device details: ${e.message}`);
        resetResults();
      }
    } finally {
      setLoading(false);
    }
  };

  const resetResults = () => {
    setSiteInfo(null);
    setManufacturerDetails(null);
    setThresholds(null);
    setSiteLocation(null);
    setHasSearched(false);
  };

  /* Picker Handlers */
  const onStateChange = (v) => {
    setSelectedState(v); 
    resetResults();
    setSelectedZone(null); 
    setSelectedCircle(null); 
    setSelectedDivision(null);
    setSelectedArea(null);
    setZones([]); 
    setCircles([]); 
    setDivisions([]);
    setAreas([]);
    if (v) fetchZonesForState(v);
  };

  const onZoneChange = (v) => {
    setSelectedZone(v);
    resetResults();
    setSelectedCircle(null);
    setSelectedDivision(null);
    setSelectedArea(null);
    setCircles([]);
    setDivisions([]);
    setAreas([]);
    if (v) fetchCirclesForZone(v);
  };

  const onCircleChange = (v) => {
    setSelectedCircle(v); 
    resetResults();
    setSelectedDivision(null); 
    setSelectedArea(null);
    setDivisions([]);
    setAreas([]);
    if (v) fetchDivisionsForCircle(v);
  };

  const onDivisionChange = (v) => {
    setSelectedDivision(v);
    resetResults();
    setSelectedArea(null);
    setAreas([]);
    if (v) fetchAreasForDivision(v);
  };

  const onAreaChange = (v) => { 
    setSelectedArea(v); 
    resetResults(); 
  };

  /* Search */
  const performSearch = async () => {
    if (!selectedState || !selectedZone || !selectedCircle || !selectedDivision || !selectedArea) {
      Alert.alert('Required', 'Please select all fields.');
      return;
    }

    const area = selectedArea.trim();
    if (!area) return;

    setLoading(true);
    setHasSearched(true);

    try {
      await fetchDeviceData();
    } catch (e) {
      console.error('Search failed:', e);
      if (e.response?.status !== 401) {
        Alert.alert('Search Failed', e.message);
      }
      setHasSearched(false);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (hasSearched && siteInfo) {
      await fetchDeviceData();
    } else {
      await fetchStates();
    }
    setRefreshing(false);
  };

  /* Map Marker Icon */
  const getMarkerIcon = () => {
    const status = statusData.find(s => s.siteId === siteInfo?.siteId);
    return status?.statusType === 1
      ? 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-2x-green.png'
      : 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-2x-red.png';
  };

  /* Render Map */
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

  const renderDetails = () => {
    if (!hasSearched) return null;
    if (!manufacturerDetails && !thresholds) return <Text style={styles.noDataText}>No details found.</Text>;

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

  const formatLabel = (k) => ({
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

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Pickers */}
        <View style={styles.searchContainer}>
          {/* State and Zone Row */}
          <View style={styles.pickerRow}>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={onStateChange}
                items={states.map((s, i) => ({ label: s, value: s, key: `s-${i}` }))}
                placeholder={{ label: 'Select a state...', value: null }}
                style={pickerSelectStyles}
                value={selectedState}
                useNativeAndroidPickerStyle={false}
              />
            </View>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={onZoneChange}
                items={zones.map((z, i) => ({ label: z, value: z, key: `z-${i}` }))}
                placeholder={{ label: 'Select a zone...', value: null }}
                style={pickerSelectStyles}
                disabled={!selectedState}
                value={selectedZone}
                useNativeAndroidPickerStyle={false}
              />
            </View>
          </View>

          {/* Circle and Division Row */}
          <View style={styles.pickerRow}>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={onCircleChange}
                items={circles.map((circle, i) => ({
                  label: circle,
                  value: circle,
                  key: `c-${i}`
                }))}
                placeholder={{ label: 'Select a circle...', value: null }}
                style={pickerSelectStyles}
                disabled={!selectedZone}
                value={selectedCircle}
                useNativeAndroidPickerStyle={false}
              />
            </View>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={onDivisionChange}
                items={divisions.map((d, i) => ({ label: d, value: d, key: `d-${i}` }))}
                placeholder={{ label: 'Select a division...', value: null }}
                style={pickerSelectStyles}
                disabled={!selectedCircle}
                value={selectedDivision}
                useNativeAndroidPickerStyle={false}
              />
            </View>
          </View>

          {/* Area and Search Row */}
          <View style={styles.pickerRow}>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={onAreaChange}
                items={areas.map((a, i) => ({ label: a, value: a, key: `a-${i}` }))}
                placeholder={{ label: 'Select an area...', value: null }}
                style={pickerSelectStyles}
                disabled={!selectedDivision || areas.length === 0}
                value={selectedArea}
                useNativeAndroidPickerStyle={false}
              />
            </View>
            <TouchableOpacity style={styles.searchIconButton} onPress={performSearch} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="search" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Auth Error Notice */}
        {authError && (
          <View style={styles.authErrorContainer}>
            <Text style={styles.authErrorText}>
              ⚠️ Using demo data. Authentication issue detected. Please check your login.
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

/* --------------------------------------------------------------
   Styles
   -------------------------------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contentContainer: { padding: 10 },
  searchContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 6 },
  pickerContainer: { width: '46%', height: 32, marginRight: 4 },
  searchIconButton: {
    backgroundColor: '#4CAF50',
    padding: 6,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
    marginLeft: 0,
  },
  loaderContainer: { marginVertical: 20, alignItems: 'center' },
  loaderText: { marginTop: 10, fontSize: 16, color: '#666' },
  authErrorContainer: {
    backgroundColor: '#ff9800',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  authErrorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 12,
  },

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
  detailTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  detailCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'grey',
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  detailLabel: { fontSize: 14, color: '#666', fontWeight: 'bold', textAlign: 'left', width: 150 },
  colon: { fontSize: 14, color: '#666', textAlign: 'center', width: 10 },
  detailValue: { fontSize: 14, color: 'green', textAlign: 'left', flex: 1 },
  noDataText: { fontSize: 16, color: '#666', textAlign: 'center', marginVertical: 15 },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#4CAF50',
    fontSize: 11,
    color: '#000',
    height: 32,
    width: '100%',
    textAlign: 'left',
  },
  inputAndroid: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#4CAF50',
    fontSize: 11,
    color: '#000',
    height: 32,
    width: '100%',
    textAlign: 'left',
  },
});

export default DeviceDetails;