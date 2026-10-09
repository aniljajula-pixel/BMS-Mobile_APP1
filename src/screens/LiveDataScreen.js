// src/screens/LiveDataScreen.js
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
  TouchableOpacity,
  Animated,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import Svg, { Circle, Line } from 'react-native-svg';
import VoltageIcon from '../../assets/images/VoltIcon';
import CurrentIcon from '../../assets/images/Curren';
import TempIcon from '../../assets/images/Temp-icon';
import { AuthContext } from '../../AuthContext';
import { useSelection } from '../../SelectionContext';
import Alerts from './Alerts';

const API_URL = 'https://rbms.mahadiscom.in/mseb';
const MANUFACTURER_API_URL = 'https://rbms.mahadiscom.in/mseb';

const MAX_VALUES = {
  voltage: 35,
  averageChargeCurrent: 15,
  averageDischargeCurrent: 12,
  chargeOrDischargeCycle: 1000,
  batteryRunHours: 172800,
};

export function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

export function getUsername(token) {
  const decoded = decodeJWT(token);
  return decoded ? decoded.sub || null : null;
}

const safeValue = (value) => {
  if (value === null || value === undefined) return 'N/A';
  return String(value);
};

const formatDateTime = (utcDateTime, fallbackDate, fallbackTime) => {
  if (utcDateTime) {
    try {
      const date = new Date(utcDateTime);
      if (isNaN(date.getTime())) return 'Invalid date format';
      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
      });
    } catch {}
  }
  if (fallbackDate && fallbackTime) {
    try {
      const [day, month, year] = fallbackDate.split('/');
      const dateStr = `${year}-${month}-${day}T${fallbackTime}+0000`;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid date format';
      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
      });
    } catch {}
  }
  return 'No timestamp available';
};

const fetchImageAsDataUri = async (url, token) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const CycleLines = ({ cycles, color, strokeOpacity }) => {
  const maxLines = 100;
  const percentage = Math.min((cycles / 1000) * 100, 100);
  const lineCount = Math.round(percentage);
  const angleIncrement = (2 * Math.PI) / maxLines;
  const lineColor = percentage === 100 ? '#FF0000' : color;
  const lines = [];
  for (let i = 0; i < lineCount; i++) {
    const angle = i * angleIncrement;
    const x2 = 25 + 20 * Math.cos(angle);
    const y2 = 25 + 20 * Math.sin(angle);
    lines.push(
      <Line
        key={`line-${i}`}
        x1="25"
        y1="25"
        x2={x2}
        y2={y2}
        stroke={lineColor}
        strokeWidth="0.5"
        strokeOpacity={strokeOpacity}
      />
    );
  }
  return (
    <Svg height="50" width="50">
      <Circle cx="25" cy="25" r="20" stroke="#333" strokeWidth="1" fill="none" />
      {lines}
    </Svg>
  );
};

