// src/screens/CellsScreen.js
import React, { useState, useEffect, useContext, createContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  RefreshControl,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import { AuthContext } from '../../AuthContext';
import {
  CommunicationFailed,
  BatteryLowVoltage,
  AboutToDie,
  OpenBattery,
  HighVoltage,
  HighTemperature,
  Charging,
  Discharging,
} from './BatteryIcons';

const API_URL = 'https://rbms.mahadiscom.in/mseb';
  
/* --------------------------------------------------------------
   AppContext – used only inside CellLayout
   -------------------------------------------------------------- */
const AppContext = createContext();

/* --------------------------------------------------------------
   Status config (SVG + colour + GIF placeholder)
   -------------------------------------------------------------- */
const statusConfig = {
  Charging: { svg: Charging, color: '#4CAF50', gif: 'https://via.placeholder.com/100x20.gif?text=Charging' },
  Discharging: { svg: Discharging, color: '#FF5252', gif: 'https://via.placeholder.com/100x20.gif?text=Discharging' },
  'Low Voltage': { svg: BatteryLowVoltage, color: '#FF0000', gif: 'https://via.placeholder.com/100x20.gif?text=Low+Voltage' },
  'About to Die': { svg: AboutToDie, color: '#C62828', gif: 'https://via.placeholder.com/100x20.gif?text=About+to+Die' },
  'Open Battery': { svg: OpenBattery, color: '#FF6D00', gif: 'https://via.placeholder.com/100x20.gif?text=Open+Battery' },
  'High Voltage': { svg: HighVoltage, color: '#F57F17', gif: 'https://via.placeholder.com/100x20.gif?text=High+Voltage' },
  'High Temperature': { svg: HighTemperature, color: '#D84315', gif: 'https://via.placeholder.com/100x20.gif?text=High+Temperature' },
  'Communication Fail': { svg: CommunicationFailed, color: '#455A64', gif: 'https://via.placeholder.com/100x20.gif?text=Communication+Fail' },
};

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
const MOCK_CELLS = [
  { siteId: 'SITE1', serialNumber: 'SN001', cellNumber: 1, cellVoltage: 3.7, cellTemperature: 25, cellSpecificgravity: 1.265 },
  { siteId: 'SITE1', serialNumber: 'SN001', cellNumber: 2, cellVoltage: 3.2, cellTemperature: 30, cellSpecificgravity: 1.260 },
  { siteId: 'SITE1', serialNumber: 'SN001', cellNumber: 3, cellVoltage: 4.3, cellTemperature: 45, cellSpecificgravity: null },
  { siteId: 'SITE2', serialNumber: 'SN002', cellNumber: 1, cellVoltage: 2.151, cellTemperature: 11032, cellSpecificgravity: 8.9201 },
];
const MOCK_BMS = {
  bmsAlarmsDTO: {
    bankDischargeCycle: false,
    socLN: true,
    stringVoltageLNH: 1,
    stringCurrentHN: false,
    bmsSedCommunication: false,
    cellCommunication: false,
    cellVoltageLN: false,
    cellVoltageNH: false,
    cellTemperatureHN: false,
    buzzer: false,
  },
};

/* --------------------------------------------------------------
   JWT helpers
   -------------------------------------------------------------- */
export const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};
export const getUsername = (token) => {
  const decoded = decodeJWT(token);
  return decoded ? decoded.sub || null : null;
};

/* --------------------------------------------------------------
   Cell layout component
   -------------------------------------------------------------- */
