// src/components/SelectionBar.js
import React, { useEffect, useCallback, useContext, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { Ionicons } from '@expo/vector-icons';
import api from '../Api';
import { AuthContext } from '../../AuthContext';
import { useSelection } from '../../SelectionContext';

const BASE_URL = 'https://rbms.mahadiscom.in/mseb';

export default function SelectionBar({ onSelectionChange }) {
  const { userToken } = useContext(AuthContext);

  const {
    selectedState, setSelectedState,
    selectedZone, setSelectedZone,
    selectedCircle, setSelectedCircle,
    selectedDivision, setSelectedDivision,
    selectedArea, setSelectedArea,
    // 🔹 lists now live in context
    statesList, setStatesList,
    zonesList, setZonesList,
    circlesList, setCirclesList,
    divisionsList, setDivisionsList,
    areasList, setAreasList,
    resetBelowState, resetBelowZone, resetBelowCircle, resetBelowDivision,
    clearAll,
    lockedState, lockedZone, lockedCircle, lockedDivision, lockedArea,
  } = useSelection();

  const [loading, setLoading] = useState(false);

  const lastFetched = useRef({
    state: null, zone: null, circle: null, division: null,
  });

  const notify = useCallback(
    (values) => {
      if (typeof onSelectionChange === 'function') onSelectionChange(values);
    },
    [onSelectionChange]
  );

  /* ---------- Fetchers ---------- */
  const fetchStates = useCallback(async () => {
    if (!userToken) return [];
    try {
      const res = await api.get(`${BASE_URL}/api/states`);
      const arr = Array.isArray(res.data) ? res.data : [];
      return arr.map((it) => it.name).filter(Boolean);
    } catch { return []; }
  }, [userToken]);

  const fetchZones = useCallback(async (state) => {
    if (!userToken || !state) return [];
    try {
      const res = await api.get(`${BASE_URL}/getUserZones?stateName=${encodeURIComponent(state)}`);
      return Array.isArray(res.data) ? res.data.filter(Boolean) : [];
    } catch { return []; }
  }, [userToken]);

  const fetchCircles = useCallback(async (zone) => {
    if (!userToken || !zone) return [];
    try {
      const res = await api.get(`${BASE_URL}/getUserCircles?zoneName=${encodeURIComponent(zone)}`);
      return Array.isArray(res.data) ? res.data.filter(Boolean) : [];
    } catch { return []; }
  }, [userToken]);

  const fetchDivisions = useCallback(async (circle) => {
    if (!userToken || !circle) return [];
    try {
      const res = await api.get(`${BASE_URL}/getUserDivisions?circleName=${encodeURIComponent(circle)}`);
      return Array.isArray(res.data) ? res.data.filter(Boolean) : [];
    } catch { return []; }
  }, [userToken]);

  const fetchAreas = useCallback(async (division) => {
    if (!userToken || !division) return [];
    try {
      const res = await api.get(`${BASE_URL}/getUserAreas?divisionName=${encodeURIComponent(division)}`);
      return Array.isArray(res.data) ? res.data.filter(Boolean) : [];
    } catch { return []; }
  }, [userToken]);

  /* ---------- Load states once ---------- */
  useEffect(() => {
    if (!userToken) return;
    if (statesList.length > 0) return;   // 🔹 already loaded — skip
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const list = await fetchStates();
      if (cancelled) return;
      const merged = selectedState && !list.includes(selectedState)
        ? [...list, selectedState] : list;
      setStatesList(merged);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [userToken, statesList.length, selectedState, fetchStates, setStatesList]);

  /* ---------- Zones ---------- */
  useEffect(() => {
    if (!selectedState) { setZonesList([]); lastFetched.current.state = null; return; }
    if (lastFetched.current.state === selectedState && zonesList.length > 0) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const list = await fetchZones(selectedState);
      if (cancelled) return;
      lastFetched.current.state = selectedState;
      const merged = selectedZone && !list.includes(selectedZone) ? [...list, selectedZone] : list;
      setZonesList(merged);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState, userToken]);

  /* ---------- Circles ---------- */
  useEffect(() => {
    if (!selectedZone) { setCirclesList([]); lastFetched.current.zone = null; return; }
    if (lastFetched.current.zone === selectedZone && circlesList.length > 0) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const list = await fetchCircles(selectedZone);
      if (cancelled) return;
      lastFetched.current.zone = selectedZone;
      const merged = selectedCircle && !list.includes(selectedCircle) ? [...list, selectedCircle] : list;
      setCirclesList(merged);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZone, userToken]);

  /* ---------- Divisions ---------- */
  useEffect(() => {
    if (!selectedCircle) { setDivisionsList([]); lastFetched.current.circle = null; return; }
    if (lastFetched.current.circle === selectedCircle && divisionsList.length > 0) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const list = await fetchDivisions(selectedCircle);
      if (cancelled) return;
      lastFetched.current.circle = selectedCircle;
      const merged = selectedDivision && !list.includes(selectedDivision) ? [...list, selectedDivision] : list;
      setDivisionsList(merged);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCircle, userToken]);

  /* ---------- Areas ---------- */
  useEffect(() => {
    if (!selectedDivision) { setAreasList([]); lastFetched.current.division = null; return; }
    if (lastFetched.current.division === selectedDivision && areasList.length > 0) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const list = await fetchAreas(selectedDivision);
      if (cancelled) return;
      lastFetched.current.division = selectedDivision;
      const merged = selectedArea && !list.includes(selectedArea) ? [...list, selectedArea] : list;
      setAreasList(merged);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDivision, userToken]);

  /* ---------- Handlers ---------- */
  const handleState = (state) => {
    if (lockedState) return;
    setSelectedState(state);
    resetBelowState();
    notify({ state, zone: null, circle: null, division: null, area: null });
  };
  const handleZone = (zone) => {
    if (lockedZone) return;
    setSelectedZone(zone);
    resetBelowZone();
    notify({ state: selectedState, zone, circle: null, division: null, area: null });
  };
  const handleCircle = (circle) => {
    if (lockedCircle) return;
    setSelectedCircle(circle);
    resetBelowCircle();
    notify({ state: selectedState, zone: selectedZone, circle, division: null, area: null });
  };
  const handleDivision = (division) => {
    if (lockedDivision) return;
    setSelectedDivision(division);
    resetBelowDivision();
    notify({ state: selectedState, zone: selectedZone, circle: selectedCircle, division, area: null });
  };
  const handleArea = (area) => {
    if (lockedArea) return;
    setSelectedArea(area);
    notify({ state: selectedState, zone: selectedZone, circle: selectedCircle, division: selectedDivision, area });
  };
  const handleClear = () => {
    if (lockedState || lockedZone || lockedCircle || lockedDivision || lockedArea) return;
    clearAll();
    notify({ state: selectedState, zone: null, circle: null, division: null, area: null });
  };

  const anyLocked = lockedState || lockedZone || lockedCircle || lockedDivision || lockedArea;
  const showClear = !anyLocked && (selectedZone || selectedCircle || selectedDivision || selectedArea);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.pickerWrap}>
          <RNPickerSelect
            onValueChange={handleState}
            items={statesList.map((s, i) => ({ label: s, value: s, key: `state-${i}` }))}
            placeholder={{ label: 'State', value: null }}
            style={pickerStyles}
            value={selectedState}
            useNativeAndroidPickerStyle={false}
            fixAndroidTouchableBug
            disabled={!!lockedState}
          />
        </View>
        <View style={styles.pickerWrap}>
          <RNPickerSelect
            onValueChange={handleZone}
            items={zonesList.map((z, i) => ({ label: z, value: z, key: `zone-${i}` }))}
            placeholder={{ label: 'Zone', value: null }}
            style={pickerStyles}
            disabled={!selectedState || !!lockedZone}
            value={selectedZone}
            useNativeAndroidPickerStyle={false}
            fixAndroidTouchableBug
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.pickerWrap}>
          <RNPickerSelect
            onValueChange={handleCircle}
            items={circlesList.map((c, i) => ({ label: c, value: c, key: `circle-${i}` }))}
            placeholder={{ label: 'Circle', value: null }}
            style={pickerStyles}
            disabled={!selectedZone || !!lockedCircle}
            value={selectedCircle}
            useNativeAndroidPickerStyle={false}
            fixAndroidTouchableBug
          />
        </View>
        <View style={styles.pickerWrap}>
          <RNPickerSelect
            onValueChange={handleDivision}
            items={divisionsList.map((d, i) => ({ label: d, value: d, key: `division-${i}` }))}
            placeholder={{ label: 'Division', value: null }}
            style={pickerStyles}
            disabled={!selectedCircle || !!lockedDivision}
            value={selectedDivision}
            useNativeAndroidPickerStyle={false}
            fixAndroidTouchableBug
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.pickerWrap, { flex: 1 }]}>
          <RNPickerSelect
            onValueChange={handleArea}
            items={areasList.map((a, i) => ({ label: a, value: a, key: `area-${i}` }))}
            placeholder={{ label: 'Area', value: null }}
            style={pickerStyles}
            disabled={!selectedDivision || areasList.length === 0 || !!lockedArea}
            value={selectedArea}
            useNativeAndroidPickerStyle={false}
            fixAndroidTouchableBug
          />
        </View>

        {showClear && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={handleClear}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="close-circle" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 8, paddingTop: 6, paddingBottom: 6, backgroundColor: '#003844' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  pickerWrap: { flex: 1, marginRight: 4, height: 30 },
  clearBtn: {
    backgroundColor: '#f44336',
    padding: 5,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
    marginLeft: 4,
  },
});

const pickerStyles = {
  inputIOS: {
    paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#f9f9f9',
    borderRadius: 4, borderWidth: 1, borderColor: '#4CAF50', fontSize: 11,
    color: '#333', height: 30, width: '100%', textAlign: 'left',
  },
  inputAndroid: {
    paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#f9f9f9',
    borderRadius: 4, borderWidth: 1, borderColor: '#4CAF50', fontSize: 11,
    color: '#333', height: 30, width: '100%', textAlign: 'left',
  },
};