const LiveDataScreen = () => {
  const { userToken, isOfflineMode, logout } = useContext(AuthContext);

  // 🔹 Shared selection (from header pickers)
  const {
    selectedState,
    selectedZone,
    selectedCircle,
    selectedDivision,
    selectedArea,
  } = useSelection();

  /* ------------------- Data state ------------------- */
  const [batteryData, setBatteryData] = useState(null);
  const [chargerData, setChargerData] = useState(null);
  const [manufacturerData, setManufacturerData] = useState(null);
  const [documentImages, setDocumentImages] = useState([]);
  const [expandedSection, setExpandedSection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [acVoltage, setAcVoltage] = useState('');
  const [acCurrent, setAcCurrent] = useState('');
  const [frequency, setFrequency] = useState('');
  const [energy, setEnergy] = useState('');
  const [powerFactor, setPowerFactor] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [siteData, setSiteData] = useState([]);

  /* ------------------- USER-SCOPED lists ------------------- */
  const [userZones, setUserZones] = useState([]);
  const [userCircles, setUserCircles] = useState([]);
  const [userDivisions, setUserDivisions] = useState([]);
  const [userAreas, setUserAreas] = useState([]);
  const [listsLoading, setListsLoading] = useState(false);

  const pulseValue = new Animated.Value(1);
  const strokeOpacity = new Animated.Value(1);

  const startPulsing = () =>
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseValue, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

  const startSvgAnimation = () =>
    Animated.loop(
      Animated.sequence([
        Animated.timing(strokeOpacity, { toValue: 0.3, duration: 750, useNativeDriver: true }),
        Animated.timing(strokeOpacity, { toValue: 1, duration: 750, useNativeDriver: true }),
      ])
    ).start();

  useEffect(() => {
    startPulsing();
    startSvgAnimation();
  }, []);

  /* =========================================================
     USER-SCOPED fetch functions (unchanged APIs)
     ========================================================= */
  const fetchUserZones = useCallback(
    async (state) => {
      if (!state) return [];
      if (isOfflineMode) return ['Zone1', 'Zone2'];
      if (!userToken) return [];
      try {
        const res = await axios.get(
          `${API_URL}/getUserZones?stateName=${encodeURIComponent(state)}`,
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
        const data = Array.isArray(res.data) ? res.data : [];
        return [...new Set(data)];
      } catch (e) {
        console.error('fetchUserZones error:', e);
        return [];
      }
    },
    [userToken, isOfflineMode]
  );

  const fetchUserCircles = useCallback(
    async (zone) => {
      if (!zone) return [];
      if (isOfflineMode) return ['Circle1', 'Circle2'];
      if (!userToken) return [];
      try {
        const res = await axios.get(
          `${API_URL}/getUserCircles?zoneName=${encodeURIComponent(zone)}`,
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
        const data = Array.isArray(res.data) ? res.data : [];
        return [...new Set(data)];
      } catch (e) {
        console.error('fetchUserCircles error:', e);
        return [];
      }
    },
    [userToken, isOfflineMode]
  );

  const fetchUserDivisions = useCallback(
    async (circle) => {
      if (!circle) return [];
      if (isOfflineMode) return ['Division1', 'Division2'];
      if (!userToken) return [];
      try {
        const res = await axios.get(
          `${API_URL}/getUserDivisions?circleName=${encodeURIComponent(circle)}`,
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
        const data = Array.isArray(res.data) ? res.data : [];
        return [...new Set(data)];
      } catch (e) {
        console.error('fetchUserDivisions error:', e);
        return [];
      }
    },
    [userToken, isOfflineMode]
  );

  const fetchUserAreas = useCallback(
    async (division) => {
      if (!division) return [];
      if (isOfflineMode) return ['Area1', 'Area2'];
      if (!userToken) return [];
      try {
        const res = await axios.get(
          `${API_URL}/getUserAreas?divisionName=${encodeURIComponent(division)}`,
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
        const data = Array.isArray(res.data) ? res.data : [];
        return [...new Set(data)];
      } catch (e) {
        console.error('fetchUserAreas error:', e);
        return [];
      }
    },
    [userToken, isOfflineMode]
  );

  /* =========================================================
     Load user-scoped lists when selection changes
     ========================================================= */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setListsLoading(true);
      try {
        const zones = await fetchUserZones(selectedState);
        if (cancelled) return;
        setUserZones(zones);

        const circles = await fetchUserCircles(selectedZone);
        if (cancelled) return;
        setUserCircles(circles);

        const divisions = await fetchUserDivisions(selectedCircle);
        if (cancelled) return;
        setUserDivisions(divisions);

        const areas = await fetchUserAreas(selectedDivision);
        if (cancelled) return;
        setUserAreas(areas);
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

  /* =========================================================
     Battery + Charger + Manufacturer fetchers (unchanged)
     ========================================================= */
  const fetchBatteryData = async (area) => {
    if (isOfflineMode) {
      setBatteryData({
        stringvoltage: 30,
        instantaneousCurrent: 8,
        ambientTemperature: 25,
        chargeOrDischargeCycle: 100,
        socLatestValueForEveryCycle: 80,
        dodLatestValueForEveryCycle: 20,
        systemPeakCurrentInChargeOneCycle: 12,
        averageChargingCurrent: 10,
        ahInForOneChargeCycle: 50,
        chargeTimeCycle: 7200,
        systemPeakCurrentInDischargeOneCycle: 11,
        averageDischargingCurrent: 9,
        ahOutForOneDischargeCycle: 45,
        cumulativeAHIn: 200,
        cumulativeAHOut: 180,
        totalChargingEnergy: 500,
        totalDischargingEnergy: 450,
        batteryRunHours: 86400,
        packetDateTime: '2025-07-11T06:42:30.000+0000',
        bmsAlarmsDTO: { ambientTemperatureHN: false, stringVoltageLNH: false, bankDischargeCycle: false },
      });
      setChargerData({
        chargerLoad: false,
        inputMains: false,
        inputPhase: false,
        acVoltageULN: 1,
        chargerTrip: false,
        outputMccb: false,
        inputFuse: false,
        rectifierFuse: false,
        filterFuse: false,
        outputFuse: false,
        alarmSupplyFuse: false,
        buzzer: false,
      });
      setAcVoltage(220);
      setAcCurrent(5);
      setFrequency(50);
      setEnergy(1000);
      setPowerFactor(0.95);
      setSiteData([
        { siteId: 'SITE1', serialNumber: 'SN001', area, key: 'site-SITE1-0' },
        { siteId: 'SITE2', serialNumber: 'SN002', area, key: 'site-SITE2-1' },
      ]);
      return;
    }

    if (!userToken) {
      Alert.alert('Error', 'Authentication required. Please log in again.');
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/getGeneralDataBySiteIdAndSerialNumber?area=${encodeURIComponent(area)}`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      const data = Array.isArray(response.data) ? response.data : [response.data];
      if (data.length === 0) {
        setBatteryData(null);
        setChargerData(null);
        setSiteData([]);
        return;
      }
      const item = data[0];
      const packetDateTime = item.packetDateTime || null;
      const fallbackDate = item.date || null;
      const fallbackTime = item.time || null;
      if (!item.deviceDataDTO?.length) {
        setBatteryData({ packetDateTime, date: fallbackDate, time: fallbackTime });
        setChargerData(null);
        setSiteData([]);
        return;
      }
      const deviceData = item.deviceDataDTO[0];
      setBatteryData({
        ...deviceData,
        packetDateTime,
        date: fallbackDate,
        time: fallbackTime,
      });
      setSiteData([
        {
          siteId: item.siteId,
          serialNumber: deviceData.serialNumber,
          area,
          key: `site-${item.siteId}-0`,
        },
      ]);
      await fetchChargerData(item.siteId);
    } catch (error) {
      console.error('[fetchBatteryData] Error:', error);
      setBatteryData(null);
      setChargerData(null);
      setSiteData([]);
      throw error;
    }
  };

  const fetchChargerData = async (siteId) => {
    if (isOfflineMode) {
      setChargerData({
        chargerLoad: false,
        inputMains: false,
        inputPhase: false,
        acVoltageULN: 1,
        chargerTrip: false,
        outputMccb: false,
        inputFuse: false,
        rectifierFuse: false,
        filterFuse: false,
        outputFuse: false,
        alarmSupplyFuse: false,
        buzzer: false,
      });
      setAcVoltage(220);
      setAcCurrent(5);
      setFrequency(50);
      setEnergy(1000);
      setPowerFactor(0.95);
      return;
    }
    if (!userToken) return;
    try {
      const response = await axios.get(
        `${API_URL}/getChargerMonitoringDataBySiteId?siteId=${encodeURIComponent(siteId)}`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      const data = response.data[0];
      if (data) {
        setChargerData(data);
        setAcVoltage(safeValue(data.acVoltage));
        setAcCurrent(safeValue(data.acCurrent));
        setFrequency(safeValue(data.frequency));
        setEnergy(safeValue(data.energy));
        setPowerFactor(safeValue(data.powerFactor));
      } else {
        setChargerData(null);
        setAcVoltage('N/A');
        setAcCurrent('N/A');
        setFrequency('N/A');
        setEnergy('N/A');
        setPowerFactor('N/A');
      }
    } catch (error) {
      console.error('[fetchChargerData] Error:', error);
      setChargerData(null);
      setAcVoltage('N/A');
      setAcCurrent('N/A');
      setFrequency('N/A');
      setEnergy('N/A');
      setPowerFactor('N/A');
      throw error;
    }
  };

  const fetchManufacturerData = async (area) => {
    setManufacturerData(null);
    setDocumentImages([]);
    if (!area) return;
    if (isOfflineMode) {
      setManufacturerData({
        latitude: 17.441675,
        longitude: 78.39288,
        customer: 'MAHAVITARAN',
        ahCapacity: '100',
        location: area,
        firstUsedDate: '2026-09-15',
        batterySerialNumber: 'YYGG',
        batteryBankType: 'TUBULAR',
        manufacturerName: 'GGGG',
        individualCellVoltage: '2.0',
        designVoltage: '30',
        kva: 'GGYU',
        batteryAboutToDie: '1.8',
        highTemperature: '40.0',
        openBattery: '1.7',
        highVoltage: '2.4',
        lowVoltage: '1.9',
        urls: { description: 'Ggg', documentUrlsList: [] },
      });
      return;
    }
    if (!userToken) return;
    try {
      const response = await axios.get(
        `${MANUFACTURER_API_URL}/getManufacturerDetailsBySiteIdAndSerialNumber?area=${encodeURIComponent(area)}`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      const data = response.data;
      if (!data) return;
      setManufacturerData(data);
      const docs = data?.urls?.documentUrlsList;
      if (Array.isArray(docs) && docs.length > 0) {
        const imgs = [];
        for (const d of docs) {
          if (!d || d.id == null) continue;
          const url = `${MANUFACTURER_API_URL}/api/documents/${d.id}/download`;
          try {
            const dataUri = await fetchImageAsDataUri(url, userToken);
            imgs.push({
              id: d.id,
              originalFilename: d.originalFilename,
              uri: dataUri,
            });
          } catch (err) {
            console.error('[fetchManufacturerData] Doc download failed', d.id, err);
          }
        }
        setDocumentImages(imgs);
      }
    } catch (error) {
      console.error('[fetchManufacturerData] Error:', error);
      setManufacturerData(null);
      setDocumentImages([]);
    }
  };

  /* =========================================================
     Search — now driven by context, no pickers in this screen
     ========================================================= */
  const runSearch = useCallback(
    async (area) => {
      if (!area) return;
      setLoading(true);
      setHasSearched(true);
      try {
        await fetchBatteryData(area);
        await fetchManufacturerData(area);
      } catch (error) {
        console.error('Error during search:', error);
        Alert.alert('Error', 'Failed to fetch data. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOfflineMode, userToken]
  );

  /* =========================================================
     ✅ Auto-fetch when selectedArea is fully available
     Requires: selectedArea + it exists in user's accessible list
     ========================================================= */
  const lastFetchedArea = useRef('');

  useEffect(() => {
    if (!selectedArea) return;
    if (userAreas.length === 0) return;   // wait for user's list
    if (!userAreas.includes(selectedArea)) {
      // The header selection is not in the user's accessible list
      setBatteryData(null);
      setChargerData(null);
      setManufacturerData(null);
      setDocumentImages([]);
      setHasSearched(false);
      return;
    }
    if (lastFetchedArea.current === selectedArea) return;
    lastFetchedArea.current = selectedArea;
    runSearch(selectedArea);
  }, [selectedArea, userAreas, runSearch]);

  /* =========================================================
     Refresh handler
     ========================================================= */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (selectedArea && userAreas.includes(selectedArea)) {
        lastFetchedArea.current = '';   // force re-fetch
        await runSearch(selectedArea);
      } else {
        setBatteryData(null);
        setChargerData(null);
        setManufacturerData(null);
        setDocumentImages([]);
        setAcVoltage('');
        setAcCurrent('');
        setFrequency('');
        setEnergy('');
        setPowerFactor('');
        setHasSearched(false);
      }
    } finally {
      setRefreshing(false);
    }
  };

  /* =========================================================
     Search button — manual re-fetch
     ========================================================= */
  const handleManualSearch = async () => {
    if (!selectedArea) {
      Alert.alert(
        'Selection Required',
        'Please pick State, Zone, Circle, Division and Area from the header.'
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
    await runSearch(selectedArea);
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getIconColor = (paramKey, value) => {
    const maxValue = MAX_VALUES[paramKey];
    if (!value || !maxValue) return '#4CAF50';
    return parseFloat(value) > maxValue ? '#F44336' : '#4CAF50';
  };

  const ChargeTime = (seconds) => {
    if (seconds == null || isNaN(seconds)) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const renderSiteData = () => {
    if (!hasSearched || !selectedArea) return null;
    return (
      <View style={styles.siteDataContainer}>
        <Text style={styles.siteDataTitle}>Site Information</Text>
        <View style={styles.siteDataRow}>
          <Text style={styles.siteDataLabel}>SubStation:</Text>
          <Text style={styles.siteDataValue}>{selectedArea}</Text>
        </View>
      </View>
    );
  };

  const hasManufacturerUrls = manufacturerData?.urls != null;

  const renderUrlsContent = () => {
    if (!hasManufacturerUrls) return null;
    const description = manufacturerData?.urls?.description;
    const hasDocs = documentImages.length > 0;
    return (
      <View style={styles.urlsCard}>
        {description ? (
          <View style={styles.descriptionHighlight}>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>
        ) : null}
        {hasDocs ? (
          <View style={styles.documentsContainer}>
            <Text style={styles.documentsHeading}>Documents</Text>
            {documentImages.map((doc) => (
              <View key={`doc-${doc.id}`} style={styles.documentItem}>
                <Text style={styles.documentName} numberOfLines={1}>
                  {doc.originalFilename || `Document ${doc.id}`}
                </Text>
                <Image
                  source={{ uri: doc.uri }}
                  style={styles.documentImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No documents available.</Text>
          </View>
        )}
      </View>
    );
  };

  /* =========================================================
     Header-status banner (replaces the old picker block)
     ========================================================= */
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
            ? `${selectedState || '-'} › ${selectedZone || '-'} › ${selectedCircle || '-'} › ${selectedDivision || '-'} › ${selectedArea}`
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
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        {/* {renderSelectionBanner()} */}
        {renderSiteData()}

        {hasManufacturerUrls ? (
          renderUrlsContent()
        ) : (
          <>
            <View style={styles.dateTimeContainer}>
              <Text style={styles.dateTimeLabel}>Live Time:</Text>
              <Text style={styles.dateTimeValue}>
                {batteryData
                  ? formatDateTime(
                      batteryData.packetDateTime,
                      batteryData.date,
                      batteryData.time
                    )
                  : 'Loading battery data...'}
              </Text>
            </View>

            {!loading && hasSearched && !batteryData?.stringvoltage && (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>
                  No battery data available for the selected area.
                </Text>
              </View>
            )}

            {batteryData?.stringvoltage && (
              <View style={styles.paramContainer}>
                {[
                  {
                    name: 'Voltage',
                    icon: 'battery',
                    value: batteryData.stringvoltage,
                    voltageStatus: batteryData.bmsAlarmsDTO?.stringVoltageLNH || 0,
                  },
                  {
                    name: 'Current',
                    icon: 'bolt',
                    value: batteryData.instantaneousCurrent,
                    isHighCurrent: batteryData.bmsAlarmsDTO?.bankDischargeCycle || false,
                  },
                  {
                    name: 'Temperature',
                    icon: 'thermometer',
                    value: batteryData.ambientTemperature,
                    isHighTemperature: batteryData.bmsAlarmsDTO?.ambientTemperatureHN || false,
                  },
                  {
                    name: 'Charge-Discharge Cycle',
                    icon: 'battery-full',
                    value: batteryData.chargeOrDischargeCycle,
                    paramKey: 'chargeOrDischargeCycle',
                  },
                  {
                    name: 'Battery Run Hours',
                    icon: 'clock-o',
                    value: ChargeTime(batteryData.batteryRunHours),
                    paramKey: 'batteryRunHours',
                  },
                ].map((param, index) => {
                  const iconColor = param.paramKey
                    ? getIconColor(param.paramKey, param.value || '0')
                    : '#4CAF50';
                  const animationStyle = { transform: [{ scale: pulseValue }] };
                  const displayValue =
                    param.name === 'Voltage'
                      ? `${safeValue(param.value)} V`
                      : param.name === 'Current'
                      ? `${safeValue(param.value)} A`
                      : param.name === 'Temperature'
                      ? `${safeValue(param.value)} °C`
                      : safeValue(param.value);
                  return (
                    <TouchableOpacity key={`param-${index}`} style={styles.paramCard}>
                      <Text style={styles.paramTitle}>{param.name}</Text>
                      <Text style={styles.paramValue}>{displayValue}</Text>
                      <Animated.View style={animationStyle}>
                        {param.name === 'Voltage' ? (
                          <VoltageIcon voltageStatus={param.voltageStatus} />
                        ) : param.name === 'Current' ? (
                          <CurrentIcon isHighCurrent={param.isHighCurrent} />
                        ) : param.name === 'Temperature' ? (
                          <TempIcon isHighTemperature={param.isHighTemperature} />
                        ) : param.name === 'Charge-Discharge Cycle' ? (
                          <CycleLines
                            cycles={param.value}
                            color={iconColor}
                            strokeOpacity={strokeOpacity}
                          />
                        ) : (
                          <Icon name={param.icon} size={40} color={iconColor} />
                        )}
                      </Animated.View>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={styles.paramCard} key="soc-dod">
                  <Text style={styles.paramTitle}>SOC & DOD</Text>
                  <View style={styles.socDodContainer}>
                    <View style={styles.batteryContainer}>
                      <View style={styles.batteryOutline}>
                        <View
                          style={[
                            styles.batteryLevel,
                            {
                              width: `${batteryData.socLatestValueForEveryCycle || 0}%`,
                              backgroundColor: '#00ff00',
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.batteryLevel,
                            {
                              width: `${100 - (batteryData.socLatestValueForEveryCycle || 0)}%`,
                              backgroundColor: '#F44336',
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.batteryCap} />
                    </View>
                    <View style={styles.socDodTextContainer}>
                      <Text style={styles.socDodText}>
                        SOC: {safeValue(batteryData.socLatestValueForEveryCycle)}%
                      </Text>
                      <Text style={styles.socDodText}>
                        DOD: {safeValue(batteryData.dodLatestValueForEveryCycle)}%
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {batteryData?.stringvoltage && (
              <Alerts batteryData={batteryData} chargerData={chargerData} />
            )}

            {batteryData?.stringvoltage && (
              <TouchableOpacity
                style={styles.sectionCard}
                onPress={() => toggleSection('charger')}
              >
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Charger Information</Text>
                  <Text style={styles.dropdownIcon}>
                    {expandedSection === 'charger' ? '▲' : '▼'}
                  </Text>
                </View>
                {expandedSection === 'charger' && (
                  <View style={styles.expandedSection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>AC Voltage</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>{acVoltage} V</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>AC Current</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>{acCurrent} A</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Frequency</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>{frequency} Hz</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>AC Energy</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>{energy} kWh</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Power Factor</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>{powerFactor}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {batteryData?.stringvoltage && (
              <TouchableOpacity
                style={styles.sectionCard}
                onPress={() => toggleSection('charge')}
              >
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Charge Cycle Information</Text>
                  <Text style={styles.dropdownIcon}>
                    {expandedSection === 'charge' ? '▲' : '▼'}
                  </Text>
                </View>
                {expandedSection === 'charge' && (
                  <View style={styles.expandedSection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Peak Current</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>
                        {safeValue(batteryData.systemPeakCurrentInChargeOneCycle)} A
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Average Current</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>
                        {safeValue(batteryData.averageChargingCurrent)} A
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ampere Hour In</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>
                        {safeValue(batteryData.ahInForOneChargeCycle)} Ah
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Run Time</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>
                        {safeValue(ChargeTime(batteryData.chargeTimeCycle))}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {batteryData?.stringvoltage && (
              <TouchableOpacity
                style={styles.sectionCard}
                onPress={() => toggleSection('discharge')}
              >
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Discharge Cycle Information
                  </Text>
                  <Text style={styles.dropdownIcon}>
                    {expandedSection === 'discharge' ? '▲' : '▼'}
                  </Text>
                </View>
                {expandedSection === 'discharge' && (
                  <View style={styles.expandedSection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Peak Current</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>
                        {safeValue(
                          batteryData.systemPeakCurrentInDischargeOneCycle
                        )}{' '}
                        A
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Average Current</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>
                        {safeValue(batteryData.averageDischargingCurrent)} A
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ampere Hour Out</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>
                        {safeValue(batteryData.ahOutForOneDischargeCycle)} Ah
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Run Time</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>
                        {safeValue(ChargeTime(batteryData.dischargeTimeCycle))}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {batteryData?.stringvoltage && (
              <TouchableOpacity
                style={styles.sectionCard}
                onPress={() => toggleSection('cumulative')}
              >
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Cumulative Information</Text>
                  <Text style={styles.dropdownIcon}>
                    {expandedSection === 'cumulative' ? '▲' : '▼'}
                  </Text>
                </View>
                {expandedSection === 'cumulative' && (
                  <View style={styles.expandedSection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ampere Hour In</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>
                        {safeValue(batteryData.cumulativeAHIn)} Ah
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ampere Hour Out</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>
                        {safeValue(batteryData.cumulativeAHOut)} Ah
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Charging Energy</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>
                        {safeValue(batteryData.totalChargingEnergy)} kWh
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Discharging Energy</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>
                        {safeValue(batteryData.totalDischargingEnergy)} kWh
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Battery Run Hours</Text>
                      <Text style={styles.colon}>:</Text>
                      <Text style={styles.detailValue}>
                        {safeValue(ChargeTime(batteryData.batteryRunHours))}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContainer: { padding: 10 },

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

  siteDataContainer: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 3,
  },
  siteDataTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  siteDataRow: {
    marginBottom: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  siteDataLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  siteDataValue: { fontSize: 14, color: '#4CAF50', fontWeight: 'bold' },

  paramContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  paramCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 5,
    margin: 5,
    width: '30%',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    borderWidth: 0.5,
    borderColor: '#000000',
  },
  paramTitle: { fontSize: 12, fontWeight: 'bold', color: '#000000' },
  paramValue: { fontSize: 14, color: 'green' },
  socDodContainer: { alignItems: 'center', marginVertical: 10 },
  socDodTextContainer: { alignItems: 'center' },
  socDodText: { fontSize: 12, color: 'green' },
  sectionCard: {
    backgroundColor: '#ffffff',
    padding: 10,
    marginVertical: 5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#000000' },
  dropdownIcon: { fontSize: 12, color: '#000000' },
  expandedSection: { marginTop: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  detailLabel: {
    fontSize: 12,
    color: '#000000',
    textAlign: 'left',
    width: 150,
  },
  colon: { fontSize: 14, color: '#000000', textAlign: 'center', width: 10 },
  detailValue: {
    fontSize: 14,
    color: 'green',
    textAlign: 'left',
    flex: 1,
  },
  noDataContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    padding: 10,
  },
  noDataText: { fontSize: 16, color: '#666', textAlign: 'center' },
  batteryContainer: {
    width: 60,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  batteryOutline: {
    width: 50,
    height: 20,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 2,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  batteryLevel: { height: '100%' },
  batteryCap: {
    width: 3,
    height: 10,
    backgroundColor: '#000000',
    borderRadius: 1,
    marginLeft: 1,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000000',
  },
  dateTimeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 5,
  },
  dateTimeValue: { fontSize: 14, color: 'green' },

  urlsCard: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    elevation: 4,
  },
  descriptionHighlight: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 5,
    borderLeftColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    textAlign: 'center',
    lineHeight: 22,
  },
  documentsContainer: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 10,
  },
  documentsHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  documentItem: { marginBottom: 14 },
  documentName: { fontSize: 12, color: '#555', marginBottom: 4 },
  documentImage: {
    width: '100%',
    height: 260,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
  },
});

export default LiveDataScreen;