const CellLayout = ({ cellData, thresholds }) => {
  const { data } = useContext(AppContext);
  const { bmsAlarmsDTO } = data[0];

  const v = cellData.cellVoltage ?? 0;
  const t = cellData.cellTemperature ?? 0;

  const determineStatus = () => {
    if (v === 65.535 || t === 65535) return 'Communication Fail';
    if (v <= parseFloat(thresholds.openBattery)) return 'Open Battery';
    if (v <= parseFloat(thresholds.batteryAboutToDie) && v > parseFloat(thresholds.openBattery)) return 'About to Die';
    if (bmsAlarmsDTO.cellVoltageLN && v <= parseFloat(thresholds.lowVoltage)) return 'Low Voltage';
    if (bmsAlarmsDTO.cellVoltageNH && v >= parseFloat(thresholds.highVoltage)) return 'High Voltage';
    if (bmsAlarmsDTO.cellTemperatureHN && t >= parseFloat(thresholds.highTemperature)) return 'High Temperature';
    return bmsAlarmsDTO.bankDischargeCycle ? 'Discharging' : 'Charging';
  };

  const status = determineStatus();
  const { svg: StatusSVG } = statusConfig[status] || { svg: () => null };

  return (
    <View style={styles.cellPaper}>
      <View style={styles.terminalContainer}>
        <View style={[styles.terminal, { backgroundColor: 'rgb(27,94,34)' }]} />
        <Text style={styles.cellLabel}>C {cellData.cellNumber}</Text>
        <View style={[styles.terminal, { backgroundColor: 'rgb(183,28,28)' }]} />
      </View>

      <View style={styles.cellBody}>
        <View style={styles.statusIcon}>
          <StatusSVG width={18} height={18} />
        </View>

        <View style={styles.cellInfo}>
          {v === 65.535 || t === 65535 ? (
            <>
              <View style={styles.infoRow}><Text style={styles.icon}>v</Text><Text style={styles.infoText}>N/A</Text></View>
              <View style={styles.infoRow}><Icon name="thermometer-half" size={7} color="#fff" style={styles.icon} /><Text style={styles.infoText}>N/A</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoText}>sg:</Text><Text style={styles.infoText}>N/A</Text></View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Icon
                  name="bolt"
                  size={7}
                  color="#fff"
                  style={styles.icon}
                />
                <Text style={styles.infoText}>{v} V</Text>
              </View>

              <View style={styles.infoRow}>
                <Icon
                  name="thermometer-half"
                  size={7}
                  color="#fff"
                  style={styles.icon} 
                />
                <Text style={styles.infoText}>{t ?? 'N/A'} °C</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoText}>sg:</Text>
                <Text style={styles.infoText}>
                  {cellData.cellSpecificgravity != null ? Number(cellData.cellSpecificgravity).toFixed(5) : 'N/A'}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

/* --------------------------------------------------------------
   MAIN SCREEN
   -------------------------------------------------------------- */
const CellsScreen = () => {
  const { userToken, isOfflineMode } = useContext(AuthContext);

  /* ---------- UI state ---------- */
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [authError, setAuthError] = useState(false);

  /* ---------- Picker data ---------- */
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

  /* ---------- Result data ---------- */
  const [siteInfo, setSiteInfo] = useState(null);
  const [cells, setCells] = useState([]);
  const [thresholds, setThresholds] = useState({
    lowVoltage: 1.9,
    batteryAboutToDie: 1.8,
    openBattery: 1.7,
    highVoltage: 2.4,
    highTemperature: 45,
  });
  const [statusGif, setStatusGif] = useState('https://via.placeholder.com/100x20.gif?text=Status+Legend');
  const [appContextValue, setAppContextValue] = useState({ data: [{ bmsAlarmsDTO: MOCK_BMS.bmsAlarmsDTO }] });

  /* --------------------------------------------------------------
     Auto‑refresh (60 s) – only after a successful search
     -------------------------------------------------------------- */
  useEffect(() => {
    if (!hasSearched || !siteInfo || authError) return;
    const id = setInterval(() => fetchCellData(siteInfo.siteId, siteInfo.serialNumber), 60_000);
    return () => clearInterval(id);
  }, [hasSearched, siteInfo, authError]);

  /* --------------------------------------------------------------
     Initial load – states
     -------------------------------------------------------------- */
  useEffect(() => {
    fetchStates();
  }, [isOfflineMode]);

  /* --------------------------------------------------------------
     API helpers
     -------------------------------------------------------------- */
  const fetchStates = async () => {
    if (isOfflineMode) {
      setStates(MOCK_STATES);
      return;
    }

    // Don't try to fetch if no token
    if (!userToken) {
      console.log('No user token available for fetching states');
      setStates(MOCK_STATES); // Use mock data as fallback
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/states`, {
        headers: { Authorization: `Bearer ${userToken}` },
        timeout: 10000, // 10 second timeout
      });
      const valid = (res.data ?? [])
        .map(s => s.name)
        .filter(n => n && n.trim() && n !== 'MAHARASHTRA Pune');
      setStates(valid);
      setAuthError(false);
    } catch (e) {
      console.error('Error fetching states:', e);
      // Don't show alert for auth errors, just use mock data
      if (e.response?.status === 401) {
        console.log('Authentication failed, using mock data');
        setStates(MOCK_STATES);
        setAuthError(true);
      } else {
        Alert.alert('Error', 'Failed to fetch states. Please check your connection.');
        setStates(MOCK_STATES); // Use mock data as fallback
      }
    } finally {
      setLoading(false);
    }
  };

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
          timeout: 10000
        }
      );
      const zoneData = Array.isArray(res.data) ? res.data : [];
      const uniqueZones = [...new Set(zoneData)];
      setZones(uniqueZones);
    } catch (e) {
      console.error('Error fetching zones:', e);
      if (e.response?.status === 401) {
        setZones(MOCK_ZONES);
      } else {
        Alert.alert('Error', 'Failed to load zones. Please check your connection.');
        setZones(MOCK_ZONES);
      }
    } finally {
      setLoading(false);
    }
  };

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
          timeout: 10000
        }
      );
      const data = Array.isArray(response.data) ? response.data : [];
      const uniqueCircles = [...new Set(data)];
      setCircles(uniqueCircles);
    } catch (e) {
      console.error('Error fetching circles:', e);
      if (e.response?.status === 401) {
        setCircles(MOCK_CIRCLES);
      } else {
        Alert.alert('Error', 'Failed to load circles. Please check your connection.');
        setCircles(MOCK_CIRCLES);
      }
    }
  };

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
          timeout: 10000
        }
      );
      const data = Array.isArray(response.data) ? response.data : [];
      const uniqueDivisions = [...new Set(data)];
      setDivisions(uniqueDivisions);
    } catch (e) {
      console.error('Error fetching divisions:', e);
      if (e.response?.status === 401) {
        setDivisions(MOCK_DIVISIONS);
      } else {
        Alert.alert('Error', 'Failed to load divisions. Please check your connection.');
        setDivisions(MOCK_DIVISIONS);
      }
    }
  };

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
          timeout: 10000
        }
      );
      const data = Array.isArray(response.data) ? response.data : [];
      const uniqueAreas = [...new Set(data)];
      setAreas(uniqueAreas);
    } catch (e) {
      console.error('Error fetching areas:', e);
      if (e.response?.status === 401) {
        setAreas(MOCK_AREAS);
      } else {
        Alert.alert('Error', 'Failed to load areas. Please check your connection.');
        setAreas(MOCK_AREAS);
      }
    }
  };

  const fetchCellData = async (siteId, serial) => {
    if (isOfflineMode || authError || !userToken) {
      const filtered = MOCK_CELLS.filter(c => c.siteId === siteId && c.serialNumber === serial);
      setCells(filtered);
      setSiteInfo({ siteId, serialNumber: serial, area: selectedArea });
      setThresholds({
        lowVoltage: 1.9, batteryAboutToDie: 1.8, openBattery: 1.7,
        highVoltage: 2.4, highTemperature: 45,
      });
      setAppContextValue({ data: [{ bmsAlarmsDTO: MOCK_BMS.bmsAlarmsDTO }] });
      const dom = dominantStatus(filtered.map(c => statusForCell(c, thresholds, MOCK_BMS.bmsAlarmsDTO)));
      setStatusGif(statusConfig[dom]?.gif ?? statusConfig.Charging.gif);
      return;
    }

    setLoading(true);
    try {
      // 1. General data (cells + BMS)
      const genRes = await axios.get(
        `https://rbms.mahadiscom.in/mseb/getGeneralDataBySiteIdAndSerialNumber?area=${encodeURIComponent(selectedArea)}`,
        { 
          headers: { Authorization: `Bearer ${userToken}` },
          timeout: 15000
        }
      );
      const gen = genRes.data?.deviceDataDTO?.[0];
      if (!gen?.cellVoltageTemperatureData) throw new Error('No cell data');

      const parsedCells = gen.cellVoltageTemperatureData.map(c => ({
        siteId,
        serialNumber: serial,
        cellNumber: c.cellNumber,
        cellVoltage: c.cellVoltage ?? 0,
        cellTemperature: c.cellTemperature > 1000 ? null : (c.cellTemperature ?? 0),
        cellSpecificgravity: c.cellSpecificgravity ?? null,
      }));
      setCells(parsedCells);
      setSiteInfo({ siteId, serialNumber: serial, area: selectedArea });
      setAppContextValue({ data: [{ bmsAlarmsDTO: gen.bmsAlarmsDTO }] });

      // 2. Thresholds
      const thrRes = await axios.get(
        `https://rbms.mahadiscom.in/mseb/getManufacturerDetailsBySiteIdAndSerialNumber?area=${encodeURIComponent(selectedArea)}`,
        { 
          headers: { Authorization: `Bearer ${userToken}` },
          timeout: 10000
        }
      );
      const t = thrRes.data;
      setThresholds({
        lowVoltage: parseFloat(t.lowVoltage) || 1.9,
        batteryAboutToDie: parseFloat(t.batteryAboutToDie) || 1.8,
        openBattery: parseFloat(t.openBattery) || 1.7,
        highVoltage: parseFloat(t.highVoltage) || 2.4,
        highTemperature: parseFloat(t.highTemperature) || 45,
      });

      // 3. Dominant status GIF
      const dom = dominantStatus(parsedCells.map(c => statusForCell(c, thresholds, gen.bmsAlarmsDTO)));
      setStatusGif(statusConfig[dom]?.gif ?? statusConfig.Charging.gif);
      setAuthError(false);
    } catch (e) {
      console.error('Error fetching cell data:', e);
      if (e.response?.status === 401) {
        // Use mock data on auth error
        const filtered = MOCK_CELLS.filter(c => c.siteId === siteId && c.serialNumber === serial);
        setCells(filtered);
        setSiteInfo({ siteId, serialNumber: serial, area: selectedArea });
        setAuthError(true);
        Alert.alert('Notice', 'Using demo data due to authentication issue. Please check your login status.');
      } else {
        Alert.alert('Error', `Failed to load cell data: ${e.message}`);
        setCells([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const statusForCell = (cell, thr, bms) => {
    const v = cell.cellVoltage ?? 0;
    const t = cell.cellTemperature ?? 0;
    if (v === 65.535 || t === 65535) return 'Communication Fail';
    if (v <= thr.openBattery) return 'Open Battery';
    if (v <= thr.batteryAboutToDie && v > thr.openBattery) return 'About to Die';
    if (bms.cellVoltageLN && v <= thr.lowVoltage) return 'Low Voltage';
    if (bms.cellVoltageNH && v >= thr.highVoltage) return 'High Voltage';
    if (bms.cellTemperatureHN && t >= thr.highTemperature) return 'High Temperature';
    return bms.bankDischargeCycle ? 'Discharging' : 'Charging';
  };

  const dominantStatus = (statuses) => {
    if (!statuses.length) return 'Charging';
    const counts = statuses.reduce((a, s) => ({ ...a, [s]: (a[s] || 0) + 1 }), {});
    return Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
  };

  /* --------------------------------------------------------------
     Picker handlers
     -------------------------------------------------------------- */
  const onStateChange = (value) => {
    setSelectedState(value);
    setSelectedZone(null);
    setSelectedCircle(null);
    setSelectedDivision(null);
    setSelectedArea(null);
    setZones([]);
    setCircles([]);
    setDivisions([]);
    setAreas([]);
    resetResult();
    if (value) fetchZonesForState(value);
  };

  const onZoneChange = (value) => {
    setSelectedZone(value);
    setSelectedCircle(null);
    setSelectedDivision(null);
    setSelectedArea(null);
    setCircles([]);
    setDivisions([]);
    setAreas([]);
    resetResult();
    if (value) fetchCirclesForZone(value);
  };

  const onCircleChange = (value) => {
    setSelectedCircle(value);
    setSelectedDivision(null);
    setSelectedArea(null);
    setDivisions([]);
    setAreas([]);
    resetResult();
    if (value) fetchDivisionsForCircle(value);
  };

  const onDivisionChange = (value) => {
    setSelectedDivision(value);
    setSelectedArea(null);
    setAreas([]);
    resetResult();
    if (value) fetchAreasForDivision(value);
  };

  const onAreaChange = (value) => {
    setSelectedArea(value);
    resetResult();
  };

  const resetResult = () => {
    setSiteInfo(null);
    setCells([]);
    setHasSearched(false);
    setStatusGif('https://via.placeholder.com/100x20.gif?text=Status+Legend');
  };

  /* --------------------------------------------------------------
     Search & Refresh
     -------------------------------------------------------------- */
  const performSearch = async () => {
    if (!selectedState || !selectedZone || !selectedCircle || !selectedDivision || !selectedArea) {
      Alert.alert('Selection Required', 'Please select State, Zone, Circle, Division and Area.');
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      // Step 1: Get site/serial for the selected area
      const res = await axios.get(
        `https://rbms.mahadiscom.in/mseb/getGeneralDataBySiteIdAndSerialNumber?area=${encodeURIComponent(selectedArea)}`,
        { 
          headers: { Authorization: `Bearer ${userToken}` },
          timeout: 15000
        }
      );

      const list = Array.isArray(res.data) ? res.data : [res.data];
      if (!list.length) throw new Error('No site found for this area');

      const first = list[0];
      const siteId = first.siteId;
      const serial = first.deviceDataDTO?.[0]?.serialNumber;
      if (!siteId || !serial) throw new Error('Missing site/serial');

      await fetchCellData(siteId, serial);
    } catch (e) {
      console.error('Error during search:', e);
      if (e.response?.status !== 401) {
        Alert.alert('Error', `Failed to search: ${e.message}`);
      }
      setHasSearched(false);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (hasSearched && siteInfo) {
      await fetchCellData(siteInfo.siteId, siteInfo.serialNumber);
    } else {
      await fetchStates();
    }
    setRefreshing(false);
  };

  /* --------------------------------------------------------------
     Render helpers - Updated to show only Area Name
     -------------------------------------------------------------- */
  const renderSiteInfo = () => {
    if (!hasSearched || !selectedArea) return null;
    
    return (
      <View style={styles.siteCard}>
        <Text style={styles.siteTitle}>Site Information</Text>
        <View style={styles.siteRow}>
          <Text style={styles.siteLabel}>SubStation:</Text>
          <Text style={styles.siteValue}>{selectedArea}</Text>
        </View>
      </View>
    );
  };

  const renderGif = () => hasSearched && (
    <View style={styles.gifContainer}>
      <Image source={{ uri: statusGif }} style={styles.statusGif} resizeMode="contain" />
    </View>
  );

  const renderLegend = () => hasSearched && cells.length > 0 && (
    <View style={styles.legendContainer}>
      <Text style={styles.title1}>Legends</Text>
      <View style={styles.legendRow}>
        {Object.entries(statusConfig).map(([name, cfg]) => (
          <View key={name} style={styles.legendItem}>
            <cfg.svg width={18} height={18} />
            <Text style={styles.legendText}>{name}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderCells = () => {
    const rows = [];
    for (let i = 0; i < cells.length; i += 5) rows.push(cells.slice(i, i + 5));

    return rows.map((row, ri) => (
      <View key={`row-${ri}`} style={styles.gridRow}>
        {row.map(cell => (
          <CellLayout key={cell.cellNumber} cellData={cell} thresholds={thresholds} />
        ))}
        {row.length < 5 && Array(5 - row.length).fill().map((_, ei) => (
          <View key={`empty-${ri}-${ei}`} style={styles.cellPaper} />
        ))}
      </View>
    ));
  };

  /* --------------------------------------------------------------
     JSX
     -------------------------------------------------------------- */
  return (
    <AppContext.Provider value={appContextValue}>
      <View style={styles.container}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />}
          contentContainerStyle={styles.scrollContainer}
        >

          {/* ---------- Pickers ---------- */}
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
                  items={circles.map((c, i) => ({ label: c, value: c, key: `c-${i}` }))}
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

          {/* ---------- Loading ---------- */}
          {loading && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loaderText}>Loading…</Text>
            </View>
          )}

          {/* ---------- Site info (Area Name only) + GIF ---------- */}
          {renderSiteInfo()}
          {renderGif()}

          {/* ---------- Cells grid ---------- */}
          {hasSearched && cells.length > 0 && (
            <>
              <Text style={styles.title}>Cells Overview</Text>
              <View style={styles.cellsSpacer} />
              {renderCells()}
            </>
          )}

          {/* ---------- No data message ---------- */}
          {hasSearched && cells.length === 0 && !loading && (
            <Text style={styles.errorText}>No cell data available</Text>
          )}

          {/* ---------- Legend ---------- */}
          {renderLegend()}

        </ScrollView>
      </View>
    </AppContext.Provider>
  );
};

/* --------------------------------------------------------------
   Styles - Updated for site card
   -------------------------------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContainer: { padding: 10 },
  searchContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  pickerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  pickerContainer: { width: '46%', height: 32, marginRight: 4 },
  searchIconButton: {
    backgroundColor: '#4CAF50',
    padding: 6,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
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

  /* Site card - Updated for single line display */
  siteCard: { 
    marginVertical: 10, 
    padding: 15, 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    borderWidth: 2, 
    // borderColor: '#4CAF50', 
    elevation: 5,
  },
  siteTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 10, 
    textAlign: 'center',
    color: '#333',
  },
  siteRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  siteLabel: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#666',
  },
  siteValue: { 
    fontSize: 14, 
    color: '#4CAF50', 
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },

  gifContainer: { alignItems: 'center', marginVertical: 5 },
  statusGif: { width: 80, height: 15 },

  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  title1: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, textAlign: 'center', color: '#fff' },
  cellsSpacer: { height: 15 },

  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  cellPaper: {
    width: '19%',
    height: 100,
    backgroundColor: '#000',
    borderRadius: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    margin: 1,
  },
  terminalContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: -3 },
  terminal: { width: 6, height: 6, borderTopLeftRadius: 1, borderTopRightRadius: 1 },
  cellLabel: { fontSize: 8, fontWeight: 'bold', color: '#fff', marginHorizontal: 2 },
  cellBody: { width: 50, height: 80, borderWidth: 1, borderColor: '#FFFF00', borderRadius: 4, padding: 1, backgroundColor: '#000', flexDirection: 'column', alignItems: 'flex-start' },
  statusIcon: { marginLeft: 1, marginBottom: 1 },
  cellInfo: { flex: 1, marginTop: 1, paddingLeft: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 1 },
  icon: { fontSize: 7, color: '#fff', width: 10, textAlign: 'center', marginRight: 2 },
  infoText: { fontSize: 7, fontWeight: 'bold', color: '#fff' },

  errorText: { fontSize: 16, color: '#666', textAlign: 'center', marginVertical: 15 },

  legendContainer: { marginVertical: 2, marginTop: -5, backgroundColor: '#000' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  legendItem: { width: '25%', alignItems: 'center', marginVertical: 3 },
  legendText: { fontSize: 10, color: '#fff', marginTop: 5, textAlign: 'center' },
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

export default CellsScreen;