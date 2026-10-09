// src/screens/CellsScreen.js
import React, {
  useState,
  useEffect,
  useContext,
  createContext,
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
  Image,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import { AuthContext } from '../../AuthContext';
import { useSelection } from '../../SelectionContext';
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

const AppContext = createContext();

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

const MOCK_ZONES = ['Bhandup', 'Kalyan', 'Nashik'];
const MOCK_CIRCLES = ['Thane', 'Pune'];
const MOCK_DIVISIONS = [
  'BHANDUP (E)', 'GADKARI', 'ISHWAR NAGAR', 'KISAN NAGAR',
  'KOLSHETH URBAN', 'LOKMANYA NAGAR', 'NEELAM NAGAR', 'PACH RASTA',
  'PANNALAL', 'POWER HOUSE', 'SARVODAY', 'THANE (E)',
  'VIKAS COMPLEX', 'WAGLE ESTATE',
];
const MOCK_AREAS = [
  'POWER HOUSE', 'AMFORGE', 'DREAMS', 'HARIYALI', 'HAWARE',
  'HIRANANDANI', 'KOLSHET', 'KOPRI', 'LOKMANYA NAGAR', 'LOKPRIYA',
  'PIRMAL', 'ROMA', 'SELF DEVELOPER', 'SOHAM', 'VASANTH VIHAR',
];
const MOCK_CELLS = [
  { siteId: 'SITE1', serialNumber: 'SN001', cellNumber: 1, cellVoltage: 3.7, cellTemperature: 25, cellSpecificgravity: 1.265 },
  { siteId: 'SITE1', serialNumber: 'SN001', cellNumber: 2, cellVoltage: 3.2, cellTemperature: 30, cellSpecificgravity: 1.260 },
  { siteId: 'SITE1', serialNumber: 'SN001', cellNumber: 3, cellVoltage: 4.3, cellTemperature: 45, cellSpecificgravity: null },
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

/* ---------------- Cell layout (unchanged) ---------------- */
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
              {/* <View style={styles.infoRow}><Text style={styles.infoText}>sg:</Text><Text style={styles.infoText}>N/A</Text></View> */}
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Icon name="bolt" size={7} color="#fff" style={styles.icon} />
                <Text style={styles.infoText}>{v} V</Text>
              </View>
              <View style={styles.infoRow}>
                <Icon name="thermometer-half" size={7} color="#fff" style={styles.icon} />
                <Text style={styles.infoText}>{t ?? 'N/A'} °C</Text>
              </View>
              {/* <View style={styles.infoRow}>
                <Text style={styles.infoText}>sg:</Text>
                <Text style={styles.infoText}>
                  {cellData.cellSpecificgravity != null ? Number(cellData.cellSpecificgravity).toFixed(5) : 'N/A'}
                </Text>
              </View> */}
            </>
          )}
        </View>
      </View>
    </View>
  );
};

/* =========================================================
   MAIN SCREEN
   ========================================================= */
