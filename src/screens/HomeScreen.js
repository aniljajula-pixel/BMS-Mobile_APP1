// src/screens/HomeScreen.js
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
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
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../AuthContext";
import { useSelection } from "../../SelectionContext";

const screenWidth = Dimensions.get("window").width;
const BASE_URL = "https://rbms.mahadiscom.in/mseb";
const DASHBOARD_URL = `${BASE_URL}/api/dashboard`;

const getMarkerIcon = (status) =>
  status
    ? "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-2x-green.png"
    : "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers/img/marker-icon-2x-red.png";

/* =========================================================
   Leaflet Map
   ========================================================= */
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

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>body,html,#map{margin:0;padding:0;width:100%;height:100%;}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const map = L.map('map').setView([21.0, 78.0], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map);
  map.whenReady(() => { ${markersScript}
    if (${markers.length} > 0) {
      const group = L.featureGroup();
      map.eachLayer(l => { if (l instanceof L.Marker) group.addLayer(l); });
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  });
</script></body></html>`;

  return (
    <WebView
      ref={webViewRef}
      source={{ html }}
      style={styles.map}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      scalesPageToFit={false}
      renderLoading={() => (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      )}
    />
  );
};

/* =========================================================
   Shiny Horizontal Bar Chart
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

/* =========================================================
   MAIN COMPONENT
   ========================================================= */
export default function HomeScreen() {
  const { userToken } = useContext(AuthContext);
  const {
    selectedState,
    selectedZone,
    selectedCircle,
    selectedDivision,
    selectedArea,
  } = useSelection();

  /* ------------------- State ------------------- */
  const [refreshing, setRefreshing] = useState(false);

  const [dashboardSummary, setDashboardSummary] = useState({
    totalSitesCount: 0,
    activeSitesCount: 0,
    inactiveSitesCount: 0,
    alarmActiveSitesCount: 0,
    upTime: 0,
    boostCount: 0,
    floatCount: 0,
    floatDeviationCount: 0,
    thermalRunwayDeviationCount: 0,
  });

  const [siteList, setSiteList] = useState([]);
  const [pendingSiteList, setPendingSiteList] = useState([]);

  const [pieChartData, setPieChartData] = useState([]);
  const [markers, setMarkers] = useState([]);

  const [barChartItems, setBarChartItems] = useState([]);
  const [barChartTitle, setBarChartTitle] = useState("Zones Alarm Distribution");
  const [currentLevel, setCurrentLevel] = useState("zones");
  const [barChartLoading, setBarChartLoading] = useState(false);

  // 🔹 Refs to hold the CURRENT bar-chart context (sync, no async state issues)
  const currentZoneRef = useRef(null);
  const currentCircleRef = useRef(null);
  const currentDivisionRef = useRef(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCommStatus, setSelectedCommStatus] = useState(null);
  const [commTableData, setCommTableData] = useState([]);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailModalTitle, setDetailModalTitle] = useState("");
  const [detailTableData, setDetailTableData] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailCurrentLevel, setDetailCurrentLevel] = useState("");

  /* ---------------- Caches & refs ---------------- */
  const dashboardCache = useRef(new Map());
  const alarmsCache = useRef(new Map());
  const CACHE_TTL = 5 * 60_000;
  const isFresh = (e) => e && Date.now() - e.ts < CACHE_TTL;

  const reqIdRef = useRef(0);

  /* ---------------- URL builder ---------------- */
  const buildDashboardUrl = useCallback((z, c, d, a) => {
    const p = [];
    if (z) p.push(`zone=${encodeURIComponent(z)}`);
    if (c) p.push(`circle=${encodeURIComponent(c)}`);
    if (d) p.push(`subDivision=${encodeURIComponent(d)}`);
    if (a) p.push(`area=${encodeURIComponent(a)}`);
    return p.length ? `${DASHBOARD_URL}?${p.join("&")}` : DASHBOARD_URL;
  }, []);

  /* =========================================================
     Cached fetchers
     ========================================================= */

  const fetchDashboardCached = useCallback(
    async (z, c, d, a) => {
      const key = `${z || ""}|${c || ""}|${d || ""}|${a || ""}`;
      const cached = dashboardCache.current.get(key);
      if (isFresh(cached)) return cached.data;
      const res = await api.get(buildDashboardUrl(z, c, d, a));
      dashboardCache.current.set(key, { data: res.data, ts: Date.now() });
      return res.data;
    },
    [buildDashboardUrl]
  );

  const fetchAlarmsCached = useCallback(
    async (zone, circle, division) => {
      const key = `${zone || ""}|${circle || ""}|${division || ""}`;
      const cached = alarmsCache.current.get(key);
      if (isFresh(cached)) return cached.data;
      const p = [];
      if (zone) p.push(`zone=${encodeURIComponent(zone)}`);
      if (circle) p.push(`circle=${encodeURIComponent(circle)}`);
      if (division) p.push(`division=${encodeURIComponent(division)}`);
      const url = `${BASE_URL}/device-alarms${p.length ? "?" + p.join("&") : ""}`;
      const res = await api.get(url);
      const data = Array.isArray(res.data) ? res.data : [];
      alarmsCache.current.set(key, { data, ts: Date.now() });
      return data;
    },
    []
  );

  const clearCaches = useCallback(() => {
    dashboardCache.current.clear();
    alarmsCache.current.clear();
  }, []);

  /* =========================================================
     Apply dashboard response
     ========================================================= */
  const applyDashboard = useCallback((resp) => {
    if (!resp) return;
    const s = resp.summary || {};

    setDashboardSummary({
      totalSitesCount: s.totalSitesCount || 0,
      activeSitesCount: s.activeSitesCount || 0,
      inactiveSitesCount: s.inactiveSitesCount || 0,
      alarmActiveSitesCount: s.alarmActiveSitesCount || 0,
      upTime: s.upTime || 0,
      boostCount: s.boostCount || 0,
      floatCount: s.floatCount || 0,
      floatDeviationCount: s.floatDeviationCount || 0,
      thermalRunwayDeviationCount: s.thermalRunwayDeviationCount || 0,
    });

    const markersRaw = Array.isArray(resp.mapMarkerList) ? resp.mapMarkerList : [];

    const normalize = (m) => ({
      siteId: m.siteId || "--",
      serialNumber: Array.isArray(m.serialNumber)
        ? m.serialNumber[0] || "--"
        : m.serialNumber || "--",
      area: m.area || "N/A",
      zone: m.zone || null,
      circle: m.circle || null,
      division: m.divison || m.division || m.subDivision || "N/A",
      latitude: m.latitude,
      longitude: m.longitude,
      statusType: m.statusType,
    });

    const normalized = markersRaw.map(normalize);

    const communicating = normalized.filter((x) => x.statusType === 0);
    const nonCommunicating = normalized.filter((x) => x.statusType === 1);

    setSiteList(communicating.map((x) => ({ ...x, status: true })));
    setPendingSiteList(nonCommunicating.map((x) => ({ ...x, status: false })));

    setMarkers(
      normalized
        .filter((x) => x.latitude && x.longitude)
        .map((x) => ({
          siteId: x.siteId,
          serialNumber: x.serialNumber,
          area: x.area,
          latitude: x.latitude,
          longitude: x.longitude,
          status: x.statusType === 0,
          icon: getMarkerIcon(x.statusType === 0),
        }))
    );

    setPieChartData([
      {
        name: "Communicating",
        count: s.activeSitesCount || communicating.length,
        color: "#4CAF50",
        legendFontColor: "#4CAF50",
        legendFontSize: 10,
      },
      {
        name: "Non-Commun",
        count: s.inactiveSitesCount || nonCommunicating.length,
        color: "#F44336",
        legendFontColor: "#F44336",
        legendFontSize: 10,
      },
    ]);
  }, []);

  /* =========================================================
     LEVEL FETCHERS
     🔹 Each bar item is enriched with { zone, circle } so the
        tap handler always has correct context.
     ========================================================= */

  const fetchAllData = () => {
    if (!userToken) return;
    const reqId = ++reqIdRef.current;
    setBarChartLoading(true);

    // Reset context refs
    currentZoneRef.current = null;
    currentCircleRef.current = null;
    currentDivisionRef.current = null;

    fetchAlarmsCached(null, null, null)
      .then((raw) => {
        if (reqId !== reqIdRef.current || !Array.isArray(raw)) return;
        const data = raw
          .filter((i) => i.zone && i.zone !== "Unknown" && i.zone !== "N/A")
          .map((i) => ({
            name: String(i.zone).trim(),
            alarms: i.deviceAlert || 0,
            zone: String(i.zone).trim(),
            circle: null,
          }));
        setCurrentLevel("zones");
        setBarChartItems(data);
        setBarChartTitle("Zones Alarm Distribution");
      })
      .catch(() => {})
      .finally(() => {
        if (reqId === reqIdRef.current) setBarChartLoading(false);
      });

    fetchDashboardCached(null, null, null, null)
      .then((d) => {
        if (reqId === reqIdRef.current) applyDashboard(d);
      })
      .catch(() => {});
  };

  const fetchAllForZone = (zone) => {
    if (!userToken || !zone) return;
    const reqId = ++reqIdRef.current;
    setBarChartLoading(true);

    // 🔹 Set context refs SYNCHRONOUSLY
    currentZoneRef.current = zone;
    currentCircleRef.current = null;
    currentDivisionRef.current = null;

    fetchAlarmsCached(zone, null, null)
      .then((raw) => {
        if (reqId !== reqIdRef.current || !Array.isArray(raw)) return;
        const data = raw
          .filter((i) => i.circle && i.circle !== "Unknown" && i.circle !== "N/A")
          .map((i) => ({
            name: String(i.circle).trim(),
            alarms: i.deviceAlert || 0,
            zone,
            circle: String(i.circle).trim(),
          }));
        setCurrentLevel("circles");
        setBarChartItems(data);
        setBarChartTitle(`${zone} – Circles Alarm Distribution`);
      })
      .catch(() => {})
      .finally(() => {
        if (reqId === reqIdRef.current) setBarChartLoading(false);
      });

    fetchDashboardCached(zone, null, null, null)
      .then((d) => {
        if (reqId === reqIdRef.current) applyDashboard(d);
      })
      .catch(() => {});
  };

  const fetchAllForCircle = (zone, circle) => {
    if (!userToken || !zone || !circle) return;
    const reqId = ++reqIdRef.current;
    setBarChartLoading(true);

    // 🔹 Set context refs SYNCHRONOUSLY
    currentZoneRef.current = zone;
    currentCircleRef.current = circle;
    currentDivisionRef.current = null;

    fetchAlarmsCached(zone, circle, null)
      .then((raw) => {
        if (reqId !== reqIdRef.current || !Array.isArray(raw)) return;
        const data = raw
          .filter((i) => i.division && i.division !== "Unknown" && i.division !== "N/A")
          .map((i) => ({
            name: String(i.division).trim(),
            alarms: i.deviceAlert || 0,
            zone,
            circle,
          }));
        setCurrentLevel("divisions");
        setBarChartItems(data);
        setBarChartTitle(`${circle} – Divisions Alarm Distribution`);
      })
      .catch(() => {})
      .finally(() => {
        if (reqId === reqIdRef.current) setBarChartLoading(false);
      });

    fetchDashboardCached(zone, circle, null, null)
      .then((d) => {
        if (reqId === reqIdRef.current) applyDashboard(d);
      })
      .catch(() => {});
  };

  const fetchAllForDivision = (zone, circle, division) => {
    if (!userToken || !zone || !circle || !division) return;
    const reqId = ++reqIdRef.current;
    setBarChartLoading(true);

    // 🔹 Set context refs SYNCHRONOUSLY
    currentZoneRef.current = zone;
    currentCircleRef.current = circle;
    currentDivisionRef.current = division;

    fetchAlarmsCached(zone, circle, division)
      .then((raw) => {
        if (reqId !== reqIdRef.current || !Array.isArray(raw)) return;
        const data = raw
          .filter((i) => i.area && i.area !== "Unknown" && i.area !== "N/A")
          .map((i) => ({
            name: String(i.area).trim(),
            alarms: i.deviceAlert || 0,
            zone,
            circle,
            division,
          }));
        setCurrentLevel("areas");
        setBarChartItems(data);
        setBarChartTitle(`${division} – Areas Alarm Distribution`);
      })
      .catch(() => {})
      .finally(() => {
        if (reqId === reqIdRef.current) setBarChartLoading(false);
      });

    fetchDashboardCached(zone, circle, division, null)
      .then((d) => {
        if (reqId === reqIdRef.current) applyDashboard(d);
      })
      .catch(() => {});
  };

  const fetchDashboardForArea = (zone, circle, division, area) => {
    if (!userToken) return;
    const reqId = ++reqIdRef.current;
    setBarChartLoading(true);

    // 🔹 Set context refs SYNCHRONOUSLY
    currentZoneRef.current = zone;
    currentCircleRef.current = circle;
    currentDivisionRef.current = division;

    fetchDashboardCached(zone, circle, division, area)
      .then((d) => {
        if (reqId === reqIdRef.current) applyDashboard(d);
      })
      .catch(() => {})
      .finally(() => {
        if (reqId === reqIdRef.current) setBarChartLoading(false);
      });
  };

  /* =========================================================
     Drill-down handlers (bar chart → modal)
     ========================================================= */
  const handleBarPress = async (item) => {
    setDetailLoading(true);
    setDetailModalVisible(true);
    setDetailTableData([]);

    try {
      if (currentLevel === "zones") {
        setDetailModalTitle(`${item.name} – Circles`);
        setDetailCurrentLevel("circles");
        const raw = await fetchAlarmsCached(item.name, null, null);
        setDetailTableData(
          raw
            .filter((d) => d.circle && d.circle !== "Unknown" && d.circle !== "N/A")
            .map((d, i) => ({
              key: `circle-${i}`,
              name: d.circle,
              count: d.deviceAlert || 0,
              level: "circles",
              parentName: item.name,
              zone: item.name,          // 🔹 carry context
              circle: String(d.circle).trim(),
            }))
        );
      } else if (currentLevel === "circles") {
        setDetailModalTitle(`${item.name} – Divisions`);
        setDetailCurrentLevel("divisions");
        const zoneName = item.zone || currentZoneRef.current || selectedZone;
        const raw = await fetchAlarmsCached(zoneName, item.name, null);
        setDetailTableData(
          raw
            .filter((d) => d.division && d.division !== "Unknown" && d.division !== "N/A")
            .map((d, i) => ({
              key: `division-${i}`,
              name: d.division,
              count: d.deviceAlert || 0,
              level: "divisions",
              parentName: item.name,
              zone: zoneName,           // 🔹 carry context
              circle: item.name,        // 🔹 carry context
            }))
        );
      } else if (currentLevel === "divisions") {
        // 🔹 Areas — context comes from the tapped bar item itself
        setDetailModalTitle(`${item.name} – Areas`);
        setDetailCurrentLevel("areas");

        const zoneName = item.zone || currentZoneRef.current || selectedZone;
        const circleName = item.circle || currentCircleRef.current || selectedCircle;

        console.log("[handleBarPress] division tap:", {
          item: item.name,
          zoneName,
          circleName,
        });

        if (!zoneName || !circleName) {
          Alert.alert(
            "Missing Context",
            `Zone or Circle not set.\nzone="${zoneName}" circle="${circleName}"`
          );
          setDetailTableData([]);
          return;
        }

        const url =
          `${BASE_URL}/device-alarms` +
          `?zone=${encodeURIComponent(zoneName)}` +
          `&circle=${encodeURIComponent(circleName)}` +
          `&division=${encodeURIComponent(item.name)}`;

        console.log("[handleBarPress] fetching:", url);

        const res = await api.get(url);
        const raw = Array.isArray(res.data) ? res.data : [];

        console.log("[handleBarPress] areas returned:", raw.length);

        const rows = raw
          .filter((d) => d.area && d.area !== "Unknown" && d.area !== "N/A")
          .map((d, i) => ({
            key: `area-${i}`,
            name: String(d.area).trim(),
            count: d.deviceAlert || 0,
            level: "areas",
            parentName: item.name,
            zone: zoneName,
            circle: circleName,
            division: item.name,
          }));

        setDetailTableData(rows);
      } else {
        // Areas → Sites
        setDetailModalTitle(`${item.name} – Sites`);
        setDetailCurrentLevel("sites");
        const sites = siteList.filter((s) => s.area === item.name);
        setDetailTableData(
          sites.map((s, i) => ({
            key: `site-${i}`,
            name: s.siteId || "N/A",
            count: 0,
            level: "sites",
            parentName: item.name,
          }))
        );
      }
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        setDetailModalVisible(false);
        return;
      }
      console.error("[handleBarPress] error:", e);
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
        // 🔹 Use the row's own context first
        const zoneName = item.zone || currentZoneRef.current || selectedZone;
        const raw = await fetchAlarmsCached(zoneName, item.name, null);
        setDetailTableData(
          raw
            .filter((d) => d.division && d.division !== "Unknown" && d.division !== "N/A")
            .map((d, i) => ({
              key: `division-${i}`,
              name: d.division,
              count: d.deviceAlert || 0,
              level: "divisions",
              parentName: item.name,
              zone: zoneName,
              circle: item.name,
            }))
        );
      } catch {
        Alert.alert("Error", "Failed to load divisions");
      } finally {
        setDetailLoading(false);
      }
    } else if (item.level === "divisions") {
      // 🔹 Areas from a division row
      setDetailLoading(true);
      setDetailModalTitle(`${item.name} – Areas`);
      setDetailCurrentLevel("areas");
      try {
        const zoneName = item.zone || currentZoneRef.current || selectedZone;
        const circleName = item.circle || currentCircleRef.current || selectedCircle;

        if (!zoneName || !circleName) {
          Alert.alert("Error", "Zone or Circle not set");
          return;
        }

        const url =
          `${BASE_URL}/device-alarms` +
          `?zone=${encodeURIComponent(zoneName)}` +
          `&circle=${encodeURIComponent(circleName)}` +
          `&division=${encodeURIComponent(item.name)}`;

        const res = await api.get(url);
        const raw = Array.isArray(res.data) ? res.data : [];

        setDetailTableData(
          raw
            .filter((d) => d.area && d.area !== "Unknown" && d.area !== "N/A")
            .map((d, i) => ({
              key: `area-${i}`,
              name: String(d.area).trim(),
              count: d.deviceAlert || 0,
              level: "areas",
              parentName: item.name,
              zone: zoneName,
              circle: circleName,
              division: item.name,
            }))
        );
      } catch (e) {
        console.error("Failed to load areas:", e);
        Alert.alert("Error", "Failed to load areas");
      } finally {
        setDetailLoading(false);
      }
    } else if (item.level === "areas") {
      // 🔹 Sites
      setDetailLoading(true);
      setDetailModalTitle(`${item.name} – Sites`);
      setDetailCurrentLevel("sites");
      try {
        const sites = siteList.filter((s) => s.area === item.name);
        setDetailTableData(
          sites.map((s, i) => ({
            key: `site-${i}`,
            name: s.siteId || "N/A",
            count: 0,
            level: "sites",
            parentName: item.name,
          }))
        );
      } catch {
        Alert.alert("Error", "Failed to load sites");
      } finally {
        setDetailLoading(false);
      }
    }
  };

  /* ---------------- Refresh ---------------- */
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      clearCaches();
      if (selectedArea) {
        fetchDashboardForArea(selectedZone, selectedCircle, selectedDivision, selectedArea);
      } else if (selectedDivision) {
        fetchAllForDivision(selectedZone, selectedCircle, selectedDivision);
      } else if (selectedCircle) {
        fetchAllForCircle(selectedZone, selectedCircle);
      } else if (selectedZone) {
        fetchAllForZone(selectedZone);
      } else {
        fetchAllData();
      }
    } finally {
      setRefreshing(false);
    }
  };

  /* ---------------- Pie chart button → modal ---------------- */
  const handleCommPieChartClick = (status) => {
    setSelectedCommStatus(status);
    const wantCommunicating = status === "Communicating";

    const source = wantCommunicating ? siteList : pendingSiteList;

    let filtered = [...source];
    if (selectedArea) {
      filtered = filtered.filter((s) => s.area === selectedArea);
    } else if (selectedDivision) {
      filtered = filtered.filter(
        (s) => (s.division || s.subDivision) === selectedDivision
      );
    } else if (selectedCircle) {
      filtered = filtered.filter((s) => s.circle === selectedCircle);
    } else if (selectedZone) {
      filtered = filtered.filter((s) => s.zone === selectedZone);
    }

    const tableData = filtered.map((s, i) => ({
      siteId: s.siteId || "--",
      serialNumber: s.serialNumber || "--",
      area: s.area || "N/A",
      key: `comm-${wantCommunicating ? "y" : "n"}-${s.siteId}-${i}`,
    }));

    setCommTableData(tableData);
    setModalVisible(true);
  };

  /* =========================================================
     Context-reactive effect
     ========================================================= */
  useEffect(() => {
    if (!userToken) return;
    if (selectedArea && selectedDivision && selectedCircle && selectedZone) {
      fetchDashboardForArea(selectedZone, selectedCircle, selectedDivision, selectedArea);
    } else if (selectedDivision && selectedCircle && selectedZone) {
      fetchAllForDivision(selectedZone, selectedCircle, selectedDivision);
    } else if (selectedCircle && selectedZone) {
      fetchAllForCircle(selectedZone, selectedCircle);
    } else if (selectedZone) {
      fetchAllForZone(selectedZone);
    } else {
      fetchAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState, selectedZone, selectedCircle, selectedDivision, selectedArea, userToken]);

  /* ---------------- Renderers ---------------- */
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

  const getTableHeaderColor = (t) => {
    if (t === "Communicating") return { backgroundColor: "#4CAF50", color: "#fff" };
    if (t === "Non-Communicating") return { backgroundColor: "#F44336", color: "#fff" };
    return { backgroundColor: "#4CAF50", color: "#fff" };
  };

  const renderCircleStatus = () => (
    <View style={styles.circleStatusContainer}>
      <View style={styles.statusHeader}>
        <Ionicons name="stats-chart" size={18} color="#4CAF50" />
        <Text style={styles.statusTitle}> Status</Text>
      </View>
      <View style={styles.statusGrid}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Total Sites</Text>
          <Text style={styles.statusValue}>{dashboardSummary.totalSitesCount}</Text>
        </View>
        <View style={[styles.statusItem, styles.statusItemBorder]}>
          <Text style={styles.statusLabel}>Active Alarms</Text>
          <Text style={[styles.statusValue, styles.alarmValue]}>
            {dashboardSummary.alarmActiveSitesCount}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Uptime</Text>
          <Text style={[styles.statusValue, styles.uptimeValue]}>
            {dashboardSummary.upTime}%
          </Text>
        </View>
      </View>
      <View style={styles.metricsGrid}>
        <View style={styles.metricsItem}>
          <Ionicons name="battery-charging" size={20} color="#FF9800" />
          <Text style={styles.metricsLabel}>Boost</Text>
          <Text style={[styles.metricsValue, styles.boostValue]}>
            {dashboardSummary.boostCount}
          </Text>
        </View>
        <View style={[styles.metricsItem, styles.metricsItemBorder]}>
          <Ionicons name="battery-full" size={20} color="#2196F3" />
          <Text style={styles.metricsLabel}>Float</Text>
          <Text style={[styles.metricsValue, styles.floatValue]}>
            {dashboardSummary.floatCount}
          </Text>
        </View>
        <View style={[styles.metricsItem, styles.metricsItemBorder]}>
          <Ionicons name="flash" size={20} color="#9C27B0" />
          <Text style={styles.metricsLabel}>Float deviation</Text>
          <Text style={[styles.metricsValue, styles.floatVoltageValue]}>
            {dashboardSummary.floatDeviationCount}
          </Text>
        </View>
        <View style={styles.metricsItem}>
          <Ionicons name="thermometer" size={20} color="#E91E63" />
          <Text style={styles.metricsLabel}>Thermal Runway</Text>
          <Text style={[styles.metricsValue, styles.thermalRunawayValue]}>
            {dashboardSummary.thermalRunwayDeviationCount}
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
        <View style={styles.dashboardSection}>{renderCircleStatus()}</View>

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

        <View style={styles.pieChartContainer}>
          <Text style={styles.chartTitle}>Device Communication Status</Text>
          {pieChartData.length > 0 ? (
            <>
              <PieChart
                data={pieChartData}
                width={screenWidth - 40}
                height={100}
                chartConfig={{ color: (o = 1) => `rgba(0,0,0,${o})` }}
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
                  <Text style={styles.detailsButtonText}>
                    View Communicating Devices
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.detailsButton, styles.nonCommButton]}
                  onPress={() => handleCommPieChartClick("Non-Communicating")}
                >
                  <Text style={styles.detailsButtonText}>
                    View Non-Communicating
                  </Text>
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
      </ScrollView>

      {/* Modal 1 — Comm devices */}
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
                  <Text style={[styles.tableHeaderCell, { width: 100, color: getTableHeaderColor(selectedCommStatus).color }]}>
                    Site ID
                  </Text>
                  <Text style={[styles.tableHeaderCell, { width: 120, color: getTableHeaderColor(selectedCommStatus).color }]}>
                    Serial Number
                  </Text>
                  <Text style={[styles.tableHeaderCell, { width: 100, color: getTableHeaderColor(selectedCommStatus).color }]}>
                    Area
                  </Text>
                </View>
                <FlatList
                  data={commTableData}
                  renderItem={renderCommTableRow}
                  keyExtractor={(it) => it.key}
                  ListEmptyComponent={<Text style={styles.noResultsText}>No devices found</Text>}
                />
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal 2 — Detail drilldown */}
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
              <Text style={styles.detailLevelBadge}>
                {detailCurrentLevel || "Details"}
              </Text>
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
                  ListEmptyComponent={<Text style={styles.noResultsText}>No data found</Text>}
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
  metricsItem: { alignItems: "center", flex: 1, paddingHorizontal: 2 },
  metricsItemBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#e0e0e0" },
  metricsLabel: { fontSize: 8, color: "#666", marginTop: 2, textAlign: "center" },
  metricsValue: { fontSize: 14, fontWeight: "bold", marginTop: 2 },
  boostValue: { color: "#FF9800" },
  floatValue: { color: "#2196F3" },
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
  chartTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 6, textAlign: "center", color: "#333" },
  dataContainer: { marginTop: 6, width: "100%", flexDirection: "row", justifyContent: "space-between" },
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
  detailsButtonText: { color: "#fff", fontWeight: "bold", fontSize: 10, textAlign: "center" },
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
  modalTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12, textAlign: "center", color: "#333" },
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
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e0e0e0", paddingVertical: 8 },
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