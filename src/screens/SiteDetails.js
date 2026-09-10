// src/screens/SiteDetails.js
import React, { useState, useEffect, useContext } from 'react';
import { 
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import RNPickerSelect from 'react-native-picker-select';
import * as Location from 'expo-location';
import { AuthContext } from '../../AuthContext';

// CONFIG
const API_BASE = 'https://rbms.mahadiscom.in/mseb/api';
const API_URL = 'https://rbms.mahadiscom.in/mseb/api/postAddNewLocationToSiteId?siteId=VJMDBC0003';

const SITE_ID_MAX_LENGTH = 4;
const SERIAL_NUMBER_MAX_LENGTH = 4;

const SiteDetails = () => {
  const { userToken } = useContext(AuthContext);

  // Site Fields
  const [siteId, setSiteId] = useState('');
  const [number, setNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [substationId, setSubstationId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);

  const [state] = useState('Maharastra');
  const [zone, setZone] = useState(null);
  const [circle, setCircle] = useState(null);
  const [division, setDivision] = useState(null);
  const [area, setArea] = useState(null);

  const [showOtherZone, setShowOtherZone] = useState(false);
  const [showOtherCircle, setShowOtherCircle] = useState(false);
  const [showOtherDivision, setShowOtherDivision] = useState(false);
  const [showOtherArea, setShowOtherArea] = useState(false);

  const [otherZone, setOtherZone] = useState('');
  const [otherCircle, setOtherCircle] = useState('');
  const [otherDivision, setOtherDivision] = useState('');
  const [otherArea, setOtherArea] = useState('');

  // Dropdown Data
  const [zones, setZones] = useState([]);
  const [circles, setCircles] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [areas, setAreas] = useState([]);

  // Loading States
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingCircles, setLoadingCircles] = useState(false);
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Manufacturer Details (FULLY RESTORED)
  const [batterySerialNumber, setBatterySerialNumber] = useState('');
  const [manufacturerName, setManufacturerName] = useState('');
  const [kva, setKva] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  // Hardcoded values
  const batteryBankType = 'TUBULAR';
  const designVoltage = '30';
  const ahCapacity = '100';
  const individualCellVoltage = '2.0';
  const customerName = 'MAHAVITARAN';

  const defaultThresholds = {
    highVoltage: '2.4',
    lowVoltage: '1.9',
    batteryAboutToDie: '1.8',
    openBattery: '1.7',
    highTemperature: '40.0',
  };

  useEffect(() => { Icon.loadFont(); }, []);

  // Auto GPS
  useEffect(() => {
    (async () => {
      try {
        setLocationLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError(true);
          Alert.alert('Permission Denied', 'Location access required.');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLatitude(loc.coords.latitude.toFixed(6));
        setLongitude(loc.coords.longitude.toFixed(6));
      } catch (e) {
        setLocationError(true);
        Alert.alert('Location Failed', 'Will use manual entry.');
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  // Load Zones
  useEffect(() => {
    if (!userToken) return;
    setLoadingZones(true);
    axios.get(`${API_BASE}/zones?state=Maharastra`, {
      headers: { Authorization: `Bearer ${userToken}` }
    }).then(res => {
      const items = (res.data || []).map(item => ({
        label: typeof item === 'string' ? item : item.name || String(item),
        value: typeof item === 'string' ? item : item.name || String(item)
      }));
      items.push({ label: 'Other', value: 'other' });
      setZones(items);
    }).catch(() => setZones([{ label: 'Other', value: 'other' }]))
      .finally(() => setLoadingZones(false));
  }, [userToken]);

  // Load Circles
  useEffect(() => {
    if (!zone || zone === 'other' || showOtherZone) {
      setCircles([{ label: 'Other', value: 'other' }]);
      setCircle(null); setDivision(null); setArea(null);
      return;
    }
    setLoadingCircles(true);
    axios.get(`${API_BASE}/circles?zone=${zone}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    }).then(res => {
      const items = (res.data || []).map(item => ({
        label: typeof item === 'string' ? item : item.name || String(item),
        value: typeof item === 'string' ? item : item.name || String(item)
      }));
      items.push({ label: 'Other', value: 'other' });
      setCircles(items);
    }).catch(() => setCircles([{ label: 'Other', value: 'other' }]))
      .finally(() => setLoadingCircles(false));
  }, [zone, showOtherZone, userToken]);

  // Load Divisions
  useEffect(() => {
    if (!circle || circle === 'other' || showOtherCircle) {
      setDivisions([{ label: 'Other', value: 'other' }]);
      setDivision(null); setArea(null);
      return;
    }
    setLoadingDivisions(true);
    axios.get(`${API_BASE}/divisions?circle=${circle}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    }).then(res => {
      const items = (res.data || []).map(div => ({
        label: div.name,
        value: div.name
      }));
      items.push({ label: 'Other', value: 'other' });
      setDivisions(items);
    }).catch(() => setDivisions([{ label: 'Other', value: 'other' }]))
      .finally(() => setLoadingDivisions(false));
  }, [circle, showOtherCircle, userToken]);

  // Load Areas
  useEffect(() => {
    const finalDivision = showOtherDivision ? otherDivision.trim() : division;
    if (!finalDivision || finalDivision === 'other') {
      setAreas([{ label: 'Other', value: 'other' }]);
      setArea(null);
      return;
    }
    setLoadingAreas(true);
    axios.get(`${API_BASE}/areas?division=${finalDivision}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    }).then(res => {
      const items = (res.data || []).map(a => ({
        label: typeof a === 'string' ? a : a.name || String(a),
        value: typeof a === 'string' ? a : a.name || String(a)
      }));
      items.push({ label: 'Other', value: 'other' });
      setAreas(items);
    }).catch(() => setAreas([{ label: 'Other', value: 'other' }]))
      .finally(() => setLoadingAreas(false));
  }, [division, showOtherDivision, userToken]);

  const handleUppercaseInput = (text, setter, max = null) => {
    let val = text.toUpperCase();
    if (max && val.length > max) val = val.substring(0, max);
    setter(val);
  };

   const  handleSiteId = (text, setter, max = null) => {
    let value= 'VJMDBC'+text;
    setSiteId(text);
    // Convert to uppercase and update the state
    setter(value);
  };
  const handleSerialNuber = (text, setter, max = null) => {
   
    let value='VJMDBMC25'+text;
    setNumber(text);
    // Convert to uppercase and update the state
    setter(value);
  }

  const getCurrentDate = () => new Date().toISOString().split('T')[0];

  const validateAndSubmit = () => {
    const finalZone = showOtherZone ? otherZone.trim() : zone;
    const finalCircle = showOtherCircle ? otherCircle.trim() : circle;
    const finalDivision = showOtherDivision ? otherDivision.trim() : division;
    const finalArea = showOtherArea ? otherArea.trim() : area;

    const required = {
      'Substation ID': substationId.trim(),
      'Serial Number': serialNumber.trim(),
      'Zone': finalZone,
      'Circle': finalCircle,
      'Division': finalDivision, 
      'Area': finalArea,
      'Battery Serial Number': batterySerialNumber.trim(),
      'Manufacturer Name': manufacturerName.trim(),
      'KVA': kva.trim(),
      'Mobile Number': mobileNumber.trim(),
    };

    const missing = Object.entries(required).filter(([_, v]) => !v).map(([k]) => k);
    if (missing.length > 0) {
      Alert.alert('Missing Fields', '• ' + missing.join('\n• '));
      return;
    }

    if (siteId.length !== SITE_ID_MAX_LENGTH) {
      Alert.alert('Invalid', `Substation ID must be exactly ${SITE_ID_MAX_LENGTH} characters`);
      return;
    }
    if (number.length !== SERIAL_NUMBER_MAX_LENGTH) {
      Alert.alert('Invalid', `Serial Number must be exactly ${SERIAL_NUMBER_MAX_LENGTH} characters`);
      return;
    }

    submit(finalZone, finalCircle, finalDivision, finalArea);
  };

  const submit = async (z, c, d, a) => {
    if (!userToken) return Alert.alert('Error', 'Not logged in');

    setSubmitting(true);
    try {
      const payload = {
        state,
        zone: z,
        circle: c,
        division: d,
        area: a,
        latitude: Number(latitude),
        longitude: Number(longitude),
        vendorName: customerName,
        batteryAHCapacity: ahCapacity,
        siteId: substationId,
        manufacturerDTO: {
          firstUsedDate: getCurrentDate(),
          batterySerialNumber,
          batteryBankType,
          ahCapacity,
          manufacturerName,
          individualCellVoltage,
          designVoltage,
          highVoltage: defaultThresholds.highVoltage,
          lowVoltage: defaultThresholds.lowVoltage,
          batteryAboutToDie: defaultThresholds.batteryAboutToDie,
          openBattery: defaultThresholds.openBattery,
          highTemperature: defaultThresholds.highTemperature,
          serialNumber,
          kva,
          mobileNumber,
        },
      };

      await axios.post(API_URL, payload, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      Alert.alert('Success', 'Site added successfully!', [
        { text: 'OK', onPress: resetForm }
      ]);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Submission failed';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubstationId(''); setSerialNumber(''); setBatterySerialNumber('');
    setManufacturerName(''); setKva(''); setMobileNumber('');
    setZone(null); setCircle(null); setDivision(null); setArea(null);
    setOtherZone(''); setOtherCircle(''); setOtherDivision(''); setOtherArea('');
    setShowOtherZone(false); setShowOtherCircle(false);
    setShowOtherDivision(false); setShowOtherArea(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.mainTitle}>Add New Site</Text>

        <Section title="Site Location">
          <Input label={`Substation ID (${SITE_ID_MAX_LENGTH} chars)`}
            value={siteId}
            onChangeText={t => handleSiteId(t, setSubstationId, SITE_ID_MAX_LENGTH)}
            placeholder="Enter exactly 4 characters"
            maxLength={SITE_ID_MAX_LENGTH}
            characterCount={substationId.length}
            maxCharacterCount={SITE_ID_MAX_LENGTH}
          />
          <Input label={`Serial Number (${SERIAL_NUMBER_MAX_LENGTH} chars)`}
            value={number}
            onChangeText={t => handleSerialNuber(t, setSerialNumber, SERIAL_NUMBER_MAX_LENGTH)}  
            placeholder="Enter exactly 4 characters"
            maxLength={SERIAL_NUMBER_MAX_LENGTH}
            characterCount={serialNumber.length} 
            maxCharacterCount={SERIAL_NUMBER_MAX_LENGTH} 
          />

          {/* State */}
          <View style={styles.inputWrap}>
            <Text style={styles.label}>State</Text>
            <RNPickerSelect
              value={state}
              items={[{ label: 'Maharastra', value: 'Maharastra' }]}
              onValueChange={() => {}}   // Fixed required prop
              disabled={true}
              style={pickerSelectStyles}
            />
          </View>

          {/* Zone */}
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Zone</Text>
            {loadingZones ? <ActivityIndicator /> : (
              <>
                <RNPickerSelect
                  placeholder={{ label: 'Select Zone', value: null }}
                  value={showOtherZone ? 'other' : zone}
                  items={zones}
                  onValueChange={v => {
                    if (v === 'other') { setShowOtherZone(true); setZone(null); }
                    else { setShowOtherZone(false); setZone(v); }
                    setCircle(null); setDivision(null); setArea(null);
                  }}
                  style={pickerSelectStyles}
                />
                {showOtherZone && <TextInput style={styles.input} value={otherZone} onChangeText={setOtherZone} placeholder="Enter Zone" />}
              </>
            )}
          </View>

          {/* Circle */}
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Circle</Text>
            {loadingCircles ? <ActivityIndicator /> : (
              <>
                <RNPickerSelect
                  placeholder={{ label: 'Select Circle', value: null }}
                  value={showOtherCircle ? 'other' : circle}
                  items={circles}
                  onValueChange={v => {
                    if (v === 'other') { setShowOtherCircle(true); setCircle(null); }
                    else { setShowOtherCircle(false); setCircle(v); }
                    setDivision(null); setArea(null);
                  }}
                  style={pickerSelectStyles}
                />
                {showOtherCircle && <TextInput style={styles.input} value={otherCircle} onChangeText={setOtherCircle} placeholder="Enter Circle" />}
              </>
            )}
          </View>

          {/* Division */}
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Division</Text>
            {loadingDivisions ? <ActivityIndicator /> : (
              <>
                <RNPickerSelect
                  placeholder={{ label: 'Select Division', value: null }}
                  value={showOtherDivision ? 'other' : division}
                  items={divisions}
                  onValueChange={v => {
                    if (v === 'other') { setShowOtherDivision(true); setDivision(null); }
                    else { setShowOtherDivision(false); setDivision(v); }
                    setArea(null);
                  }}
                  style={pickerSelectStyles}
                />
                {showOtherDivision && <TextInput style={styles.input} value={otherDivision} onChangeText={setOtherDivision} placeholder="Enter Division" />}
              </>
            )}
          </View>

          {/* Area */}
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Area</Text>
            {loadingAreas ? <ActivityIndicator /> : (
              <>
                <RNPickerSelect
                  placeholder={{ label: 'Select Area', value: null }}
                  value={showOtherArea ? 'other' : area}
                  items={areas}
                  onValueChange={v => {
                    if (v === 'other') { setShowOtherArea(true); setArea(null); }
                    else { setShowOtherArea(false); setArea(v); }
                  }}
                  style={pickerSelectStyles}
                />
                {showOtherArea && <TextInput style={styles.input} value={otherArea} onChangeText={t => handleUppercaseInput(t, setOtherArea)} placeholder="Enter Area (CAPS)" autoCapitalize="characters" />}
              </>
            )}
          </View>

          {/* GPS */}
          <View style={styles.coordinatesContainer}>
            <View style={styles.coordinateRow}>
              <View style={styles.coordinateItem}>
                <Text style={styles.label}>Latitude</Text>
                {locationLoading ? <ActivityIndicator /> : <TextInput style={[styles.input, locationError && styles.errorInput]} value={latitude} editable={false} />}
              </View>
              <View style={styles.coordinateItem}>
                <Text style={styles.label}>Longitude</Text>
                {locationLoading ? <ActivityIndicator /> : <TextInput style={[styles.input, locationError && styles.errorInput]} value={longitude} editable={false} />}
              </View>
            </View>
          </View>
        </Section>

        {/* Manufacturer Details - FULLY RESTORED */}
        <Section title="Manufacturer Details">
          <Input 
            label="Battery Serial Number" 
            value={batterySerialNumber} 
            onChangeText={(text) => handleUppercaseInput(text, setBatterySerialNumber)}
            placeholder="Enter in capital letters"   
            autoCapitalize="characters"
          />
          <Input 
            label="Manufacturer Name" 
            value={manufacturerName} 
            onChangeText={(text) => handleUppercaseInput(text, setManufacturerName)}
            placeholder="Enter in capital letters"   
            autoCapitalize="characters"
          />
          <Input 
            label="KVA" 
            value={kva} 
            onChangeText={setKva} 
            placeholder="Enter KVA" 
          />
          <Input 
            label="Mobile Number" 
            value={mobileNumber} 
            onChangeText={setMobileNumber} 
            keyboardType="phone-pad" 
            placeholder="Enter mobile number"
          />
        </Section>

        <TouchableOpacity 
          style={[styles.button, submitting && styles.buttonDisabled]} 
          onPress={validateAndSubmit}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? 'Adding Site...' : 'Add Site'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Reusable Components
const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Input = ({ label, value, onChangeText, placeholder, keyboardType = 'default', maxLength, characterCount, maxCharacterCount }) => (
  <View style={styles.inputWrap}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      autoCapitalize="characters"
      maxLength={maxLength}
    />
    {maxCharacterCount !== undefined && (
      <Text style={[styles.characterCount, characterCount === maxCharacterCount && styles.characterCountValid]}>
        {characterCount}/{maxCharacterCount}
      </Text>
    )}
  </View>
);

const pickerSelectStyles = StyleSheet.create({
  inputIOS: { fontSize: 15, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', marginTop: 8 },
  inputAndroid: { fontSize: 15, padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', marginTop: 8 },
});

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  mainTitle: { fontSize: 22, fontWeight: 'bold', color: '#003844', textAlign: 'center', marginBottom: 24 },
  section: { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 10, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#003844', marginBottom: 12 },
  inputWrap: { marginBottom: 12 },
  label: { fontSize: 14, color: '#333', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, backgroundColor: '#fff', fontSize: 15, marginTop: 8 },
  errorInput: { borderColor: 'red' },
  button: { backgroundColor: '#003844', paddingVertical: 16, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFF700', fontSize: 17, fontWeight: 'bold' },
  coordinatesContainer: { marginTop: 16 },
  coordinateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  coordinateItem: { flex: 0.48 },
  characterCount: { fontSize: 12, marginTop: 4, textAlign: 'right', color: '#666' },
  characterCountValid: { color: '#4CAF50', fontWeight: 'bold' },
});

export default SiteDetails;