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
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import RNPickerSelect from 'react-native-picker-select';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../AuthContext';

// ================== CONFIG — LOCAL SERVER ONLY ==================
const SERVER_BASE = 'https://rbms.mahadiscom.in/mseb';
const API_BASE = `${SERVER_BASE}/api`;
const API_URL = `${SERVER_BASE}/api/postAddNewLocationToSiteId?siteId=VJMDBC0003`;
const UPLOAD_API_BASE = `${SERVER_BASE}/api`;

const SITE_ID_MAX_LENGTH = 4;
const SERIAL_NUMBER_MAX_LENGTH = 4;

// ================== COMPONENT ==================
const SiteDetails = () => {
  const { userToken } = useContext(AuthContext);

  // ----- Site Fields -----
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

  // ----- Dropdown Data -----
  const [zones, setZones] = useState([]);
  const [circles, setCircles] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [areas, setAreas] = useState([]);

  // ----- Loading States -----
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingCircles, setLoadingCircles] = useState(false);
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ----- Manufacturer Details -----
  const [batterySerialNumber, setBatterySerialNumber] = useState('');
  const [manufacturerName, setManufacturerName] = useState('');
  const [kva, setKva] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  // ----- Incidents Section -----
  // ✅ incidentDescription state removed
  const [incidentReason, setIncidentReason] = useState(null);
  const [showOtherReason, setShowOtherReason] = useState(false);
  const [otherReason, setOtherReason] = useState('');
  const [incidentComments, setIncidentComments] = useState('');
  const [incidentImages, setIncidentImages] = useState([]);
  const [uploadedDocumentIds, setUploadedDocumentIds] = useState([]);

  // Reason dropdown — all 10 + Other
  const incidentReasonOptions = [
    { label: 'Substation shut down', value: 'Substation shut down' },
    { label: 'Not 2V Batteries', value: 'Not 2V Batteries' },
    { label: 'Charger Not working', value: 'Charger Not working' },
    { label: 'Charger AC/DC MCB issue', value: 'Charger AC/DC MCB issue' },
    { label: 'Charger OLD Model', value: 'Charger OLD Model' },
    {
      label: 'Charger New Model, Need MSEDCL Technician Support',
      value: 'Charger New Model,Need MSEDCL Technician Support',
    },
    { label: 'Rust issue', value: 'Rust issue' },
    { label: 'Weak Battiries', value: 'Weak Battiries' },
    { label: 'Network Issue', value: 'Network Issue' },
    { label: 'Underground wiring to Charger', value: 'Underground wiring to Charger' },
    { label: 'Other', value: 'other' },
  ];

  // ----- Hardcoded values -----
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

  useEffect(() => {
    Icon.loadFont();
  }, []);

  // ----- Auto GPS -----
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
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
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

  // ----- Load Zones -----
  useEffect(() => {
    if (!userToken) return;
    setLoadingZones(true);
    axios
      .get(`${API_BASE}/zones?state=Maharastra`, {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      .then((res) => {
        const items = (res.data || []).map((item) => ({
          label: typeof item === 'string' ? item : item.name || String(item),    
          value: typeof item === 'string' ? item : item.name || String(item),
        }));
        items.push({ label: 'Other', value: 'other' });
        setZones(items);
      })
      .catch(() => setZones([{ label: 'Other', value: 'other' }]))
      .finally(() => setLoadingZones(false));
  }, [userToken]);

  // ----- Load Circles -----
  useEffect(() => {
    if (!zone || zone === 'other' || showOtherZone) {
      setCircles([{ label: 'Other', value: 'other' }]);
      setCircle(null);
      setDivision(null);
      setArea(null);
      return;
    }
    setLoadingCircles(true);
    axios
      .get(`${API_BASE}/circles?zone=${zone}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      .then((res) => {
        const items = (res.data || []).map((item) => ({
          label: typeof item === 'string' ? item : item.name || String(item),
          value: typeof item === 'string' ? item : item.name || String(item),
        }));
        items.push({ label: 'Other', value: 'other' });
        setCircles(items);
      })
      .catch(() => setCircles([{ label: 'Other', value: 'other' }]))
      .finally(() => setLoadingCircles(false));
  }, [zone, showOtherZone, userToken]);

  // ----- Load Divisions -----
  useEffect(() => {
    if (!circle || circle === 'other' || showOtherCircle) {
      setDivisions([{ label: 'Other', value: 'other' }]);
      setDivision(null);
      setArea(null);
      return;
    }
    setLoadingDivisions(true);
    axios
      .get(`${API_BASE}/divisions?circle=${circle}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      .then((res) => {
        const items = (res.data || []).map((div) => ({
          label: div.name,
          value: div.name,
        }));
        items.push({ label: 'Other', value: 'other' });
        setDivisions(items);
      })
      .catch(() => setDivisions([{ label: 'Other', value: 'other' }]))
      .finally(() => setLoadingDivisions(false));
  }, [circle, showOtherCircle, userToken]);

  // ----- Load Areas -----
  useEffect(() => {
    const finalDivision = showOtherDivision ? otherDivision.trim() : division;
    if (!finalDivision || finalDivision === 'other') {
      setAreas([{ label: 'Other', value: 'other' }]);
      setArea(null);
      return;
    }
    setLoadingAreas(true);
    axios
      .get(`${API_BASE}/areas?division=${finalDivision}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      .then((res) => {
        const items = (res.data || []).map((a) => ({
          label: typeof a === 'string' ? a : a.name || String(a),
          value: typeof a === 'string' ? a : a.name || String(a),
        }));
        items.push({ label: 'Other', value: 'other' });
        setAreas(items);
      })
      .catch(() => setAreas([{ label: 'Other', value: 'other' }]))
      .finally(() => setLoadingAreas(false));
  }, [division, showOtherDivision, userToken]);

  // ----- Helpers -----
  const handleUppercaseInput = (text, setter, max = null) => {
    let val = text.toUpperCase();
    if (max && val.length > max) val = val.substring(0, max);
    setter(val);
  };

  const handleSiteId = (text, setter, max = null) => {
    let value = 'VJMDBC' + text;
    setSiteId(text);
    setter(value);
  };

  const handleSerialNuber = (text, setter, max = null) => {
    let value = 'VJMDBMC25' + text;
    setNumber(text);
    setter(value);
  };

  const getCurrentDate = () => new Date().toISOString().split('T')[0];

  // ----- Image Picker Handlers -----
  const requestMediaPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery access is required to upload images.');
      return false;
    }
    return true;
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required to take photos.');
      return false;
    }
    return true;
  };

  const pickImageFromGallery = async () => {
    const ok = await requestMediaPermission();
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 0,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset, idx) => ({
        uri: asset.uri,
        name: asset.fileName || `incident_${Date.now()}_${idx}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      }));
      setIncidentImages((prev) => [...prev, ...newImages]);
    }
  };

  const takePhoto = async () => {
    const ok = await requestCameraPermission();
    if (!ok) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setIncidentImages((prev) => [
        ...prev,
        {
          uri: asset.uri,
          name: asset.fileName || `incident_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        },
      ]);
    }
  };

  const removeImage = (index) => {
    setIncidentImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ================== UPLOAD DOCUMENTS API (LOCAL) ==================
  // POST http://192.168.1.51:51270/api/uploadDocuments?substation=AREA_NAME&description=REASON
  const uploadDocuments = async (substationName, description) => {
    if (incidentImages.length === 0) return [];

    const formData = new FormData();
    incidentImages.forEach((img, idx) => {
      formData.append('files', {
        uri: img.uri,
        name: img.name || `incident_${idx}.jpg`,
        type: img.type || 'image/jpeg',
      });
    });

    const url = `${UPLOAD_API_BASE}/uploadDocuments?substation=${encodeURIComponent(
      substationName
    )}&description=${encodeURIComponent(description)}`;

    console.log('=== UPLOAD DOCUMENTS ===');
    console.log('URL:', url);
    console.log('substation (area name):', substationName);
    console.log('description (reason):', description);
    console.log('Images count:', incidentImages.length);

    try {
      const res = await axios.post(url, formData, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
        },
        timeout: 30000,
      });

      console.log('UPLOAD SUCCESS:', res.status, res.data);
      return res.data?.documentIds || [];
    } catch (err) {
      console.log('UPLOAD ERROR status:', err.response?.status);
      console.log('UPLOAD ERROR data:', err.response?.data);
      console.log('UPLOAD ERROR message:', err.message);
      throw new Error(
        'Image upload failed: ' +
          (err.response?.data?.message ||
            err.response?.data?.error ||
            (err.response?.status ? `HTTP ${err.response.status}` : err.message))
      );
    }
  };

  // ================== VALIDATION ==================
  const validateAndSubmit = () => {
    const finalZone = showOtherZone ? otherZone.trim() : zone;
    const finalCircle = showOtherCircle ? otherCircle.trim() : circle;
    const finalDivision = showOtherDivision ? otherDivision.trim() : division;
    const finalArea = showOtherArea ? otherArea.trim() : area;
    const finalReason = showOtherReason ? otherReason.trim() : incidentReason;

    const required = {
      'Substation ID': substationId.trim(),
      'Serial Number': serialNumber.trim(),
      Zone: finalZone,
      Circle: finalCircle,
      Division: finalDivision,
      Area: finalArea,
      'Battery Serial Number': batterySerialNumber.trim(),
      'Manufacturer Name': manufacturerName.trim(),
      KVA: kva.trim(),
      'Mobile Number': mobileNumber.trim(),
    };

    const missing = Object.entries(required)
      .filter(([_, v]) => !v)
      .map(([k]) => k);
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

    // ✅ Only Reason is now required (no separate description)
    if (!finalReason) {
      Alert.alert('Missing Fields', '• Incident Reason is required');
      return;
    }

    submit(finalZone, finalCircle, finalDivision, finalArea, finalReason);
  };

  // ================== SUBMIT (site JSON → then upload multipart) ==================
  const submit = async (z, c, d, a, reason) => {
    console.log('=== SUBMIT START ===');
    console.log('userToken exists:', !!userToken);
    console.log('incidentImages count:', incidentImages.length);

    if (!userToken) {
      Alert.alert('Error', 'Not logged in');
      return;
    }

    // Resolve the final AREA NAME — used as the "substation" query param
    const areaName = (showOtherArea ? otherArea.trim() : a) || '';
    console.log('Resolved area name (will be used as substation):', areaName);

    // ✅ Use the REASON as the description for both API calls
    const descriptionText = reason || '';
    console.log('Description (from reason):', descriptionText);

    if (!areaName) {
      Alert.alert('Missing', 'Please select or enter an Area first.');
      return;
    }

    if (!descriptionText) {
      Alert.alert('Missing', 'Please select or enter an Incident Reason.');
      return;
    }

    setSubmitting(true);
    let stage = 'site';

    try {
      // =============================================================
      // STEP 1: CREATE SITE  →  application/json
      // =============================================================
      console.log('=== STEP 1: SUBMITTING SITE (JSON) ===');

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
        incidentDTO: {
          // ✅ description now comes from the Reason
          description: descriptionText,
          reason: reason,
          comments: incidentComments.trim(),
          reportedDate: getCurrentDate(),
          documentIds: [],
        },
      };

      const siteRes = await axios.post(API_URL, payload, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
      });

      console.log('=== SITE RESPONSE (RAW) ===');
      console.log('data:', JSON.stringify(siteRes.data, null, 2));

      const body = siteRes.data || {};
      const isSuccess =
        body.value === 1 ||
        body.value === true ||
        (body.data && typeof body.data === 'object');

      if (!isSuccess) {
        throw new Error(body.message || 'Site creation failed (value=0 or data=null)');
      }

      // =============================================================
      // STEP 2: UPLOAD DOCUMENTS  →  substation = AREA NAME
      //                            description = REASON
      // =============================================================
      if (incidentImages.length > 0) {
        stage = 'upload';
        console.log('=== STEP 2: UPLOADING DOCUMENTS ===');
        console.log('Using area name as substation:', areaName);
        console.log('Using reason as description:', descriptionText);

        const documentIds = await uploadDocuments(areaName, descriptionText);
        console.log('Uploaded documentIds:', documentIds);
        setUploadedDocumentIds(documentIds);
      } else {
        console.log('No images to upload — skipping step 2.');
      }

      Alert.alert('Success', 'Site added successfully!', [
        { text: 'OK', onPress: resetForm },
      ]);
    } catch (err) {
      console.log('=== SUBMIT ERROR ===');
      console.log('Stage that failed:', stage);
      console.log('Status:', err.response?.status);
      console.log('Response data:', JSON.stringify(err.response?.data, null, 2));
      console.log('Message:', err.message);

      const serverMsg =
        err.response?.data?.message || err.response?.data?.error || err.message;

      Alert.alert('Error', `[${stage}] ${serverMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ================== RESET ==================
  const resetForm = () => {
    setSubstationId('');
    setSerialNumber('');
    setBatterySerialNumber('');
    setManufacturerName('');
    setKva('');
    setMobileNumber('');
    setZone(null);
    setCircle(null);
    setDivision(null);
    setArea(null);
    setOtherZone('');
    setOtherCircle('');
    setOtherDivision('');
    setOtherArea('');
    setShowOtherZone(false);
    setShowOtherCircle(false);
    setShowOtherDivision(false);
    setShowOtherArea(false);
    setSiteId('');
    setNumber('');
    // ✅ incidentDescription reset removed
    setIncidentReason(null);
    setOtherReason('');
    setShowOtherReason(false);
    setIncidentComments('');
    setIncidentImages([]);
    setUploadedDocumentIds([]);
  };

  // ================== RENDER ==================
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.mainTitle}>Add New Site</Text>

        <Section title="Site Location">
          <Input
            label={`Substation ID (${SITE_ID_MAX_LENGTH} chars)`}
            value={siteId}
            onChangeText={(t) => handleSiteId(t, setSubstationId, SITE_ID_MAX_LENGTH)}
            placeholder="Enter exactly 4 characters"
            maxLength={SITE_ID_MAX_LENGTH}
            characterCount={siteId.length}
            maxCharacterCount={SITE_ID_MAX_LENGTH}
          />
          <Input
            label={`Serial Number (${SERIAL_NUMBER_MAX_LENGTH} chars)`}
            value={number}
            onChangeText={(t) => handleSerialNuber(t, setSerialNumber, SERIAL_NUMBER_MAX_LENGTH)}
            placeholder="Enter exactly 4 characters"
            maxLength={SERIAL_NUMBER_MAX_LENGTH}
            characterCount={number.length}
            maxCharacterCount={SERIAL_NUMBER_MAX_LENGTH}
          />

          {/* State */}
          <View style={styles.inputWrap}>
            <Text style={styles.label}>State</Text>
            <RNPickerSelect
              value={state}
              items={[{ label: 'Maharastra', value: 'Maharastra' }]}
              onValueChange={() => {}}
              disabled={true}
              style={pickerSelectStyles}
            />
          </View>

          {/* Zone */}
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Zone</Text>
            {loadingZones ? (
              <ActivityIndicator />
            ) : (
              <>
                <RNPickerSelect
                  placeholder={{ label: 'Select Zone', value: null }}
                  value={showOtherZone ? 'other' : zone}
                  items={zones}
                  onValueChange={(v) => {
                    if (v === 'other') {
                      setShowOtherZone(true);
                      setZone(null);
                    } else {
                      setShowOtherZone(false);
                      setZone(v);
                    }
                    setCircle(null);
                    setDivision(null);
                    setArea(null);
                  }}
                  style={pickerSelectStyles}
                />
                {showOtherZone && (
                  <TextInput
                    style={styles.input}
                    value={otherZone}
                    onChangeText={setOtherZone}
                    placeholder="Enter Zone"
                  />
                )}
              </>
            )}
          </View>

          {/* Circle */}
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Circle</Text>
            {loadingCircles ? (
              <ActivityIndicator />
            ) : (
              <>
                <RNPickerSelect
                  placeholder={{ label: 'Select Circle', value: null }}
                  value={showOtherCircle ? 'other' : circle}
                  items={circles}
                  onValueChange={(v) => {
                    if (v === 'other') {
                      setShowOtherCircle(true);
                      setCircle(null);
                    } else {
                      setShowOtherCircle(false);
                      setCircle(v);
                    }
                    setDivision(null);
                    setArea(null);
                  }}
                  style={pickerSelectStyles}
                />
                {showOtherCircle && (
                  <TextInput
                    style={styles.input}
                    value={otherCircle}
                    onChangeText={setOtherCircle}
                    placeholder="Enter Circle"
                  />
                )}
              </>
            )}
          </View>

          {/* Division */}
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Division</Text>
            {loadingDivisions ? (
              <ActivityIndicator />
            ) : (
              <>
                <RNPickerSelect
                  placeholder={{ label: 'Select Division', value: null }}
                  value={showOtherDivision ? 'other' : division}
                  items={divisions}
                  onValueChange={(v) => {
                    if (v === 'other') {
                      setShowOtherDivision(true);
                      setDivision(null);
                    } else {
                      setShowOtherDivision(false);
                      setDivision(v);
                    }
                    setArea(null);
                  }}
                  style={pickerSelectStyles}
                />
                {showOtherDivision && (
                  <TextInput
                    style={styles.input}
                    value={otherDivision}
                    onChangeText={setOtherDivision}
                    placeholder="Enter Division"
                  />
                )}
              </>
            )}
          </View>

          {/* Area */}
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Area</Text>
            {loadingAreas ? (
              <ActivityIndicator />
            ) : (
              <>
                <RNPickerSelect
                  placeholder={{ label: 'Select Area', value: null }}
                  value={showOtherArea ? 'other' : area}
                  items={areas}
                  onValueChange={(v) => {
                    if (v === 'other') {
                      setShowOtherArea(true);
                      setArea(null);
                    } else {
                      setShowOtherArea(false);
                      setArea(v);
                    }
                  }}
                  style={pickerSelectStyles}
                />
                {showOtherArea && (
                  <TextInput
                    style={styles.input}
                    value={otherArea}
                    onChangeText={(t) => handleUppercaseInput(t, setOtherArea)}
                    placeholder="Enter Area (CAPS)"
                    autoCapitalize="characters"
                  />
                )}
              </>
            )}
          </View>

          {/* GPS */}
          <View style={styles.coordinatesContainer}>
            <View style={styles.coordinateRow}>
              <View style={styles.coordinateItem}>
                <Text style={styles.label}>Latitude</Text>
                {locationLoading ? (
                  <ActivityIndicator />
                ) : (
                  <TextInput
                    style={[styles.input, locationError && styles.errorInput]}
                    value={latitude}
                    editable={false}
                  />
                )}
              </View>
              <View style={styles.coordinateItem}>
                <Text style={styles.label}>Longitude</Text>
                {locationLoading ? (
                  <ActivityIndicator />
                ) : (
                  <TextInput
                    style={[styles.input, locationError && styles.errorInput]}
                    value={longitude}
                    editable={false}
                  />
                )}
              </View>
            </View>
          </View>
        </Section>

        {/* Manufacturer Details */}
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
          <Input label="KVA" value={kva} onChangeText={setKva} placeholder="Enter KVA" />
          <Input
            label="Mobile Number"
            value={mobileNumber}
            onChangeText={setMobileNumber}
            keyboardType="phone-pad"
            placeholder="Enter mobile number"
          />
        </Section>

        {/* Incidents */}
        <Section title="Incidents">
          {/* ✅ Incident Description field removed */}

          <View style={styles.inputWrap}>
            <Text style={styles.label}>Reason</Text>
            <RNPickerSelect
              placeholder={{ label: 'Select Reason', value: null }}
              value={showOtherReason ? 'other' : incidentReason}
              items={incidentReasonOptions}
              onValueChange={(v) => {
                if (v === 'other') {
                  setShowOtherReason(true);
                  setIncidentReason(null);
                } else {
                  setShowOtherReason(false);
                  setIncidentReason(v);
                }
              }}
              style={pickerSelectStyles}
            />
            {showOtherReason && (
              <TextInput
                style={styles.input}
                value={otherReason}
                onChangeText={setOtherReason}
                placeholder="Enter reason"
              />
            )}
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.label}>Comments</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={incidentComments}
              onChangeText={setIncidentComments}
              placeholder="Enter any additional comments..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Image Upload */}
          <View style={styles.inputWrap}>
            <Text style={styles.label}>
              Incident Images {incidentImages.length > 0 ? `(${incidentImages.length})` : ''}
            </Text>

            <View style={styles.imageButtonRow}>
              <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                <Icon name="camera" size={18} color="#fff" />
                <Text style={styles.imageButtonText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.imageButton} onPress={pickImageFromGallery}>
                <Icon name="image" size={18} color="#fff" />
                <Text style={styles.imageButtonText}>Gallery</Text>
              </TouchableOpacity>
            </View>

            {incidentImages.length > 0 && (
              <View style={styles.imageGrid}>
                {incidentImages.map((img, index) => (
                  <View key={index} style={styles.imageThumbWrap}>
                    <Image source={{ uri: img.uri }} style={styles.imageThumb} />
                    <TouchableOpacity
                      style={styles.imageRemoveBtn}
                      onPress={() => removeImage(index)}
                    >
                      <Icon name="times" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
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

// ================== Reusable Components ==================
const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
  characterCount,
  maxCharacterCount,
}) => (
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
      <Text
        style={[
          styles.characterCount,
          characterCount === maxCharacterCount && styles.characterCountValid,
        ]}
      >
        {characterCount}/{maxCharacterCount}
      </Text>
    )}
  </View>
);

// ================== Styles ==================
const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  inputAndroid: {
    fontSize: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 8,
  },
});

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#003844',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#003844',
    marginBottom: 12,
  },
  inputWrap: { marginBottom: 12 },
  label: { fontSize: 14, color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 15,
    marginTop: 8,
  },
  textArea: { minHeight: 90, paddingTop: 12 },
  errorInput: { borderColor: 'red' },
  button: {
    backgroundColor: '#003844',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFF700', fontSize: 17, fontWeight: 'bold' },
  coordinatesContainer: { marginTop: 16 },
  coordinateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  coordinateItem: { flex: 0.48 },
  characterCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
    color: '#666',
  },
  characterCountValid: { color: '#4CAF50', fontWeight: 'bold' },

  imageButtonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#003844',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,  
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 10,
  },
  imageThumbWrap: { position: 'relative', width: 80, height: 80 },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  imageRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#d32f2f',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center', 
  },
});

export default SiteDetails;