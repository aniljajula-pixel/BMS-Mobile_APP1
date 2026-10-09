// src/components/LocationSetupDialog.js
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import api from '../Api';

export default function LocationSetupDialog({ visible, token, onComplete }) {
  const [states, setStates] = useState([]);
  const [zones, setZones] = useState([]);
  const [circles, setCircles] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [areas, setAreas] = useState([]);

  const [stateId, setStateId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [circleId, setCircleId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [areaId, setAreaId] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openPicker, setOpenPicker] = useState(null);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Normalize any list shape to [{id, name}]
  const normalize = (data) => {
    if (!Array.isArray(data)) return [];
    if (data.length > 0 && typeof data[0] === 'string') {
      return data.map((name) => ({ id: name, name }));
    }
    return data.map((item, idx) => ({
      id:
        item.id ??
        item.stateId ??
        item.zoneId ??
        item.circleId ??
        item.divisionId ??
        item.areaId ??
        item.name ??
        String(idx),
      name:
        item.name ??
        item.stateName ??
        item.zoneName ??
        item.circleName ??
        item.divisionName ??
        item.areaName ??
        String(item),
    }));
  };

  // Reset + load states each time dialog opens
  useEffect(() => {
    if (!visible) return;
    setError('');
    setStateId(''); setZoneId(''); setCircleId(''); setDivisionId(''); setAreaId('');
    setZones([]); setCircles([]); setDivisions([]); setAreas([]);

    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/states', { headers: authHeaders });
        setStates(normalize(res.data));
      } catch (e) {
        console.error('Load states failed', e?.response?.data || e.message);
        setError('Failed to load states. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, token]);

  const loadZones = async (stateName) => {
    setZones([]); setCircles([]); setDivisions([]); setAreas([]);
    setZoneId(''); setCircleId(''); setDivisionId(''); setAreaId('');
    if (!stateName) return;
    try {
      let res;
      try {
        res = await api.get('/api/zones', { params: { state: stateName }, headers: authHeaders });
      } catch {
        res = await api.get('/api/getAllZones', { params: { state: stateName }, headers: authHeaders });
      }
      setZones(normalize(res.data));
    } catch (e) {
      console.error('Load zones failed', e?.response?.data || e.message);
    }
  };

  const loadCircles = async (zoneName) => {
    setCircles([]); setDivisions([]); setAreas([]);
    setCircleId(''); setDivisionId(''); setAreaId('');
    if (!zoneName) return;
    try {
      let res;
      try {
        res = await api.get('/api/circles', { params: { zone: zoneName }, headers: authHeaders });
      } catch {
        res = await api.get('/api/getAllCircles', { params: { zone: zoneName }, headers: authHeaders });
      }
      setCircles(normalize(res.data));
    } catch (e) {
      console.error('Load circles failed', e?.response?.data || e.message);
    }
  };

  const loadDivisions = async (circleName) => {
    setDivisions([]); setAreas([]);
    setDivisionId(''); setAreaId('');
    if (!circleName) return;
    try {
      let res;
      try {
        res = await api.get('/api/divisions', { params: { circle: circleName }, headers: authHeaders });
      } catch {
        res = await api.get('/api/getAllDivisions', { params: { circle: circleName }, headers: authHeaders });
      }
      setDivisions(normalize(res.data));
    } catch (e) {
      console.error('Load divisions failed', e?.response?.data || e.message);
    }
  };

  const loadAreas = async (divisionName) => {
    setAreas([]); setAreaId('');
    if (!divisionName) return;
    try {
      let res;
      try {
        res = await api.get('/api/areas', { params: { division: divisionName }, headers: authHeaders });
      } catch {
        res = await api.get('/api/getAreaNames', { params: { division: divisionName }, headers: authHeaders });
      }
      setAreas(normalize(res.data));
    } catch (e) {
      console.error('Load areas failed', e?.response?.data || e.message);
    }
  };

  const clearBelow = (level) => {
    if (level === 'zone') {
      setZoneId(''); setCircleId(''); setDivisionId(''); setAreaId('');
      setCircles([]); setDivisions([]); setAreas([]);
    } else if (level === 'circle') {
      setCircleId(''); setDivisionId(''); setAreaId('');
      setDivisions([]); setAreas([]);
    } else if (level === 'division') {
      setDivisionId(''); setAreaId('');
      setAreas([]);
    } else if (level === 'area') {
      setAreaId('');
    }
    setOpenPicker(null);
  };

  const onSelectState = (item) => { setStateId(item.id); setOpenPicker(null); loadZones(item.name); };
  const onSelectZone = (item) => { setZoneId(item.id); setOpenPicker(null); loadCircles(item.name); };
  const onSelectCircle = (item) => { setCircleId(item.id); setOpenPicker(null); loadDivisions(item.name); };
  const onSelectDivision = (item) => { setDivisionId(item.id); setOpenPicker(null); loadAreas(item.name); };
  const onSelectArea = (item) => { setAreaId(item.id); setOpenPicker(null); };

  // Convert id to number if numeric, else keep string. Empty → 0 (matches your backend's Long expectation)
  const toLong = (v) => {
    if (v === '' || v == null) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const handleSave = async () => {
    if (!stateId) {
      setError('Please select at least a State.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        stateId: toLong(stateId),
        zoneId: toLong(zoneId),
        circleId: toLong(circleId),
        divisionId: toLong(divisionId),
        areaId: toLong(areaId),
      };

      console.log('POST /api/user/location-access body:', body);

      const res = await api.post('/api/user/location-access', body, {
        headers: { 'Content-Type': 'application/json', ...authHeaders },
      });

      console.log('location-access response:', res.data);

      const newJwt = res.data?.jwt;
      const needsSetup = res.data?.needsLocationSetup;

      if (!newJwt) {
        setError('Server did not return a new token. Please try again.');
        return;
      }
      if (needsSetup === true) {
        setError('Location was not saved correctly. Please try again.');
        return;
      }

      onComplete?.(newJwt);
    } catch (e) {
      console.error('Save location failed', e?.response?.data || e.message);
      setError(
        e?.response?.data?.message ||
          e.message ||
          'Failed to save location. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const pickerConfig = {
    state:    { title: 'Select State *',  items: states,    onSelect: onSelectState,    showEmpty: false },
    zone:     { title: 'Select Zone',     items: zones,     onSelect: onSelectZone,     showEmpty: true, emptyLabel: 'Full access under State' },
    circle:   { title: 'Select Circle',   items: circles,   onSelect: onSelectCircle,   showEmpty: true, emptyLabel: 'Full access under Zone' },
    division: { title: 'Select Division', items: divisions, onSelect: onSelectDivision, showEmpty: true, emptyLabel: 'Full access under Circle' },
    area:     { title: 'Select Area',     items: areas,     onSelect: onSelectArea,     showEmpty: true, emptyLabel: 'Full access under Division' },
  };
  const currentPicker = openPicker ? pickerConfig[openPicker] : null;

  const nameOf = (list, id) => list.find((x) => String(x.id) === String(id))?.name || '';

  const renderDropdown = (label, value, list, onOpen, enabled, placeholder) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.dropdown, !enabled && styles.dropdownDisabled]}
        onPress={() => enabled && onOpen()}
        disabled={!enabled}
      >
        <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
          {value ? nameOf(list, value) : placeholder}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Select Your Location Access</Text>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={styles.helper}>
              This is required for first-time login. Choose the highest level you
              manage. Leave lower levels empty for full access under that level.
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#d82b27" />
              </View>
            ) : (
              <>
                {renderDropdown('State *', stateId, states, () => setOpenPicker('state'), true, 'Select State')}
                {renderDropdown('Zone (optional)', zoneId, zones, () => setOpenPicker('zone'), !!stateId, 'Full access under State')}
                {renderDropdown('Circle (optional)', circleId, circles, () => setOpenPicker('circle'), !!zoneId, 'Full access under Zone')}
                {renderDropdown('Division (optional)', divisionId, divisions, () => setOpenPicker('division'), !!circleId, 'Full access under Circle')}
                {renderDropdown('Area (optional)', areaId, areas, () => setOpenPicker('area'), !!divisionId, 'Full access under Division')}
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, (saving || !stateId || loading) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving || !stateId || loading}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save & Continue</Text>}
            </TouchableOpacity>
          </View>

          {currentPicker && (
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerBox}>
                <Text style={styles.pickerTitle}>{currentPicker.title}</Text>
                <ScrollView style={{ maxHeight: 320 }}>
                  {currentPicker.showEmpty && (
                    <TouchableOpacity
                      style={styles.pickerItem}
                      onPress={() => clearBelow(openPicker)}
                    >
                      <Text style={[styles.pickerItemText, { fontStyle: 'italic', color: '#888' }]}>
                        {currentPicker.emptyLabel}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {currentPicker.items.map((item, idx) => (
                    <TouchableOpacity
                      key={String(item.id) + idx}
                      style={styles.pickerItem}
                      onPress={() => currentPicker.onSelect(item)}
                    >
                      <Text style={styles.pickerItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {currentPicker.items.length === 0 && !currentPicker.showEmpty && (
                    <Text style={styles.emptyPicker}>No items available</Text>
                  )}
                </ScrollView>
                <TouchableOpacity style={styles.pickerCancel} onPress={() => setOpenPicker(null)}>
                  <Text style={styles.pickerCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  dialog: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: { backgroundColor: '#d82b27', paddingVertical: 14, paddingHorizontal: 16 },
  headerText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  body: { paddingHorizontal: 16, paddingTop: 14 },
  helper: { fontSize: 13, color: '#666', marginBottom: 14 },
  errorBox: {
    backgroundColor: '#fdecea', borderColor: '#f5c6cb', borderWidth: 1,
    borderRadius: 6, padding: 10, marginBottom: 12,
  },
  errorText: { color: '#b71c1c', fontSize: 13 },
  loadingBox: { paddingVertical: 40, alignItems: 'center' },

  fieldWrap: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, color: '#555', marginBottom: 4, fontWeight: '600' },
  dropdown: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fafafa',
  },
  dropdownDisabled: { backgroundColor: '#f0f0f0', opacity: 0.7 },
  dropdownText: { fontSize: 14, color: '#222' },
  placeholderText: { color: '#999' },
  chevron: { fontSize: 12, color: '#666' },

  footer: { padding: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  saveBtn: { backgroundColor: '#d82b27', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  pickerBox: { width: '100%', backgroundColor: '#fff', borderRadius: 10, padding: 12, maxHeight: '80%' },
  pickerTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8, color: '#d82b27' },
  pickerItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  pickerItemText: { fontSize: 15, color: '#222' },
  emptyPicker: { textAlign: 'center', padding: 16, color: '#999' },
  pickerCancel: { marginTop: 8, paddingVertical: 10, alignItems: 'center' },
  pickerCancelText: { color: '#d82b27', fontWeight: '600' },
});