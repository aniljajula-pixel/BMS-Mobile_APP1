import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import api from "../Api";
import { WebView } from "react-native-webview";
import RNPickerSelect from "react-native-picker-select";
import { Ionicons } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;
const BASE_URL = "https://rbms.mahadiscom.in/mseb";

/* ------------------- Alarm Definitions ------------------- */
const ALARM_DEFS = [
  { key: 'inputMains', label: 'Input Mains Fail', check: (i) => !!i.inputMains },
  { key: 'inputPhase', label: 'Input Phase Fail', check: (i) => !!i.inputPhase },
  { key: 'chargerTrip', label: 'Charger Trip', check: (i) => !!i.chargerTrip },
  { key: 'dcEarth', label: 'DC Voltage Fault', check: (i) => i.dcVoltageOln === 0 || i.dcVoltageOln === 2 },
  { key: 'stringVoltage', label: 'String Voltage Alarm', check: (i) => i.stringVoltageLhn === 0 || i.stringVoltageLhn === 2 },
  { key: 'cellVoltageLn', label: 'Cell Voltage Low', check: (i) => !!i.cellVoltageLn },
  { key: 'cellVoltageNh', label: 'Cell Voltage High', check: (i) => !!i.cellVoltageNh },
  { key: 'socLn', label: 'SOC Low', check: (i) => !!i.socLn },
  { key: 'rectifierFuse', label: 'Rectifier Fuse', check: (i) => !!i.rectifierFuse },
  { key: 'filterFuse', label: 'Filter Fuse', check: (i) => !!i.filterFuse },
  { key: 'outputMccb', label: 'Output MCCB', check: (i) => !!i.outputMccb },
  { key: 'outputFuse', label: 'Output Fuse', check: (i) => !!i.outputFuse },
  { key: 'batteryCondition', label: 'Battery Condition', check: (i) => !!i.batteryCondition },
  { key: 'acVoltage', label: 'AC Voltage Alarm', check: (i) => i.acVoltageUln === 0 || i.acVoltageUln === 2 },
  { key: 'ambientTemp', label: 'Ambient Temperature High', check: (i) => !!i.ambientTemperatureHn },
  { key: 'cellTemp', label: 'Cell Temperature High', check: (i) => !!i.cellTemperatureHn },
  { key: 'cellComm', label: 'Cell Communication Fail', check: (i) => !!i.cellCommunicationFd },
  { key: 'bmsComm', label: 'BMS Communication Fail', check: (i) => !!i.bmsSedCommunication },
  { key: 'bankCycle', label: 'Bank Cycle DC', check: (i) => !!i.bankCycleDc },
  { key: 'buzzer', label: 'Buzzer', check: (i) => !!i.buzzer },
  { key: 'chargerLoad', label: 'Charger Load', check: (i) => !!i.chargerLoad },
  { key: 'alarmSupply', label: 'Alarm Supply Fuse', check: (i) => !!i.alarmSupplyFuse },
  { key: 'thermalRunaway', label: 'Thermal Runaway', check: (i) => !!i.thermalRunaway },
  { key: 'floatVoltage', label: 'Float Voltage', check: (i) => i.floatVoltage === 0 || i.floatVoltage === 2 },
];

const countActiveAlarms = (item) => {
  if (!item) return 0;
  return ALARM_DEFS.filter((d) => d.check(item)).length;
};

const hasActiveAlarm = (item) => {
  return countActiveAlarms(item) > 0;
};

/* ------------------- Marker Icons ------------------- */
const getMarkerIcon = (status) => {
  return status
    ? "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-2x-green.png"
    : "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-2x-red.png";
};

/* ------------------- Leaflet WebView ------------------- */
const LeafletMapView = ({ markers }) => {
  const webViewRef = useRef(null);

  const markersScript = markers
    .map(
      (m) => `
        L.marker([${m.latitude}, ${m.longitude}], {
          icon: L.icon({
            iconUrl: '${m.icon}',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
          })
        })
        .bindPopup("<b>Site ID:</b> ${m.siteId}<br><b>Serial No:</b> ${m.serialNumber}<br><b>Area:</b> ${m.area}<br><b>Status:</b> ${m.status ? 'Communicating' : 'Non-Communicating'}")
        .addTo(map);
      `
    )
    .join("");

  useEffect(() => {
    if (webViewRef.current && markers.length > 0) {
      const bounds = markers.map((m) => [m.latitude, m.longitude]);
      const js = `
        if (map && ${markers.length} > 0) {
          const bounds = ${JSON.stringify(bounds)};
          map.fitBounds(bounds, { padding: [50, 50] });
        }
        true;
      `;
      webViewRef.current.injectJavaScript(js);
    }
  }, [markers]);

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
    const map = L.map('map').setView([21.0, 78.0], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    map.whenReady(() => {
      ${markersScript}
      if (${markers.length} > 0) {
        const group = L.featureGroup();
        map.eachLayer(l => { if (l instanceof L.Marker) group.addLayer(l); });
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
      }
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
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      )}
    />
  );
};

/* =========================================================
   SHINY HORIZONTAL BAR CHART
   ========================================================= */
