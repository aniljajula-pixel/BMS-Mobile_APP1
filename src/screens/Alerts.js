import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const Alerts = ({ batteryData, chargerData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const detailsMap = {
    bankDischargeCycle: "Battery",
    dcVoltageOLN: "DC Voltage",
    cellCommunication: "Cell Commun",
    batteryCondition: "Battery",
    stringVoltageLNH: "String voltage",
    stringCurrentHN: "String current",
    ambientTemperatureHN: "Ambient Temp",
    socLN: "SOC",
    chargerLoad: "Charger Load",
    inputMains: "input mains",
    inputPhase: "input phase",
    acVoltageULN: "AC Voltage",
    chargerTrip: "Charger",
    outputMccb: "Output Mccb",
    inputFuse: "input Fuse",
    rectifierFuse: "Rectifier Fuse",
    filterFuse: "Filter Fuse",
    outputFuse: "Output Fuse",
    alarmSupplyFuse: "Alarm Supply Fuse",
    buzzer: "Buzzer",
  };

  const getSeverityFromBit = (bit, key) => {
    if (bit === undefined || bit === null) {
      return { status: 'N/A', severity: 'medium', icon: 'question-circle' };
    }

    if (key === 'acVoltageULN') {
      switch (bit) {
        case 0:
          return { status: 'low', severity: 'high', icon: 'bolt' }; // Red
        case 1:
          return { status: 'normal', severity: 'medium', icon: 'bolt' }; // Green
        case 2:
          return { status: 'over', severity: 'high', icon: 'bolt' }; // Red
        default:
          return { status: 'N/A', severity: 'medium', icon: 'question-circle' };
      }
    }

    if (key === 'stringVoltageLNH' || key === 'dcVoltageOLN') {
      switch (bit) {
        case 0:
          return { status: 'low', severity: 'high', icon: 'battery-quarter' }; // Red
        case 1:
          return { status: 'normal', severity: 'medium', icon: 'battery-half' }; // Green
        case 2:
          return { status: 'high', severity: 'high', icon: 'battery-full' }; // Red
        default:
          return { status: 'N/A', severity: 'medium', icon: 'question-circle' };
      }
    }

    return { status: 'N/A', severity: 'medium', icon: 'question-circle' };
  };

  const alerts = useMemo(() => {
    if (!batteryData?.bmsAlarmsDTO && !chargerData?.chargerDTO) return [];

    const combinedData = { ...batteryData?.bmsAlarmsDTO, ...chargerData?.chargerDTO };

    return Object.keys(detailsMap).map((key, index) => {
      let status = 'normal';
      let severity = 'medium';
      let icon = 'question-circle';

      if (!(key in combinedData) || combinedData[key] === undefined || combinedData[key] === null) {
        return {
          id: index + 1,
          status: 'N/A',
          details: detailsMap[key],
          severity: 'medium',
          icon: 'question-circle',
        };
      }

      if (key === 'chargerTrip') {
        status = combinedData[key] ? 'Tripped' : 'Trip';
        severity = combinedData[key] ? 'high' : 'medium';
        icon = 'power-off';
      } else if (key === 'inputMains' || key === 'inputPhase') {
        status = combinedData[key] ? 'fail' : 'normal';
        severity = combinedData[key] ? 'high' : 'medium';
        icon = 'bolt';
      } else if (key === 'outputMccb') {
        status = combinedData[key] ? 'fail' : 'normal';
        severity = combinedData[key] ? 'high' : 'medium';
        icon = 'cogs';
      } else if (
        key === 'rectifierFuse' ||
        key === 'outputFuse' 
      ) {
        status = combinedData[key] ? 'Fail' : 'normal';
        severity = combinedData[key] ? 'high' : 'medium';
        icon = 'plug';
      } else if (key === 'alarmSupplyFuse') {
        status = combinedData[key] ? 'Fail' : 'Normal';
        severity = combinedData[key] ? 'medium' : 'medium';
        icon = 'plug';

        
      }else if (key === 'filterFuse') {
        status = combinedData[key] ? 'fail' : 'normal';
        severity = combinedData[key] ? 'medium' : 'medium';
        icon = 'plug';

        
      } else if (key === 'inputFuse') {
        status = combinedData[key] ? 'Detected' : 'normal';
        severity = combinedData[key] ? 'high' : 'medium';
        icon = 'plug';
      } else if (key === 'buzzer') {
        status = combinedData[key] ? 'On' : 'off';
        severity = combinedData[key] ? 'high' : 'medium';
        icon = 'notifications-active';
      } else if (key === 'cellCommunication') {
        status = combinedData[key] ? 'fail' : 'normal';
        severity = combinedData[key] ? 'high' : 'medium';
        icon = combinedData[key] ? 'exclamation-triangle' : 'signal';
      } else if (key === 'stringCurrentHN') {
        status = combinedData[key] ? 'high' : 'normal';
        severity = combinedData[key] ? 'high' : 'medium';
        icon = 'bolt';
      } else if (key === 'ambientTemperatureHN') {
        status = combinedData[key] ? 'high' : 'normal';
        severity = combinedData[key] ? 'high' : 'medium';
        icon = combinedData[key] ? 'thermometer-full' : 'thermometer-half';
      } else if (key === 'socLN') {
        status = combinedData[key] ? 'low' : 'normal';
        severity = combinedData[key] ? 'high' : 'medium';
        icon = combinedData[key] ? 'battery-empty' : 'battery-half';
      } else if (key === 'bankDischargeCycle') {
        status = combinedData[key] ? 'discharging' : 'charging';
        severity = combinedData[key] ? 'high' : 'medium';
        icon = combinedData[key] ? 'battery-quarter' : 'battery-full';
      } else if (key === 'batteryCondition') {
        if (combinedData['stringVoltageLNH'] === 2) {
          status = 'high';
          severity = 'high';
          icon = 'exclamation-triangle';
        } else {
          status = combinedData[key] ? 'low' : 'normal';
          severity = combinedData[key] ? 'high' : 'medium';
          icon = combinedData[key] ? 'battery-empty' : 'battery-full';
        }
      } else if (key === 'dcVoltageOLN' || key === 'acVoltageULN' || key === 'stringVoltageLNH') {
        ({ status, severity, icon } = getSeverityFromBit(combinedData[key], key));
      } else if (key === 'chargerLoad') {
        status = combinedData[key] ? 'Over' : 'normal';
        severity = combinedData[key] ? 'high' : 'medium';
        icon = 'plug';
      }

      return {
        id: index + 1,
        status,
        details: detailsMap[key],
        severity,
        icon,
      };
    });
  }, [batteryData, chargerData]);

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'high':
        return { backgroundColor: '#FF0000', color: '#FFFFFF' };
      case 'low':
        return { backgroundColor: '#FF0000', color: '#FFFFFF' }; // Changed to red
      case 'medium':
        return { backgroundColor: '#1DA31D', color: '#FFFFFF' };
      default:
        return { backgroundColor: '#ECEFF1', color: '#455A64' };
    }
  };

  const getSeverityStylesIcon = (severity) => {
    switch (severity) {
      case 'high':
        return { backgroundColor: '#FFFFFF', color: '#B71C1C' };
      case 'low':
        return { backgroundColor: '#FFFFFF', color: '#B71C1C' }; // Changed to red
      case 'medium':
        return { backgroundColor: '#FFFFFF', color: '#1B5E20' };
      default:
        return { backgroundColor: '#FFFFFF', color: '#455A64' };
    }
  };

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  return (
    <>
      {alerts.length > 0 && (
        <View style={styles.alarmsContainer}>
          <View style={styles.alarmsHeader}>
            <Text style={styles.alarmsTitle}>Alarms Info</Text>
            <TouchableOpacity style={styles.fullscreenButton} onPress={toggleModal}>
              <MaterialIcons name="fullscreen" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.alarmsGrid}>
            {alerts.map((alert) => (
              <TouchableOpacity
                key={alert.id}
                style={[styles.alarmCard, { transform: [{ scale: 1 }] }]}
                activeOpacity={0.7}
                onPressIn={() => ({ transform: [{ scale: 1.03 }] })}
                onPressOut={() => ({ transform: [{ scale: 1 }] })}
              >
                <View style={[styles.alarmIconContainer, getSeverityStylesIcon(alert.severity)]}>
                  {alert.icon === 'notifications-active' ? (
                    <MaterialIcons name="notifications-active" size={20} color={getSeverityStylesIcon(alert.severity).color} />
                  ) : (
                    <Icon name={alert.icon} size={20} color={getSeverityStylesIcon(alert.severity).color} />
                  )}
                </View>
                <View style={[styles.alarmTextContainer, getSeverityStyles(alert.severity)]}>
                  <Text style={styles.alarmText}>{`${alert.details} ${alert.status}`}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <Modal
        visible={isModalOpen}
        transparent={false}
        animationType="slide"
        onRequestClose={toggleModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Alarms Info (Fullscreen)</Text>
            <TouchableOpacity style={styles.closeButton} onPress={toggleModal}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.alarmsGrid}>
              {alerts.map((alert) => (
                <View key={alert.id} style={[styles.alarmCard, { width: '45%' }]}>
                  <View style={[styles.alarmIconContainer, getSeverityStylesIcon(alert.severity)]}>
                    {alert.icon === 'notifications-active' ? (
                      <MaterialIcons name="notifications-active" size={24} color={getSeverityStylesIcon(alert.severity).color} />
                    ) : (
                      <Icon name={alert.icon} size={24} color={getSeverityStylesIcon(alert.severity).color} />
                    )}
                  </View>
                  <View style={[styles.alarmTextContainer, getSeverityStyles(alert.severity)]}>
                    <Text style={[styles.alarmText, { fontSize: 12 }]}>{`${alert.details} ${alert.status}`}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  alarmsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    width: '100%',
  },
  alarmsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#008B8B',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#000000',
  },
  alarmsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  fullscreenButton: {
    padding: 5,
  },
  alarmsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 5,
  },
  alarmCard: {
    flexDirection: 'row',
    width: '30%',
    minWidth: 80,
    minHeight: 43,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    margin: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(218, 218, 143, 0.66)',
    overflow: 'hidden',
  },
  alarmIconContainer: {
    width: '30%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0.5,
  },
  alarmTextContainer: {
    width: '70%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  alarmText: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#008B8B',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  closeButton: {
    padding: 5,
    backgroundColor: '#B71C1C',
    borderRadius: 20,
  },
  modalContent: {
    padding: 0,
    flexGrow: 1,
  },
});

export default Alerts;