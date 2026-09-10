import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView, Alert, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import RNPickerSelect from 'react-native-picker-select';
import Svg, { Circle, Line } from 'react-native-svg';
import VoltageIcon from '../../assets/images/VoltIcon';
import CurrentIcon from '../../assets/images/Curren';
import TempIcon from '../../assets/images/Temp-icon';
import { AuthContext } from '../../AuthContext';
import Alerts from './Alerts';

const API_URL = 'https://rbms.mahadiscom.in/mseb'; // Updated base URL

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
  console.log('[safeValue] Input value:', value, typeof value);
  if (value === null || value === undefined) return 'N/A';
  return String(value);
};

const formatDateTime = (utcDateTime, fallbackDate, fallbackTime) => {
  console.log('[formatDateTime] Input:', { utcDateTime, fallbackDate, fallbackTime });
  if (utcDateTime) {
    try {
      const date = new Date(utcDateTime);
      if (isNaN(date.getTime())) {
        console.log('[formatDateTime] Invalid date format for utcDateTime');
        return 'Invalid date format';
      }
      const istDateTime = date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
      });
      console.log('[formatDateTime] Formatted IST from utcDateTime:', istDateTime);
      return istDateTime;
    } catch (error) {
      console.error('[formatDateTime] Error parsing utcDateTime:', error);
    }
  }
  if (fallbackDate && fallbackTime) {
    try {
      const [day, month, year] = fallbackDate.split('/');
      const dateStr = `${year}-${month}-${day}T${fallbackTime}+0000`;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.log('[formatDateTime] Invalid date format for fallback');
        return 'Invalid date format';
      }
      const istDateTime = date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
      });
      console.log('[formatDateTime] Formatted IST from fallback:', istDateTime);
      return istDateTime;
    } catch (error) {
      console.error('[formatDateTime] Error parsing fallback date/time:', error);
    }
  }
  console.log('[formatDateTime] No timestamp provided');
  return 'No timestamp available';
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
  const [batteryData, setBatteryData] = useState(null);
  const [chargerData, setChargerData] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [acVoltage, setAcVoltage] = useState('');
  const [acCurrent, setAcCurrent] = useState('');
  const [frequency, setFrequency] = useState('');
  const [energy, setEnergy] = useState('');
  const [powerFactor, setPowerFactor] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
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
  const [siteData, setSiteData] = useState([]);

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
    fetchStates();
  }, [isOfflineMode, userToken]);

  const fetchStates = async () => {
    if (isOfflineMode) {
      setStates(['MAHARASHTRA', 'ANDHRA PRADESH']);
      return;
    }
    
    if (!userToken) {
      console.log('No user token available');
      return;
    }
    
    try {
      const response = await axios.get(`${API_URL}/api/states`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!Array.isArray(response.data)) {
        console.warn('fetchStates: Invalid response structure', response.data);
        Alert.alert('Warning', 'No states found.');
        return;
      }
      const validStates = response.data
        .map((state) => state.name)
        .filter((name) => name && name.trim() && name !== 'MAHARASTRAPune');
      setStates(validStates);
    } catch (error) {
      console.error('Error fetching states:', error);
      Alert.alert('Error', 'Failed to fetch states. Please try again.');
      // Removed session expired alert
    }
  };

  const fetchZonesForState = async (state) => {
    if (!state) return;
    
    if (isOfflineMode) {
      setZones(['Zone1', 'Zone2']);
      return;
    }
    
    if (!userToken) {
      console.log('No user token available');
      return;
    }
    
    try {
      const response = await axios.get(
        `${API_URL}/getUserZones?stateName=${encodeURIComponent(state)}`,
        { 
          headers: { 
            Authorization: `Bearer ${userToken}`,
          } 
        }
      ); 
      
      const zoneData = Array.isArray(response.data) ? response.data : [];
      const uniqueZones = [...new Set(zoneData)];
      setZones(uniqueZones);
      
    } catch (error) {
      console.error('Error fetching zones:', error);
      Alert.alert('Error', 'Failed to load zones. Please check your connection.');
    }
  };

  const fetchCirclesForZone = async (zone) => {
    if (!zone) return;
    
    if (isOfflineMode) {
      setCircles(['Circle1', 'Circle2']);
      return;
    }
    
    if (!userToken) {
      console.log('No user token available');
      return;
    }
    
    try {
      const response = await axios.get(
        `${API_URL}/getUserCircles?zoneName=${encodeURIComponent(zone)}`,
        { 
          headers: { 
            Authorization: `Bearer ${userToken}`,
          } 
        }
      );
      
      const circleData = Array.isArray(response.data) ? response.data : [];
      const uniqueCircles = [...new Set(circleData)];
      setCircles(uniqueCircles);
      
    } catch (error) {
      console.error('Error fetching circles:', error);
      Alert.alert('Error', 'Failed to load circles. Please check your connection.');
    }
  };

  const fetchDivisionsForCircle = async (circle) => {
    if (!circle) return;
    
    if (isOfflineMode) {
      setDivisions(['Division1', 'Division2']);
      return;
    }
    
    if (!userToken) {
      console.log('No user token available');
      return;
    }
    
    try {
      const response = await axios.get(
        `${API_URL}/getUserDivisions?circleName=${encodeURIComponent(circle)}`,
        { 
          headers: { 
            Authorization: `Bearer ${userToken}`,
          } 
        }
      );
      
      const divisionData = Array.isArray(response.data) ? response.data : [];
      const uniqueDivisions = [...new Set(divisionData)];
      setDivisions(uniqueDivisions);
      
    } catch (error) {
      console.error('Error fetching divisions:', error);
      Alert.alert('Error', 'Failed to load divisions. Please check your connection.');
    }
  };

  const fetchAreasForDivision = async (division) => {
    if (!division) return;
    
    if (isOfflineMode) {
      setAreas(['Area1', 'Area2']);
      return;
    }
    
    if (!userToken) {
      console.log('No user token available');
      return;
    }
    
    try {
      const response = await axios.get(
        `${API_URL}/getUserAreas?divisionName=${encodeURIComponent(division)}`,
        { 
          headers: { 
            Authorization: `Bearer ${userToken}`,
          } 
        }
      );
      
      const areaData = Array.isArray(response.data) ? response.data : [];
      const uniqueAreas = [...new Set(areaData)];
      setAreas(uniqueAreas);
      
    } catch (error) {
      console.error('Error fetching areas:', error);
      Alert.alert('Error', 'Failed to load areas. Please check your connection.');
    }
  };

  const fetchBatteryData = async (area) => {
    if (isOfflineMode) {
      console.log('[fetchBatteryData] Offline mode: Using mock data'); 
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
        { siteId: 'SITE1', serialNumber: 'SN001', area: selectedArea, key: 'site-SITE1-0' }, 
        { siteId: 'SITE2', serialNumber: 'SN002', area: selectedArea, key: 'site-SITE2-1' },
      ]);
      return;
    }
    
    if (!userToken) {
      console.log('No user token available');
      Alert.alert('Error', 'Authentication required. Please log in again.');
      return;
    }
    
    try {
      console.log('[fetchBatteryData] Fetching data for area:', area);
      const response = await axios.get(
        `https://rbms.mahadiscom.in/mseb/getGeneralDataBySiteIdAndSerialNumber?area=${encodeURIComponent(area)}`,
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      console.log('[fetchBatteryData] API Response:', JSON.stringify(response.data, null, 2));
      const data = Array.isArray(response.data) ? response.data : [response.data];
      if (data.length === 0) {
        Alert.alert('Warning', 'No data found for the selected area.');
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
        console.warn('[fetchBatteryData] No device data found');
        Alert.alert('Warning', 'No battery data found for the selected area.');
        setBatteryData({ packetDateTime, date: fallbackDate, time: fallbackTime });
        setChargerData(null);
        setSiteData([]);
        return;
      }
      const deviceData = item.deviceDataDTO[0];
      console.log('[fetchBatteryData] Device Data:', JSON.stringify(deviceData, null, 2));
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
          area: selectedArea, // Store the selected area name
          key: `site-${item.siteId}-0`,
        },
      ]);
      await fetchChargerData(item.siteId);
    } catch (error) {
      console.error('[fetchBatteryData] Error:', error);
      setBatteryData(null);
      setChargerData(null);
      setSiteData([]);
      Alert.alert('Error', 'Failed to fetch battery data. Please try again.');
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
    
    if (!userToken) {
      console.log('No user token available');
      return;
    }
    
    try {
      const response = await axios.get(`https://rbms.mahadiscom.in/mseb/getChargerMonitoringDataBySiteId?siteId=${encodeURIComponent(siteId)}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      console.log('[fetchChargerData] API Response:', response.data);
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

  const handleStateSelection = (state) => {
    setSelectedState(state);
    setSelectedZone(null);
    setSelectedCircle(null);
    setSelectedDivision(null);
    setSelectedArea(null);
    setZones([]);
    setCircles([]);
    setDivisions([]);
    setAreas([]);
    if (state) {
      fetchZonesForState(state);
    }
  };

  const handleZoneSelection = (zone) => {
    setSelectedZone(zone);
    setSelectedCircle(null);
    setSelectedDivision(null);
    setSelectedArea(null);
    setCircles([]);
    setDivisions([]);
    setAreas([]);
    if (zone) {
      fetchCirclesForZone(zone);
    }
  };

  const handleCircleSelection = (circle) => {
    setSelectedCircle(circle);
    setSelectedDivision(null);
    setSelectedArea(null);
    setDivisions([]);
    setAreas([]);
    if (circle) {
      fetchDivisionsForCircle(circle);
    }
  };

  const handleDivisionSelection = (division) => {
    setSelectedDivision(division);
    setSelectedArea(null);
    setAreas([]);
    if (division) {
      fetchAreasForDivision(division);
    }
  };

  const handleAreaSelection = (area) => {
    setSelectedArea(area);
  };

  const handleSearch = async () => {
    if (!selectedState || !selectedZone || !selectedCircle || !selectedDivision || !selectedArea) {
      Alert.alert('Selection Required', 'Please complete all selections.');
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      await fetchBatteryData(selectedArea);
    } catch (error) {
      console.error('Error during search:', error);
      Alert.alert('Error', 'Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (selectedState && selectedZone && selectedCircle && selectedDivision && selectedArea) {
        await handleSearch();
      } else {
        setBatteryData(null);
        setChargerData(null);
        setAcVoltage('');
        setAcCurrent('');
        setFrequency('');
        setEnergy('');
        setPowerFactor('');
        setHasSearched(false);
        await fetchStates();
      }
    } catch (error) {
      console.error('Error during refresh:', error);
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
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

  // Updated renderSiteData to show only the selected area name
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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#4CAF50']} tintColor="#4CAF50" />
        }
      >
        <View style={styles.searchContainer}>
          {/* State and Zone Row */}
          <View style={styles.pickerRow}>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={handleStateSelection}
                items={states.map((state, index) => ({
                  label: state,
                  value: state,
                  key: `state-${index}`,
                }))}
                placeholder={{ label: 'Select a state...', value: null }}
                style={pickerSelectStyles}
                value={selectedState}
                useNativeAndroidPickerStyle={false}
                fixAndroidTouchableBug
              />
            </View>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={handleZoneSelection}
                items={zones.map((zone, index) => ({
                  label: zone,
                  value: zone,
                  key: `zone-${index}`,
                }))}
                placeholder={{ label: 'Select a zone...', value: null }}
                style={pickerSelectStyles}
                disabled={!selectedState}
                value={selectedZone}
                useNativeAndroidPickerStyle={false}
                fixAndroidTouchableBug
              />
            </View>
          </View>

          {/* Circle and Division Row */}
          <View style={styles.pickerRow}>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={handleCircleSelection}
                items={circles.map((circle, index) => ({
                  label: circle,
                  value: circle,
                  key: `circle-${index}`,
                }))}
                placeholder={{ label: 'Select a circle...', value: null }}
                style={pickerSelectStyles}
                disabled={!selectedZone}
                value={selectedCircle}
                useNativeAndroidPickerStyle={false}
                fixAndroidTouchableBug
              />
            </View>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={handleDivisionSelection}
                items={divisions.map((division, index) => ({
                  label: division,
                  value: division,
                  key: `division-${index}`,
                }))}
                placeholder={{ label: 'Select a division...', value: null }}
                style={pickerSelectStyles}
                disabled={!selectedCircle}
                value={selectedDivision}
                useNativeAndroidPickerStyle={false}
                fixAndroidTouchableBug
              />
            </View>
          </View>

          {/* Area and Search Row */}
          <View style={styles.pickerRow}>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={handleAreaSelection}
                items={areas.map((area, index) => ({
                  label: area,
                  value: area,
                  key: `area-${index}`,
                }))}
                placeholder={{ label: 'Select an area...', value: null }}
                style={pickerSelectStyles}
                disabled={!selectedDivision || areas.length === 0}
                value={selectedArea}
                useNativeAndroidPickerStyle={false}
                fixAndroidTouchableBug
              />
            </View>
            <TouchableOpacity style={styles.searchIconButton} onPress={handleSearch} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="search" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>

        {renderSiteData()}

        <View style={styles.dateTimeContainer}>
          <Text style={styles.dateTimeLabel}>Live Time:</Text>
          <Text style={styles.dateTimeValue}>
            {batteryData ? formatDateTime(batteryData.packetDateTime, batteryData.date, batteryData.time) : 'Loading battery data...'}
          </Text>
        </View>

        {!loading && hasSearched && !batteryData?.stringvoltage && (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No battery data available for the selected area.</Text>
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
              const iconColor = param.paramKey ? getIconColor(param.paramKey, param.value || '0') : '#4CAF50';
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
                      <CycleLines cycles={param.value} color={iconColor} strokeOpacity={strokeOpacity} />
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
                        { width: `${batteryData.socLatestValueForEveryCycle || 0}%`, backgroundColor: '#00ff00' },
                      ]}
                    />
                    <View
                      style={[
                        styles.batteryLevel,
                        { width: `${100 - (batteryData.socLatestValueForEveryCycle || 0)}%`, backgroundColor: '#F44336' },
                      ]}
                    />
                  </View>
                  <View style={styles.batteryCap} />
                </View>
                <View style={styles.socDodTextContainer}>
                  <Text style={styles.socDodText}>SOC: {safeValue(batteryData.socLatestValueForEveryCycle)}%</Text>
                  <Text style={styles.socDodText}>DOD: {safeValue(batteryData.dodLatestValueForEveryCycle)}%</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {batteryData?.stringvoltage && (
          <Alerts batteryData={batteryData} chargerData={chargerData} />
        )}

        {batteryData?.stringvoltage && (
          <TouchableOpacity style={styles.sectionCard} onPress={() => toggleSection('charger')}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Charger Information</Text>
              <Text style={styles.dropdownIcon}>{expandedSection === 'charger' ? '▲' : '▼'}</Text>
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
          <TouchableOpacity style={styles.sectionCard} onPress={() => toggleSection('charge')}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Charge Cycle Information</Text>
              <Text style={styles.dropdownIcon}>{expandedSection === 'charge' ? '▲' : '▼'}</Text>
            </View>
            {expandedSection === 'charge' && (
              <View style={styles.expandedSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Peak Current</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.detailValue}>{safeValue(batteryData.systemPeakCurrentInChargeOneCycle)} A</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Average Current</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.detailValue}>{safeValue(batteryData.averageChargingCurrent)} A</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ampere Hour In</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.detailValue}>{safeValue(batteryData.ahInForOneChargeCycle)} Ah</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Run Time</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.detailValue}>{safeValue(ChargeTime(batteryData.chargeTimeCycle))}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}

        {batteryData?.stringvoltage && (
          <TouchableOpacity style={styles.sectionCard} onPress={() => toggleSection('discharge')}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Discharge Cycle Information</Text>
              <Text style={styles.dropdownIcon}>{expandedSection === 'discharge' ? '▲' : '▼'}</Text>
            </View>
            {expandedSection === 'discharge' && (
              <View style={styles.expandedSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Peak Current</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.detailValue}>{safeValue(batteryData.systemPeakCurrentInDischargeOneCycle)} A</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Average Current</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.detailValue}>{safeValue(batteryData.averageDischargingCurrent)} A</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ampere Hour Out</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.detailValue}>{safeValue(batteryData.ahOutForOneDischargeCycle)} Ah</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Run Time</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.detailValue}>{safeValue(ChargeTime(batteryData.dischargeTimeCycle))}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}

        {batteryData?.stringvoltage && (
          <TouchableOpacity style={styles.sectionCard} onPress={() => toggleSection('cumulative')}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Cumulative Information</Text>
              <Text style={styles.dropdownIcon}>{expandedSection === 'cumulative' ? '▲' : '▼'}</Text>
            </View>
            {expandedSection === 'cumulative' && (
              <View style={styles.expandedSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ampere Hour In</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.detailValue}>{safeValue(batteryData.cumulativeAHIn)} Ah</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ampere Hour Out</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.detailValue}>{safeValue(batteryData.cumulativeAHOut)} Ah</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Charging Energy</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.detailValue}>{safeValue(batteryData.totalChargingEnergy)} kWh</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Discharging Energy</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.detailValue}>{safeValue(batteryData.totalDischargingEnergy)} kWh</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Battery Run Hours</Text>
                  <Text style={styles.colon}>:</Text>
                  <Text style={styles.detailValue}>{safeValue(ChargeTime(batteryData.batteryRunHours))}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 10,
  },
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
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 6,
  },
  pickerContainer: {
    width: '46%',
    height: 32,
    marginRight: 4,
  },
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
  paramTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  paramValue: {
    fontSize: 14,
    color: 'green',
  },
  socDodContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  socDodTextContainer: {
    alignItems: 'center',
  },
  socDodText: {
    fontSize: 12,
    color: 'green',
  },
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#000000',
  },
  expandedSection: {
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  detailLabel: {
    fontSize: 12,
    color: '#000000',
    textAlign: 'left',
    width: 150,
  },
  colon: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    width: 10,
  },
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
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
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
  batteryLevel: {
    height: '100%',
  },
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
  dateTimeValue: {
    fontSize: 14,
    color: 'green',
  },
  siteDataContainer: {
    marginVertical: 10,
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
  siteDataLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  siteDataValue: {
    fontSize: 14,
    
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  siteDataText: {
    fontSize: 14,
    color: '#333',
  },
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

export default LiveDataScreen;