const CellsScreen = () => {
  const { userToken, isOfflineMode } = useContext(AuthContext);

  // 🔹 shared selection from header
  const {
    selectedState,
    selectedZone,
    selectedCircle,
    selectedDivision,
    selectedArea,
  } = useSelection();

  /* ---------- UI state ---------- */
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [authError, setAuthError] = useState(false);

  /* ---------- User-scoped lists ---------- */
  const [userZones, setUserZones] = useState([]);
  const [userCircles, setUserCircles] = useState([]);
  const [userDivisions, setUserDivisions] = useState([]);
  const [userAreas, setUserAreas] = useState([]);
  const [listsLoading, setListsLoading] = useState(false);

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

  const lastFetchedArea = useRef('');

  /* --------------------------------------------------------------
     Auto-refresh (60s) after successful search
     -------------------------------------------------------------- */
  useEffect(() => {
    if (!hasSearched || !siteInfo || authError) return;
    const id = setInterval(
      () => fetchCellData(siteInfo.siteId, siteInfo.serialNumber),
      60_000
    );
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSearched, siteInfo, authError]);

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
        if (e.response?.status === 401 || e.response?.status === 403) {
          setAuthError(true);
          return MOCK_ZONES;
        }
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
          { headers: { Authorization: `Bearer ${userToken}` }, timeout: 10000 }
        );
        const data = Array.isArray(res.data) ? res.data : [];
        return [...new Set(data)];
      } catch (e) {
        if (e.response?.status === 401 || e.response?.status === 403) {
          setAuthError(true);
          return MOCK_CIRCLES;
        }
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
        if (e.response?.status === 401 || e.response?.status === 403) {
          setAuthError(true);
          return MOCK_DIVISIONS;
        }
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
        if (e.response?.status === 401 || e.response?.status === 403) {
          setAuthError(true);
          return MOCK_AREAS;
        }
        return MOCK_AREAS;
      }
    },
    [userToken, isOfflineMode]
  );

  /* --------------------------------------------------------------
     Load user lists when selection changes
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
    return () => { cancelled = true; };
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
     Cell status helpers
     -------------------------------------------------------------- */
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
     Fetch cell data for a given area
     -------------------------------------------------------------- */
  const fetchCellData = useCallback(
    async (siteId, serial) => {
      if (isOfflineMode || authError || !userToken) {
        const filtered = MOCK_CELLS.filter((c) => c.siteId === siteId && c.serialNumber === serial);
        setCells(filtered);
        setSiteInfo({ siteId, serialNumber: serial, area: selectedArea });
        const thr = {
          lowVoltage: 1.9, batteryAboutToDie: 1.8, openBattery: 1.7,
          highVoltage: 2.4, highTemperature: 45,
        };
        setThresholds(thr);
        setAppContextValue({ data: [{ bmsAlarmsDTO: MOCK_BMS.bmsAlarmsDTO }] });
        const dom = dominantStatus(filtered.map((c) => statusForCell(c, thr, MOCK_BMS.bmsAlarmsDTO)));
        setStatusGif(statusConfig[dom]?.gif ?? statusConfig.Charging.gif);
        return;
      }

      setLoading(true);
      try {
        const genRes = await axios.get(
          `${API_URL}/getGeneralDataBySiteIdAndSerialNumber?area=${encodeURIComponent(selectedArea)}`,
          { headers: { Authorization: `Bearer ${userToken}` }, timeout: 15000 }
        );
        const gen = genRes.data?.deviceDataDTO?.[0];
        if (!gen?.cellVoltageTemperatureData) throw new Error('No cell data');

        const parsedCells = gen.cellVoltageTemperatureData.map((c) => ({
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

        const thrRes = await axios.get(
          `${API_URL}/getManufacturerDetailsBySiteIdAndSerialNumber?area=${encodeURIComponent(selectedArea)}`,
          { headers: { Authorization: `Bearer ${userToken}` }, timeout: 10000 }
        );
        const t = thrRes.data;
        const thr = {
          lowVoltage: parseFloat(t.lowVoltage) || 1.9,
          batteryAboutToDie: parseFloat(t.batteryAboutToDie) || 1.8,
          openBattery: parseFloat(t.openBattery) || 1.7,
          highVoltage: parseFloat(t.highVoltage) || 2.4,
          highTemperature: parseFloat(t.highTemperature) || 45,
        };
        setThresholds(thr);

        const dom = dominantStatus(parsedCells.map((c) => statusForCell(c, thr, gen.bmsAlarmsDTO)));
        setStatusGif(statusConfig[dom]?.gif ?? statusConfig.Charging.gif);
        setAuthError(false);
      } catch (e) {
        console.error('Error fetching cell data:', e);
        if (e.response?.status === 401) {
          const filtered = MOCK_CELLS.filter((c) => c.siteId === siteId && c.serialNumber === serial);
          setCells(filtered);
          setSiteInfo({ siteId, serialNumber: serial, area: selectedArea });
          setAuthError(true);
        } else {
          Alert.alert('Error', `Failed to load cell data: ${e.message}`);
          setCells([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [userToken, isOfflineMode, authError, selectedArea]
  );

  /* --------------------------------------------------------------
     Search for the site ID for the area, then fetch cells
     -------------------------------------------------------------- */
  const searchByArea = useCallback(
    async (area) => {
      setLoading(true);
      setHasSearched(true);
      try {
        const res = await axios.get(
          `${API_URL}/getGeneralDataBySiteIdAndSerialNumber?area=${encodeURIComponent(area)}`,
          { headers: { Authorization: `Bearer ${userToken}` }, timeout: 15000 }
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
    },
    [userToken, fetchCellData]
  );

  /* --------------------------------------------------------------
     Auto-fetch when selectedArea is present in user's list
     -------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedArea) {
      setSiteInfo(null);
      setCells([]);
      setHasSearched(false);
      setStatusGif('https://via.placeholder.com/100x20.gif?text=Status+Legend');
      lastFetchedArea.current = '';
      return;
    }
    if (userAreas.length === 0) return;
    if (!userAreas.includes(selectedArea)) {
      setSiteInfo(null);
      setCells([]);
      setHasSearched(false);
      return;
    }
    if (lastFetchedArea.current === selectedArea) return;
    lastFetchedArea.current = selectedArea;
    searchByArea(selectedArea);
  }, [selectedArea, userAreas, searchByArea]);

  /* --------------------------------------------------------------
     Refresh
     -------------------------------------------------------------- */
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (selectedArea && userAreas.includes(selectedArea)) {
        lastFetchedArea.current = '';
        await searchByArea(selectedArea);
      }
    } finally {
      setRefreshing(false);
    }
  };

  /* --------------------------------------------------------------
     Manual search button
     -------------------------------------------------------------- */
  const handleManualSearch = async () => {
    if (!selectedArea) {
      Alert.alert('Selection Required', 'Please pick State, Zone, Circle, Division and Area in the header.');
      return;
    }
    if (!userAreas.includes(selectedArea)) {
      Alert.alert('Not Available', 'The selected area is not in your accessible list.');
      return;
    }
    lastFetchedArea.current = '';
    await searchByArea(selectedArea);
  };

  /* --------------------------------------------------------------
     Renders
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
            <ActivityIndicator size="small" color="#003844" style={{ marginLeft: 8 }} />
          )}
        </View>
      </View>
    );
  };

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

  const renderGif = () =>
    hasSearched && (
      <View style={styles.gifContainer}>
        <Image source={{ uri: statusGif }} style={styles.statusGif} resizeMode="contain" />
      </View>
    );

  const renderLegend = () =>
    hasSearched &&
    cells.length > 0 && (
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
        {row.map((cell) => (
          <CellLayout key={cell.cellNumber} cellData={cell} thresholds={thresholds} />
        ))}
        {row.length < 5 &&
          Array(5 - row.length)
            .fill()
            .map((_, ei) => <View key={`empty-${ri}-${ei}`} style={styles.cellPaper} />)}
      </View>
    ));
  };

  return (
    <AppContext.Provider value={appContextValue}>
      <View style={styles.container}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
          }
          contentContainerStyle={styles.scrollContainer}
        >
          {/* {renderSelectionBanner()} */}

          {authError && (
            <View style={styles.authErrorContainer}>
              <Text style={styles.authErrorText}>
                ⚠️ Using demo data. Authentication issue detected. Please check your login.
              </Text>
            </View>
          )}

          {loading && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loaderText}>Loading…</Text>
            </View>
          )}

          {renderSiteInfo()}
          {renderGif()}

          {hasSearched && cells.length > 0 && (
            <>
              <Text style={styles.title}>Cells Overview</Text>
              <View style={styles.cellsSpacer} />
              {renderCells()}
            </>
          )}

          {hasSearched && cells.length === 0 && !loading && (
            <Text style={styles.errorText}>No cell data available</Text>
          )}

          {renderLegend()}
        </ScrollView>
      </View>
    </AppContext.Provider>
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
  selectionBannerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  selectionBannerTitle: { marginLeft: 6, fontSize: 13, fontWeight: 'bold', color: '#003844' },
  selectionBannerText: { fontSize: 12, color: '#333', marginBottom: 8 },
  selectionBannerWarning: { fontSize: 12, color: '#F44336', marginBottom: 6 },
  selectionBannerActions: { flexDirection: 'row', alignItems: 'center' },
  bannerSearchBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerSearchBtnText: { color: '#fff', marginLeft: 6, fontWeight: 'bold', fontSize: 12 },

  loaderContainer: { marginVertical: 20, alignItems: 'center' },
  loaderText: { marginTop: 10, fontSize: 16, color: '#666' },
  authErrorContainer: { backgroundColor: '#ff9800', padding: 10, borderRadius: 8, marginVertical: 10 },
  authErrorText: { color: '#fff', textAlign: 'center', fontSize: 12 },

  siteCard: {
    marginVertical: 10,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    elevation: 5,
  },
  siteTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' },
  siteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  siteLabel: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  siteValue: { fontSize: 14, color: '#4CAF50', fontWeight: 'bold', flex: 1, textAlign: 'right' },

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
  cellBody: {
    width: 50,
    height: 80,
    borderWidth: 1,
    borderColor: '#FFFF00',
    borderRadius: 4,
    padding: 1,
    backgroundColor: '#000',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
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

export default CellsScreen;