import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Rect, Circle, Path, Polygon, Defs, LinearGradient, Stop, G, Text as SvgText } from 'react-native-svg';

const VoltageIcon = ({ voltageStatus }) => {
  // Coerce voltageStatus to a number to handle string inputs
  const status = Number(voltageStatus);
  
  // Determine voltage state: 0 = low (red), 1 = normal (green), 2 = high (red)
  const isLowVoltage = status === 0;
  const isNormalVoltage = status === 1;
  const isHighVoltage = status === 2;

  // Debug log to verify inputs
  console.log(`VoltageStatus: ${voltageStatus}, Coerced Status: ${status}, isLowVoltage: ${isLowVoltage}, isNormalVoltage: ${isNormalVoltage}, isHighVoltage: ${isHighVoltage}`);

  // Animation values
  const batteryHeightAnim = useRef(new Animated.Value(isHighVoltage ? 21.7 : isNormalVoltage ? 12.6 : 7)).current; // High: 21.7, Normal: 12.6, Low: 7
  const batteryYAnim = useRef(new Animated.Value(isHighVoltage ? 22.4 : isNormalVoltage ? 31.5 : 37)).current; // High: 22.4, Normal: 31.5, Low: 37
  const indicatorOpacityAnim = useRef(new Animated.Value(0.8)).current;
  const sparkOpacityAnim1 = useRef(new Animated.Value(0.8)).current;
  const sparkOpacityAnim2 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Battery level animation
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(batteryHeightAnim, {
            toValue: isHighVoltage ? 23.1 : isNormalVoltage ? 14 : 8.4, // High: 23.1, Normal: 14, Low: 8.4
            duration: isHighVoltage ? 2000 : isNormalVoltage ? 3000 : 4000, // Faster for high, slower for low
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(batteryYAnim, {
            toValue: isHighVoltage ? 21 : isNormalVoltage ? 30.1 : 35.6, // High: 21, Normal: 30.1, Low: 35.6
            duration: isHighVoltage ? 2000 : isNormalVoltage ? 3000 : 4000,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
        Animated.parallel([
          Animated.timing(batteryHeightAnim, {
            toValue: isHighVoltage ? 20.3 : isNormalVoltage ? 11.2 : 5.6, // High: 20.3, Normal: 11.2, Low: 5.6
            duration: isHighVoltage ? 2000 : isNormalVoltage ? 3000 : 4000,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(batteryYAnim, {
            toValue: isHighVoltage ? 23.8 : isNormalVoltage ? 32.9 : 38.4, // High: 23.8, Normal: 32.9, Low: 38.4
            duration: isHighVoltage ? 2000 : isNormalVoltage ? 3000 : 4000,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
        Animated.parallel([
          Animated.timing(batteryHeightAnim, {
            toValue: isHighVoltage ? 21.7 : isNormalVoltage ? 12.6 : 7, // High: 21.7, Normal: 12.6, Low: 7
            duration: isHighVoltage ? 2000 : isNormalVoltage ? 3000 : 4000,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(batteryYAnim, {
            toValue: isHighVoltage ? 22.4 : isNormalVoltage ? 31.5 : 37, // High: 22.4, Normal: 31.5, Low: 37
            duration: isHighVoltage ? 2000 : isNormalVoltage ? 3000 : 4000,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
        ]),
      ])
    ).start();

    // Indicator animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(indicatorOpacityAnim, {
          toValue: isHighVoltage ? 0.4 : isNormalVoltage ? 0.5 : 0.6, // High: 0.4, Normal: 0.5, Low: 0.6
          duration: isHighVoltage ? 1000 : isNormalVoltage ? 2000 : 3000, // Faster for high, slower for low
          useNativeDriver: false,
        }),
        Animated.timing(indicatorOpacityAnim, {
          toValue: 0.8,
          duration: isHighVoltage ? 1000 : isNormalVoltage ? 2000 : 3000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Spark animations (only for high voltage)
    if (isHighVoltage) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkOpacityAnim1, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(sparkOpacityAnim1, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(sparkOpacityAnim2, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(sparkOpacityAnim2, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [isHighVoltage, isNormalVoltage, isLowVoltage]);

  const AnimatedRect = Animated.createAnimatedComponent(Rect);
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);
  const AnimatedPath = Animated.createAnimatedComponent(Path);
  const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
  const AnimatedG = Animated.createAnimatedComponent(G);

  return (
    <Svg width="42" height="70" viewBox="0 0 42 70">
      <Defs>
        <LinearGradient 
          id={isHighVoltage ? "highBatteryGradient" : isNormalVoltage ? "normalBatteryGradient" : "lowBatteryGradient"} 
          x1="0%" y1="0%" x2="0%" y2="100%"
        >
          <Stop offset="0%" stopColor={isHighVoltage ? "#ef4444" : isNormalVoltage ? "#00ff00" : "#ef4444"} />
          <Stop offset="100%" stopColor={isHighVoltage ? "#dc2626" : isNormalVoltage ? "#00ff00" : "#dc2626"} />
        </LinearGradient>
      </Defs>

      {/* Battery Body */}
      <Rect
        x="14"
        y="21"
        width="14"
        height="24.5"
        rx="2.1"
        ry="2.1"
        fill="#f8fafc"
        stroke="#64748b"
        strokeWidth="1.4"
      />

      {/* Battery Terminal */}
      <Rect
        x="18.2"
        y="17.5"
        width="5.6"
        height="3.5"
        rx="1.4"
        ry="1.4"
        fill="#64748b"
      />

      {/* Battery Level Indicator */}
      <AnimatedRect
        x="15.4"
        y={batteryYAnim}
        width="11.2"
        height={batteryHeightAnim}
        rx="1.4"
        ry="1.4"
        fill={`url(#${isHighVoltage ? "highBatteryGradient" : isNormalVoltage ? "normalBatteryGradient" : "lowBatteryGradient"})`}
        opacity="0.9"
      />

      {/* Voltage Indicator Lines */}
      <G 
        stroke={isHighVoltage ? "#ef4444" : isNormalVoltage ? "#00ff00" : "#ef4444"} 
        strokeWidth={isHighVoltage ? 1.4 : isNormalVoltage ? 1.05 : 0.7} 
        opacity={isHighVoltage ? 0.8 : isNormalVoltage ? 0.7 : 0.6}
      >
        <Path d="M31.5 24.5 L35 24.5" />
        <Path d="M32.9 23.1 L32.9 25.9" />
        <Path d="M7 31.5 L10.5 31.5" />
        {isHighVoltage && (
          <>
            <Path d="M32.9 35 L36.4 35" />
            <Path d="M34.3 33.6 L34.3 36.4" />
          </>
        )}
      </G>

      {isHighVoltage ? (
        <>
          {/* Overcharge Sparks for High Voltage */}
          <G stroke="#fbbf24" strokeWidth="1.4" fill="none">
            <AnimatedPath
              d="M29.4 28 L31.5 25.9 M30.1 30.1 L32.2 28"
              opacity={sparkOpacityAnim1}
            />
            <AnimatedPath
              d="M12.6 35 L10.5 32.9 M11.9 37.1 L9.8 35"
              opacity={sparkOpacityAnim2}
            />
          </G>

          {/* Warning Triangle for High Voltage */}
          <AnimatedPolygon
            points="21,9.1 17.5,4.9 24.5,4.9"
            fill="#f59e0b"
            stroke="#d97706"
            strokeWidth="0.7"
            opacity={indicatorOpacityAnim}
          />
          <SvgText
            x="21"
            y="8.4"
            textAnchor="middle"
            fill="#fff"
            fontFamily="Arial, sans-serif"
            fontSize="4.2"
            fontWeight="bold"
          >
            !
          </SvgText>
        </>
      ) : isNormalVoltage ? (
        <>
          {/* Normal Voltage Indicator */}
          <AnimatedCircle
            cx="21"
            cy="10.5"
            r="4.2"
            fill="#00ff00"
            opacity={indicatorOpacityAnim}
          />

          {/* Checkmark for Normal */}
          <Path
            d="M18.9 9.1 L20.3 11.2 L23.1 7.7"
            stroke="#fff"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          {/* Low Voltage Indicator (Square) */}
          <AnimatedRect
            x="18.2"
            y="7.7"
            width="5.6"
            height="5.6"
            rx="1"
            ry="1"
            fill="#ef4444"
            opacity={indicatorOpacityAnim}
          />

          {/* Minus Sign for Low Voltage */}
          <Path
            d="M19.6 10.5 H22.4"
            stroke="#fff"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Power Symbol */}
      <SvgText
        x="21"
        y={isHighVoltage ? "35" : isNormalVoltage ? "38.5" : "42"}
        fontFamily="Arial, sans-serif"
        fontSize="5.6"
        fill="#fff"
        textAnchor="middle"
        fontWeight="bold"
      >
        V
      </SvgText>

      {/* Voltage State Label */}
      <SvgText
        x="21"
        y="65"
        fontFamily="Arial, sans-serif"
        fontSize="8"
        fill={isHighVoltage ? "#ff4040" : isNormalVoltage ? "#4CAF50" : "#ff4040"}
        textAnchor="middle"
        fontWeight="bold"
      >
        {isHighVoltage ? "HIGH" : isNormalVoltage ? "NORMAL" : "LOW"}
      </SvgText>
    </Svg>
  );
};

export default VoltageIcon;