const ShinyHorizontalBarChart = ({ data = [], title = "", onBarPress }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.barChartContainer}>
        <Text style={styles.barChartTitle}>{title || "No Data"}</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No alarm data available</Text>  
        </View>
      </View>
    );
  }

  const sorted = [...data].sort((a, b) => b.alarms - a.alarms).slice(0, 15); 
  const max = Math.max(...sorted.map((d) => d.alarms), 1);

  return (
    <View style={styles.barChartContainer}>
      <View style={styles.barChartHeader}>
        <Text style={styles.barChartTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.barChartCount}>{sorted.length} items</Text>
      </View>

      <View style={styles.shinyLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#F44336" }]} />
          <Text style={styles.legendText}>Alarms (tap bar for details)</Text>
        </View>
      </View>

      <ScrollView style={styles.barScroll} showsVerticalScrollIndicator nestedScrollEnabled>
        {sorted.map((item, index) => {
          const barWidthPct = Math.max((item.alarms / max) * 100, 3);
          return (
            <TouchableOpacity
              key={`${item.name}-${index}`}
              style={styles.shinyRow}
              activeOpacity={0.7}
              onPress={() => onBarPress && onBarPress(item)}
            >
              <Text style={styles.shinyLabel} numberOfLines={1}>
                {item.name.length > 13 ? item.name.substring(0, 11) + "…" : item.name}
              </Text>
              <View style={styles.shinyTrack}>
                <View style={styles.shinyBg} />
                <View style={[styles.shinyBar, { width: `${barWidthPct}%` }]} />
                <Text style={styles.shinyValue}>{item.alarms}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default function HomeScreen() {
  /* ------------------- State ------------------- */
  const [pieChartData, setPieChartData] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [states, setStates] = useState(["Maharastra"]);
  const [selectedState, setSelectedState] = useState("Maharastra");
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [circles, setCircles] = useState([]);
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [marginMinutes] = useState(60);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCommStatus, setSelectedCommStatus] = useState(null);
  const [commTableData, setCommTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [communicationData, setCommunicationData] = useState([]);

  const [circleStatusData, setCircleStatusData] = useState({
    totalSites: 0,
    activeAlarms: 0,
    uptime: 0,
    chargerBoost: 0,
    chargerFloat: 0,
    chargerTrip: 0,
    floatVoltage: 0,
    thermalRunaway: 0,
  });

  // Bar chart
  const [barChartItems, setBarChartItems] = useState([]);
  const [barChartTitle, setBarChartTitle] = useState("Zones Alarm Distribution");
  const [currentLevel, setCurrentLevel] = useState("zones");
  const [barChartLoading, setBarChartLoading] = useState(false);

  // Detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailModalTitle, setDetailModalTitle] = useState("");
  const [detailTableData, setDetailTableData] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailCurrentLevel, setDetailCurrentLevel] = useState("");

  const barChartRequestId = useRef(0);

  /* =========================================================
     BAR CHART – LOCAL device-alarms
     ========================================================= */
  const fetchZoneAlarms = useCallback(async () => {
    const requestId = ++barChartRequestId.current;
    try {
      setBarChartLoading(true);
      const response = await api.get(`${BASE_URL}/device-alarms`);
      if (requestId !== barChartRequestId.current) return;

      if (response.data && Array.isArray(response.data)) {
        const data = response.data
          .filter((item) => item.zone && String(item.zone).trim() && item.zone !== "Unknown" && item.zone !== "N/A")
          .map((item) => ({
            name: String(item.zone).trim(),
            alarms: item.deviceAlert || 0,
          }));
        setCurrentLevel("zones");
        setBarChartItems(data);
        setBarChartTitle("Zones Alarm Distribution");
      }
    } catch (error) {
      console.error("Error fetching zone alarms:", error);
      if (requestId === barChartRequestId.current) setBarChartItems([]);
    } finally {
      if (requestId === barChartRequestId.current) setBarChartLoading(false);
    }
  }, []);

  const fetchCircleAlarms = useCallback(async (zone) => {
    if (!zone) return;
    const requestId = ++barChartRequestId.current;
    try {
      setBarChartLoading(true);
      const response = await api.get(
        `${BASE_URL}/device-alarms?zone=${encodeURIComponent(zone)}`
      );
      if (requestId !== barChartRequestId.current) return;

      if (response.data && Array.isArray(response.data)) {
        const data = response.data
          .filter((item) => item.circle && String(item.circle).trim() && item.circle !== "Unknown" && item.circle !== "N/A")
          .map((item) => ({
            name: String(item.circle).trim(),
            alarms: item.deviceAlert || 0,
          }));
        setCurrentLevel("circles");
        setBarChartItems(data);
        setBarChartTitle(`${zone} – Circles Alarm Distribution`);
      }
    } catch (error) {
      console.error("Error fetching circle alarms:", error);
      if (requestId === barChartRequestId.current) setBarChartItems([]);
    } finally {
      if (requestId === barChartRequestId.current) setBarChartLoading(false);
    }
  }, []);

  const fetchDivisionAlarms = useCallback(async (zone, circle) => {
    if (!zone || !circle) return;
    const requestId = ++barChartRequestId.current;
    try {
      setBarChartLoading(true);
      const response = await api.get(
        `${BASE_URL}/device-alarms?zone=${encodeURIComponent(zone)}&circle=${encodeURIComponent(circle)}`
      );
      if (requestId !== barChartRequestId.current) return;

      if (response.data && Array.isArray(response.data)) {
        const data = response.data
          .filter((item) => item.division && String(item.division).trim() && item.division !== "Unknown" && item.division !== "N/A")
          .map((item) => ({
            name: String(item.division).trim(),
            alarms: item.deviceAlert || 0,
          }));
        setCurrentLevel("divisions");
        setBarChartItems(data);
        setBarChartTitle(`${circle} – Divisions Alarm Distribution`);
      }
    } catch (error) {
      console.error("Error fetching division alarms:", error);
      if (requestId === barChartRequestId.current) setBarChartItems([]);
    } finally {
      if (requestId === barChartRequestId.current) setBarChartLoading(false);
    }
  }, []);

  const fetchAreaAlarms = useCallback(async (zone, circle, division) => {
    if (!zone || !circle || !division) return;
    const requestId = ++barChartRequestId.current;
    try {
      setBarChartLoading(true);
      const response = await api.get(
        `${BASE_URL}/api/getCoordinates/newCircle?circle=${encodeURIComponent(circle)}&marginMinutes=${marginMinutes}&username=Master`
      );
      if (requestId !== barChartRequestId.current) return;

      if (response.data && Array.isArray(response.data)) {
        const filteredData = response.data.filter(
          (item) => item.zone === zone && (item.divison === division || item.division === division)
        );

        const areaMap = new Map();
        filteredData.forEach((item) => {
          const areaName = (item.area || "Unknown").trim();
          if (areaName === "Unknown" || areaName === "N/A" || areaName === "") return;
          
          if (!areaMap.has(areaName)) areaMap.set(areaName, { alarms: 0 });
          if (item.statusType !== 1 && item.isNotCommunicating !== false) {
            areaMap.get(areaName).alarms += 1;
          }
        });

        const data = Array.from(areaMap.entries()).map(([name, value]) => ({
          name,
          alarms: value.alarms,
        }));

        setCurrentLevel("areas");
        setBarChartItems(data);
        setBarChartTitle(`${division} – Areas Alarm Distribution`);
      }
    } catch (error) {
      console.error("Error fetching area alarms:", error);
      if (requestId === barChartRequestId.current) setBarChartItems([]);
    } finally {
      if (requestId === barChartRequestId.current) setBarChartLoading(false);
    }
  }, [marginMinutes]);

  /* ------------------- Detail handlers ------------------- */
  const handleBarPress = async (item) => {
    setDetailLoading(true);
    setDetailModalVisible(true);
    setDetailTableData([]);

    try {
      if (currentLevel === "zones") {
        setDetailModalTitle(`${item.name} – Circles`);
        setDetailCurrentLevel("circles");
        const response = await api.get(
          `${BASE_URL}/device-alarms?zone=${encodeURIComponent(item.name)}`
        );
        if (response.data && Array.isArray(response.data)) {
          const tableData = response.data
            .filter((d) => d.circle && d.circle !== "Unknown" && d.circle !== "N/A")
            .map((d, idx) => ({
              key: `circle-${idx}`,
              name: d.circle || "N/A",
              count: d.deviceAlert || 0,
              level: "circles",
              parentName: item.name,
            }));
          setDetailTableData(tableData);
        }
      } else if (currentLevel === "circles") {
        setDetailModalTitle(`${item.name} – Divisions`);
        setDetailCurrentLevel("divisions");
        const zoneName = selectedZone || item.parentName;
        const response = await api.get(
          `${BASE_URL}/device-alarms?zone=${encodeURIComponent(zoneName)}&circle=${encodeURIComponent(item.name)}`
        );
        if (response.data && Array.isArray(response.data)) {
          const tableData = response.data
            .filter((d) => d.division && d.division !== "Unknown" && d.division !== "N/A")
            .map((d, idx) => ({
              key: `division-${idx}`,
              name: d.division || "N/A",
              count: d.deviceAlert || 0,
              level: "divisions",
              parentName: item.name,
            }));
          setDetailTableData(tableData);
        }
      } else if (currentLevel === "divisions") {
        setDetailModalTitle(`${item.name} – Areas`);
        setDetailCurrentLevel("areas");
        const circleName = selectedCircle || item.parentName;
        const response = await api.get(
          `${BASE_URL}/api/getCoordinates/newCircle?circle=${encodeURIComponent(circleName)}&marginMinutes=${marginMinutes}&username=Master`
        );
        if (response.data && Array.isArray(response.data)) {
          const filtered = response.data.filter(
            (d) => (d.divison === item.name || d.division === item.name) &&
                   (!selectedZone || d.zone === selectedZone)
          );
          const areaMap = new Map();
          filtered.forEach((d) => {
            const areaName = (d.area || "Unknown").trim();
            if (areaName === "Unknown" || areaName === "N/A" || areaName === "") return;
            
            if (!areaMap.has(areaName)) areaMap.set(areaName, { alarms: 0 });
            if (d.statusType !== 1) areaMap.get(areaName).alarms += 1;
          });
          const tableData = Array.from(areaMap.entries()).map(([name, value], idx) => ({
            key: `area-${idx}`,
            name,
            count: value.alarms,
            level: "areas",
            parentName: item.name,
          }));
          setDetailTableData(tableData); 
        }
      } else {
        setDetailModalTitle(`${item.name} – Sites`);
        setDetailCurrentLevel("sites");
        const sites = communicationData.filter((d) => d.area === item.name);
        const tableData = sites.map((d, idx) => ({
          key: `site-${idx}`,
          name: d.siteId || "N/A",
          count: d.status ? 0 : 1,
          level: "sites",
          parentName: item.name,
        }));
        setDetailTableData(tableData);
      }
    } catch (error) {
      console.error("Error loading detail table:", error);
      Alert.alert("Error", "Failed to load details");
      setDetailModalVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTableRowPress = async (item) => {
    if (item.level === "circles") {
      setDetailLoading(true);
      setDetailModalTitle(`${item.name} – Divisions`);
      setDetailCurrentLevel("divisions");
      try {
        const zoneName = selectedZone || item.parentName;
        const response = await api.get(
          `${BASE_URL}/device-alarms?zone=${encodeURIComponent(zoneName)}&circle=${encodeURIComponent(item.name)}`
        );
        if (response.data && Array.isArray(response.data)) {
          const tableData = response.data
            .filter((d) => d.division && d.division !== "Unknown" && d.division !== "N/A")
            .map((d, idx) => ({
              key: `division-${idx}`,
              name: d.division || "N/A",
              count: d.deviceAlert || 0,
              level: "divisions",
              parentName: item.name,
            }));
          setDetailTableData(tableData);
        }
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to load divisions");
      } finally {
        setDetailLoading(false);
      }
    } else if (item.level === "divisions") {
      setDetailLoading(true);
      setDetailModalTitle(`${item.name} – Areas`);
      setDetailCurrentLevel("areas");
      try {
        const circleName = selectedCircle || item.parentName;
        const response = await api.get(
          `${BASE_URL}/api/getCoordinates/newCircle?circle=${encodeURIComponent(circleName)}&marginMinutes=${marginMinutes}&username=Master`
        );
        if (response.data && Array.isArray(response.data)) {
          const filtered = response.data.filter(
            (d) => (d.divison === item.name || d.division === item.name) &&
                   (!selectedZone || d.zone === selectedZone)
          );
          const areaMap = new Map();
          filtered.forEach((d) => {
            const areaName = (d.area || "Unknown").trim();
            if (areaName === "Unknown" || areaName === "N/A" || areaName === "") return;
            
            if (!areaMap.has(areaName)) areaMap.set(areaName, { alarms: 0 });
            if (d.statusType !== 1) areaMap.get(areaName).alarms += 1;
          });
          const tableData = Array.from(areaMap.entries()).map(([name, value], idx) => ({
            key: `area-${idx}`,
            name,
            count: value.alarms,
            level: "areas",
            parentName: item.name,
          }));
          setDetailTableData(tableData);
        }
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to load areas");
      } finally {
        setDetailLoading(false);
      }
    } else if (item.level === "areas") {
      setDetailLoading(true);
      setDetailModalTitle(`${item.name} – Sites`);
      setDetailCurrentLevel("sites");
      try {
        const sites = communicationData.filter((d) => d.area === item.name);
        const tableData = sites.map((d, idx) => ({
          key: `site-${idx}`,
          name: d.siteId || "N/A",
          count: d.status ? 0 : 1,
          level: "sites",
          parentName: item.name,
        }));
        setDetailTableData(tableData);
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to load sites");
      } finally {
        setDetailLoading(false);
      }
    }
  };

  /* =========================================================
     HIERARCHY PICKERS - UPDATED WITH CORRECT API ENDPOINTS
     ========================================================= */
  const fetchStates = async () => {
    setStates(["Maharastra"]);
  };

  const fetchZonesForState = async (state) => {
    if (!state) return;
    try {
      // Use the correct API endpoint for zones
      const response = await api.get(`${BASE_URL}/api/zones?state=${encodeURIComponent(state)}`);
      const data = Array.isArray(response.data) ? response.data : [];
      
      if (data.length > 0) {
        // Extract zone names from the response
        const zoneNames = data.map((item) => item.name).filter(Boolean);
        setZones(zoneNames);
        return;
      }
      
      // Fallback: if API doesn't return zones, try from communicationData
      if (communicationData && communicationData.length > 0) {
        const uniqueZones = [
          ...new Set(
            communicationData
              .map((item) => item.zone)
              .filter((z) => z && z !== "N/A" && z !== "Unknown" && String(z).trim())
          ),
        ];
        if (uniqueZones.length > 0) {
          setZones(uniqueZones);
          return;
        }
      }

      // Final fallback
      setZones(["Bhandup", "Kalyan", "Nashik", "Jalgaon", "Konkan"]);
    } catch (e) {
      console.error("Error fetching zones:", e);
      // Fallback values
      setZones(["Bhandup", "Kalyan", "Nashik", "Jalgaon", "Konkan"]);
    }
  };

  const fetchCirclesForZone = async (zone) => {
    if (!zone) return;
    try {
      const response = await api.get(
        `${BASE_URL}/api/circles?zone=${encodeURIComponent(zone)}`
      );
      const data = Array.isArray(response.data) ? response.data : [];
      const circleNames = data.map((item) => item.name).filter(Boolean);
      setCircles(circleNames.length > 0 ? circleNames : []);
    } catch (e) {
      console.error("Error fetching circles:", e);
      setCircles([]);
    }
  };

  const fetchDivisionsForCircle = async (circle) => {
    if (!circle) return;
    try {
      const response = await api.get(
        `${BASE_URL}/api/divisions?circle=${encodeURIComponent(circle)}`
      );
      const data = Array.isArray(response.data) ? response.data : [];
      const divisionNames = data.map((item) => item.name).filter(Boolean);
      setDivisions(divisionNames.length > 0 ? divisionNames : []);
    } catch (e) {
      console.error("Error fetching divisions:", e);
      setDivisions([]);
    }
  };

  const fetchAreasForDivision = async (division) => {
    if (!division) return;
    try {
      const response = await api.get(
        `${BASE_URL}/api/areas?division=${encodeURIComponent(division)}`
      );
      const data = Array.isArray(response.data) ? response.data : [];
      let filtered = data;
      if (selectedZone) {
        filtered = data.filter((item) => item.zone === selectedZone);
      }
      const areaNames = filtered.map((item) => item.name).filter(Boolean);
      setAreas(areaNames.length > 0 ? areaNames : []);
    } catch (e) {
      console.error("Error fetching areas:", e);
      setAreas([]);
    }
  };

  /* ========== CORE: /latest called ONLY ONCE ========== */
  const fetchCommunicationStatus = async () => {
    try {
      console.log("Fetching /latest ...");
      const response = await api.get(`${BASE_URL}/latest`);

      if (!response.data) {
        Alert.alert("Error", "No data received from /latest");
        setCommunicationData([]);
        applyFiltersAndUpdateUI([]);
        return;
      }

      const rawData = Array.isArray(response.data) ? response.data : [];
      console.log("Latest records received:", rawData.length);

      const data = rawData.map((item) => {
        const stringVoltage = Number(item.stringVoltage) || 0;
        const instantaneousCurrent = Number(item.instantaneousCurrent) || 0;
        const isCommunicating = item.isNotCommunicating === false;

        const isFloat =
          stringVoltage >= 33 && stringVoltage <= 35 && instantaneousCurrent < 10;
        const isBoost =
          stringVoltage > 35 && instantaneousCurrent < 10;
        const isTrip = item.chargerTrip === true;

        return {
          ...item,
          status: isCommunicating,
          serialNumber: item.serialNumber || "N/A",
          area: item.area || "N/A",
          state: item.state || "N/A",
          zone: item.zone || "N/A",
          circle: item.circle || "N/A",
          division: item.division || item.divison || "N/A",
          isFloat,
          isBoost,
          isTrip,
          stringVoltage,
          instantaneousCurrent,
        };
      });

      setCommunicationData(data);
      applyFiltersAndUpdateUI(data);
    } catch (e) {
      console.error("Error fetching /latest:", e?.response?.status, e?.message);
      Alert.alert(
        "API Error",
        `Failed to load /latest\nStatus: ${e?.response?.status || "Network Error"}`
      );
      setCommunicationData([]);
      applyFiltersAndUpdateUI([]);
    }
  };

  /* ========== Filter by pickers ========== */
  const applyFiltersAndUpdateUI = useCallback(
    (fullData) => {
      if (!fullData || fullData.length === 0) {
        setCircleStatusData({
          totalSites: 0,
          activeAlarms: 0,
          uptime: 0,
          chargerBoost: 0,
          chargerFloat: 0,
          chargerTrip: 0,
          floatVoltage: 0,
          thermalRunaway: 0,
        });
        setPieChartData([]);
        setMarkers([]);
        return;
      }

      let filtered = [...fullData];

      // Apply filters
      if (selectedArea) {
        filtered = filtered.filter((item) => item.area === selectedArea);
      } else if (selectedDivision) {
        filtered = filtered.filter(
          (item) =>
            item.division === selectedDivision ||
            item.divison === selectedDivision
        );
      } else if (selectedCircle) {
        filtered = filtered.filter((item) => item.circle === selectedCircle);
      } else if (selectedZone) {
        filtered = filtered.filter(
          (item) =>
            !item.zone ||
            item.zone === "N/A" ||
            item.zone === selectedZone
        );
      }

      let communicatingCount = 0;
      let nonCommunicatingCount = 0;
      let chargerBoost = 0;
      let chargerFloat = 0;
      let chargerTrip = 0;
      let floatVoltage = 0;
      let thermalRunaway = 0;
      let activeAlarms = 0;

      filtered.forEach((item) => {
        // Communication status
        if (item.status === true) communicatingCount++;
        else nonCommunicatingCount++;

        // Charger status
        if (item.isBoost) chargerBoost++;
        if (item.isFloat) chargerFloat++;
        if (item.isTrip) chargerTrip++;

        // Check for Float Voltage alarm
        if (item.floatVoltage === 0 || item.floatVoltage === 2) {
          floatVoltage++;
        }

        // Check for Thermal Runaway alarm
        if (item.thermalRunaway === true) {
          thermalRunaway++;
        }

        // Check for active alarms using ALARM_DEFS
        if (hasActiveAlarm(item)) {
          activeAlarms++;
        }
      });

      const totalSites = filtered.length;
      const uptime = totalSites > 0 ? (communicatingCount / totalSites) * 100 : 0;

      setCircleStatusData({
        totalSites,
        activeAlarms,
        uptime: Math.round(uptime * 10) / 10,
        chargerBoost,
        chargerFloat,
        chargerTrip,
        floatVoltage,
        thermalRunaway,
      });

      setPieChartData([
        {
          name: "Communicating",
          count: communicatingCount,
          color: "#4CAF50",
          legendFontColor: "#4CAF50",
          legendFontSize: 10,
        },
        {
          name: "Non-Commun",
          count: nonCommunicatingCount,
          color: "#F44336",
          legendFontColor: "#F44336",
          legendFontSize: 10,
        },
      ]);

      const mapMarkers = filtered
        .filter((item) => item.latitude && item.longitude)
        .map((item) => ({
          siteId: item.siteId,
          serialNumber: item.serialNumber,
          area: item.area,
          state: item.state,
          zone: item.zone,
          circle: item.circle,
          division: item.division,
          latitude: item.latitude,
          longitude: item.longitude,
          status: item.status,
          icon: getMarkerIcon(item.status),
        }));

      setMarkers(mapMarkers);
    },
    [selectedZone, selectedCircle, selectedDivision, selectedArea]
  );

  /* ------------------- Picker Handlers ------------------- */
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
      fetchZoneAlarms();
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
      fetchCircleAlarms(zone);
    } else if (selectedState) {
      fetchZonesForState(selectedState);
      fetchZoneAlarms();
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
      if (selectedZone) fetchDivisionAlarms(selectedZone, circle);
    } else if (selectedZone) {
      fetchCirclesForZone(selectedZone);
      fetchCircleAlarms(selectedZone);
    } else if (selectedState) {
      fetchZonesForState(selectedState);
      fetchZoneAlarms();
    }
  };

  const handleDivisionSelection = (division) => {
    setSelectedDivision(division);
    setSelectedArea(null);
    setAreas([]);
    if (division) {
      fetchAreasForDivision(division);
      if (selectedZone && selectedCircle) {
        fetchAreaAlarms(selectedZone, selectedCircle, division);
      }
    } else if (selectedCircle) {
      fetchDivisionsForCircle(selectedCircle);
      if (selectedZone) fetchDivisionAlarms(selectedZone, selectedCircle);
    } else if (selectedZone) {
      fetchCirclesForZone(selectedZone);
      fetchCircleAlarms(selectedZone);
    } else if (selectedState) {
      fetchZonesForState(selectedState);
      fetchZoneAlarms();
    }
  };

  const handleAreaSelection = (area) => {
    setSelectedArea(area);
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      setSelectedZone(null);
      setSelectedCircle(null);
      setSelectedDivision(null);
      setSelectedArea(null);
      setCircles([]);
      setDivisions([]);
      setAreas([]);
      if (selectedState) {
        fetchZonesForState(selectedState);
        fetchZoneAlarms();
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setSelectedZone(null);
      setSelectedCircle(null);
      setSelectedDivision(null);
      setSelectedArea(null);
      setZones([]);
      setCircles([]);
      setDivisions([]);
      setAreas([]);
      await fetchCommunicationStatus();
      await fetchStates();
      await fetchZoneAlarms();
    } finally {
      setRefreshing(false);
    }
  };

  const handleCommPieChartClick = (status) => {
    setSelectedCommStatus(status);

    let filtered = [...communicationData];

    if (selectedArea) {
      filtered = filtered.filter((item) => item.area === selectedArea);
    } else if (selectedDivision) {
      filtered = filtered.filter(
        (item) =>
          item.division === selectedDivision ||
          item.divison === selectedDivision
      );
    } else if (selectedCircle) {
      filtered = filtered.filter((item) => item.circle === selectedCircle);
    } else if (selectedZone) {
      filtered = filtered.filter(
        (item) =>
          !item.zone ||
          item.zone === "N/A" ||
          item.zone === selectedZone
      );
    }

    const tableData = filtered
      .filter((item) =>
        status === "Communicating" ? item.status === true : item.status === false
      )
      .map((item, idx) => ({
        siteId: item.siteId || "--",
        serialNumber: item.serialNumber || "--",
        area: item.area || "N/A",
        key: `comm-${item.siteId}-${idx}`,
      }));

    setCommTableData(tableData);
    setModalVisible(true);
  };

  /* ========== INITIAL LOAD ========== */
  useEffect(() => {
    const init = async () => {
      setStates(["Maharastra"]);
      setSelectedState("Maharastra");
      await fetchCommunicationStatus();
      await fetchZonesForState("Maharastra");
      fetchZoneAlarms();
    };
    init();
  }, []);

  // Fill zones from /latest data (fallback)
  useEffect(() => {
    if (communicationData.length > 0 && zones.length === 0) {
      const uniqueZones = [
        ...new Set(
          communicationData
            .map((item) => item.zone)
            .filter((z) => z && z !== "N/A" && z !== "Unknown" && String(z).trim())
        ),
      ];
      if (uniqueZones.length > 0) {
        setZones(uniqueZones);
      }
    }
  }, [communicationData]);

  // Re-apply filters when pickers change
  useEffect(() => {
    applyFiltersAndUpdateUI(communicationData);
  }, [
    selectedZone,
    selectedCircle,
    selectedDivision,
    selectedArea,
    communicationData,
    applyFiltersAndUpdateUI,
  ]);

  const renderCommTableRow = ({ item }) => (
    <View style={styles.tableRow} key={item.key}>
      <Text style={[styles.tableCell, { width: 100 }]}>{item.siteId}</Text>
      <Text style={[styles.tableCell, { width: 120 }]}>{item.serialNumber}</Text>
      <Text style={[styles.tableCell, { width: 100 }]}>{item.area}</Text>
    </View>
  );

  const renderDetailTableRow = ({ item }) => (
    <TouchableOpacity
      style={styles.detailTableRow}
      onPress={() => {
        if (item.level && item.level !== "sites") handleTableRowPress(item);
      }}
      activeOpacity={item.level && item.level !== "sites" ? 0.7 : 1}
    >
      <Text style={[styles.detailTableCell, { flex: 2 }]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text
        style={[
          styles.detailTableCell,
          { flex: 1, textAlign: "center", fontWeight: "bold", color: "#F44336" },
        ]}
      >
        {item.count}
      </Text>
      {item.level && item.level !== "sites" && (
        <Ionicons name="chevron-forward" size={16} color="#999" style={{ marginLeft: 5 }} />
      )}
    </TouchableOpacity>
  );

  const getTableHeaderColor = (type) => {
    if (type === "Communicating") return { backgroundColor: "#4CAF50", color: "#fff" };
    if (type === "Non-Communicating") return { backgroundColor: "#F44336", color: "#fff" };
    return { backgroundColor: "#4CAF50", color: "#fff" };
  };

  const showClear = selectedZone || selectedCircle || selectedDivision || selectedArea;

  const renderCircleStatus = () => (
    <View style={styles.circleStatusContainer}>
      <View style={styles.statusHeader}>
        <Ionicons name="stats-chart" size={18} color="#4CAF50" />
        <Text style={styles.statusTitle}> Status</Text>
      </View>
      <View style={styles.statusGrid}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Total Sites</Text>
          <Text style={styles.statusValue}>{circleStatusData.totalSites}</Text>
        </View>
        <View style={[styles.statusItem, styles.statusItemBorder]}>
          <Text style={styles.statusLabel}>Active Alarms</Text>
          <Text style={[styles.statusValue, styles.alarmValue]}>
            {circleStatusData.activeAlarms}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Uptime</Text>
          <Text style={[styles.statusValue, styles.uptimeValue]}>
            {circleStatusData.uptime}%
          </Text>
        </View>
      </View>

      {/* All 5 metrics in one horizontal row */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricsItem}>
          <Ionicons name="battery-charging" size={20} color="#FF9800" />
          <Text style={styles.metricsLabel}>Boost</Text>
          <Text style={[styles.metricsValue, styles.boostValue]}>
            {circleStatusData.chargerBoost}
          </Text>
        </View>
        <View style={[styles.metricsItem, styles.metricsItemBorder]}>
          <Ionicons name="battery-full" size={20} color="#2196F3" />
          <Text style={styles.metricsLabel}>Float</Text>
          <Text style={[styles.metricsValue, styles.floatValue]}>
            {circleStatusData.chargerFloat}
          </Text>
        </View>
        <View style={[styles.metricsItem, styles.metricsItemBorder]}>
          <Ionicons name="warning" size={20} color="#F44336" />
          <Text style={styles.metricsLabel}>Trip</Text>
          <Text style={[styles.metricsValue, styles.tripValue]}>
            {circleStatusData.chargerTrip}
          </Text>
        </View>
        <View style={[styles.metricsItem, styles.metricsItemBorder]}>
          <Ionicons name="flash" size={20} color="#9C27B0" />
          <Text style={styles.metricsLabel}>Float deviation</Text>
          <Text style={[styles.metricsValue, styles.floatVoltageValue]}>
            {circleStatusData.floatVoltage}
          </Text>
        </View>
        <View style={styles.metricsItem}>
          <Ionicons name="thermometer" size={20} color="#E91E63" />
          <Text style={styles.metricsLabel}>Thermal</Text>
          <Text style={[styles.metricsValue, styles.thermalRunawayValue]}>
            {circleStatusData.thermalRunaway}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator
      >
        {/* Filters */}
        <View style={styles.searchContainer}>
          <View style={styles.pickerRow}>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={handleStateSelection}
                items={states.map((s, i) => ({ label: s, value: s, key: `state-${i}` }))}
                placeholder={{ label: "Select state...", value: null }}
                style={pickerSelectStyles.dropdown}
                value={selectedState}
                useNativeAndroidPickerStyle={false}
                fixAndroidTouchableBug
              />
            </View>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={handleZoneSelection}
                items={zones.map((z, i) => ({ label: z, value: z, key: `zone-${i}` }))}
                placeholder={{ label: "Select zone...", value: null }}
                style={pickerSelectStyles.dropdown}
                disabled={!selectedState}
                value={selectedZone}
                useNativeAndroidPickerStyle={false}
                fixAndroidTouchableBug
              />
            </View>
          </View>

          <View style={styles.pickerRow}>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={handleCircleSelection}
                items={circles.map((c, i) => ({ label: c, value: c, key: `circle-${i}` }))}
                placeholder={{ label: "Select circle...", value: null }}
                style={pickerSelectStyles.dropdown}
                disabled={!selectedZone}
                value={selectedCircle}
                useNativeAndroidPickerStyle={false}
                fixAndroidTouchableBug
              />
            </View>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={handleDivisionSelection}
                items={divisions.map((d, i) => ({ label: d, value: d, key: `division-${i}` }))}
                placeholder={{ label: "Select division...", value: null }}
                style={pickerSelectStyles.dropdown}
                disabled={!selectedCircle}
                value={selectedDivision}
                useNativeAndroidPickerStyle={false}
                fixAndroidTouchableBug
              />
            </View>
          </View>

          <View style={styles.pickerRow}>
            <View style={[styles.pickerContainer, { flex: 1 }]}>
              <RNPickerSelect
                onValueChange={handleAreaSelection}
                items={areas.map((a, i) => ({ label: a, value: a, key: `area-${i}` }))}
                placeholder={{ label: "Select area...", value: null }}
                style={pickerSelectStyles.dropdown}
                disabled={!selectedDivision || areas.length === 0}
                value={selectedArea}
                useNativeAndroidPickerStyle={false}
                fixAndroidTouchableBug
              />
            </View>

            {showClear && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClear} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="close-circle" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status Cards */}
        <View style={styles.dashboardSection}>{renderCircleStatus()}</View>

        {/* Bar Chart */}
        {barChartLoading ? (
          <View style={styles.barChartContainer}>
            <View style={styles.barChartHeader}>
              <Text style={styles.barChartTitle}>Loading...</Text>
            </View>
            <View style={styles.noDataContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.noDataText}>Loading alarm data...</Text>
            </View>
          </View>
        ) : (
          <ShinyHorizontalBarChart
            data={barChartItems}
            title={barChartTitle}
            onBarPress={handleBarPress}
          />
        )}

        {/* Pie Chart */}
        <View style={styles.pieChartContainer}>
          <Text style={styles.chartTitle}>Device Communication Status</Text>
          {pieChartData.length > 0 ? (
            <>
              <PieChart
                data={pieChartData}
                width={screenWidth - 40}
                height={100}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="count"
                backgroundColor="transparent"
                paddingLeft="5"
                absolute
                hasLegend
              />
              <View style={styles.dataContainer}>
                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={() => handleCommPieChartClick("Communicating")}
                >
                  <Text style={styles.detailsButtonText}>View Communicating Devices</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.detailsButton, styles.nonCommButton]}
                  onPress={() => handleCommPieChartClick("Non-Communicating")}
                >
                  <Text style={styles.detailsButtonText}>View Non-Communicating</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.noDataContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.noDataText}>Loading device data...</Text>
            </View>
          )}
        </View>

        {/* Map */}
        {/* <View style={styles.mapContainer}>
          <Text style={styles.mapTitle}>
            {selectedState ? `State: ${selectedState}` : "All Sites"} ({markers.length} sites)
          </Text>
          <LeafletMapView markers={markers} />
        </View> */}
      </ScrollView>

      {/* Communication Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedCommStatus} Devices</Text>
            <ScrollView horizontal>
              <View>
                <View
                  style={{
                    ...styles.tableHeader,
                    backgroundColor: getTableHeaderColor(selectedCommStatus).backgroundColor,
                  }}
                >
                  <Text
                    style={[
                      styles.tableHeaderCell,
                      { width: 100, color: getTableHeaderColor(selectedCommStatus).color },
                    ]}
                  >
                    Site ID
                  </Text>
                  <Text
                    style={[
                      styles.tableHeaderCell,
                      { width: 120, color: getTableHeaderColor(selectedCommStatus).color },
                    ]}
                  >
                    Serial Number
                  </Text>
                  <Text
                    style={[
                      styles.tableHeaderCell,
                      { width: 100, color: getTableHeaderColor(selectedCommStatus).color },
                    ]}
                  >
                    Area
                  </Text>
                </View>
                <FlatList
                  data={commTableData}
                  renderItem={renderCommTableRow}
                  keyExtractor={(it) => it.key}
                  ListEmptyComponent={
                    <Text style={styles.noResultsText}>No devices found</Text>
                  }
                />
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.modalTitle}>{detailModalTitle}</Text>
              <Text style={styles.detailLevelBadge}>{detailCurrentLevel || "Details"}</Text>
            </View>

            {detailLoading ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#F44336" />
                <Text style={{ marginTop: 10, color: "#666" }}>Loading...</Text>
              </View>
            ) : (
              <>
                <View style={styles.detailTableHeader}>
                  <Text style={[styles.detailHeaderCell, { flex: 2 }]}>Name</Text>
                  <Text style={[styles.detailHeaderCell, { flex: 1, textAlign: "center" }]}>
                    Alarms
                  </Text>
                  <Text style={[styles.detailHeaderCell, { width: 30 }]} />
                </View>

                <FlatList
                  data={detailTableData}
                  renderItem={renderDetailTableRow}
                  keyExtractor={(item) => item.key}
                  style={{ maxHeight: 350 }}
                  ListEmptyComponent={
                    <Text style={styles.noResultsText}>No data found</Text>
                  }
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: "#F44336" }]}
              onPress={() => setDetailModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ------------------- Styles ------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scrollContent: { paddingBottom: 15, paddingHorizontal: 8 },
  searchContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 1,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    justifyContent: "space-between",
  },
  pickerContainer: { flex: 1, marginRight: 6, height: 32 },
  clearButton: {
    backgroundColor: "#f44336",
    padding: 6,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    width: 32,
    height: 32,
    marginLeft: 6,
  },
  dashboardSection: { marginVertical: 6 },
  circleStatusContainer: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 1,
    marginBottom: 6,
  },
  statusHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  statusTitle: { fontSize: 14, fontWeight: "bold", color: "#333", marginLeft: 6 },
  statusGrid: { flexDirection: "row", justifyContent: "space-around", marginBottom: 12 },
  statusItem: { alignItems: "center", flex: 1, paddingHorizontal: 3 },
  statusItemBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#e0e0e0" },
  statusLabel: { fontSize: 10, color: "#666", marginBottom: 2 },
  statusValue: { fontSize: 18, fontWeight: "bold", color: "#333" },
  alarmValue: { color: "#F44336" },
  uptimeValue: { color: "#4CAF50" },

  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    marginTop: 4,
  },
  metricsItem: { 
    alignItems: "center", 
    flex: 1, 
    paddingHorizontal: 2,
  },
  metricsItemBorder: { 
    borderLeftWidth: 1, 
    borderRightWidth: 1, 
    borderColor: "#e0e0e0" 
  },
  metricsLabel: { 
    fontSize: 8, 
    color: "#666", 
    marginTop: 2, 
    textAlign: "center" 
  },
  metricsValue: { 
    fontSize: 14, 
    fontWeight: "bold", 
    marginTop: 2 
  },
  boostValue: { color: "#FF9800" },
  floatValue: { color: "#2196F3" },
  tripValue: { color: "#F44336" },
  floatVoltageValue: { color: "#9C27B0" },
  thermalRunawayValue: { color: "#E91E63" },

  barChartContainer: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 1,
    marginBottom: 8,
  },
  barChartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  barChartTitle: { fontSize: 13, fontWeight: "bold", color: "#333", flex: 1 },
  barChartCount: {
    fontSize: 10,
    color: "#666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  shinyLegend: { flexDirection: "row", marginBottom: 8 },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendColor: { width: 10, height: 10, borderRadius: 2, marginRight: 5 },
  legendText: { fontSize: 11, color: "#555" },
  barScroll: { maxHeight: 220 },
  shinyRow: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  shinyLabel: { width: 100, fontSize: 11, color: "#333", marginRight: 6 },
  shinyTrack: {
    flex: 1,
    height: 18,
    borderRadius: 3,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
  },
  shinyBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.05)" },
  shinyBar: { height: "100%", borderRadius: 3, backgroundColor: "#F44336" },
  shinyValue: { position: "absolute", left: 6, fontSize: 10, fontWeight: "700", color: "#fff" },
  noDataContainer: { height: 100, justifyContent: "center", alignItems: "center" },
  noDataText: { marginTop: 6, fontSize: 12, color: "#666" },

  pieChartContainer: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 1,
    alignItems: "center",
    marginBottom: 6,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
    textAlign: "center",
    color: "#333",
  },
  dataContainer: {
    marginTop: 6,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailsButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    flex: 1,
    marginHorizontal: 3,
    alignItems: "center",
  },
  nonCommButton: { backgroundColor: "#f44336" },
  detailsButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 10,
    textAlign: "center",
  },

  mapContainer: {
    width: "100%",
    height: 300,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    elevation: 1,
    marginBottom: 6,
  },
  mapTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    padding: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    color: "#333",
  },
  map: { width: "100%", height: "100%" },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
    color: "#333",
  },
  detailModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLevelBadge: {
    fontSize: 11,
    color: "#fff",
    backgroundColor: "#F44336",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    fontWeight: "bold",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderCell: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    borderRightWidth: 1,
    borderColor: "#fff",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
    paddingVertical: 8,
  },
  tableCell: {
    fontSize: 13,
    textAlign: "center",
    borderRightWidth: 1,
    borderColor: "#e0e0e0",
    padding: 6,
    color: "#555",
  },
  closeButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  noResultsText: { padding: 20, fontSize: 14, color: "#666", textAlign: "center" },

  detailTableHeader: {
    flexDirection: "row",
    backgroundColor: "#F44336",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  detailHeaderCell: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  detailTableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  detailTableCell: { fontSize: 13, color: "#333" },
});

const pickerSelectStyles = {
  dropdown: {
    inputIOS: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      backgroundColor: "#f9f9f9",
      borderRadius: 4,
      borderWidth: 1,
      borderColor: "#4CAF50",
      fontSize: 11,
      color: "#333",
      height: 32,
      width: "100%",
      textAlign: "left",
    },
    inputAndroid: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      backgroundColor: "#f9f9f9",
      borderRadius: 4,
      borderWidth: 1,
      borderColor: "#4CAF50",
      fontSize: 11,
      color: "#333",
      height: 32,
      width: "100%",
      textAlign: "left",
    },
  },
};