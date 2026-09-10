import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Line, Rect, Defs, LinearGradient, Stop, G, Path, Text as SvgText, Polygon } from 'react-native-svg';

const TempIcon = ({ isHighTemperature }) => {
  const liquidHeightAnim = useRef(new Animated.Value(isHighTemperature ? 30 : 18)).current;
  const liquidYAnim = useRef(new Animated.Value(isHighTemperature ? 15 : 27)).current;
  const indicatorOpacityAnim = useRef(new Animated.Value(0.8)).current;
  const waveOpacityAnim1 = useRef(new Animated.Value(0.8)).current;
  const waveOpacityAnim2 = useRef(new Animated.Value(0.4)).current;
  const waveOpacityAnim3 = useRef(new Animated.Value(0.6)).current;
  const waveTranslateAnim1 = useRef(new Animated.Value(0)).current;
  const waveTranslateAnim2 = useRef(new Animated.Value(0)).current;
  const waveTranslateAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Liquid animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(liquidHeightAnim, {
          toValue: isHighTemperature ? 36.4 : 22.4,
          duration: isHighTemperature ? 2000 : 3000,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(liquidHeightAnim, {
          toValue: isHighTemperature ? 33.6 : 19.6,
          duration: isHighTemperature ? 2000 : 3000,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(liquidHeightAnim, {
          toValue: isHighTemperature ? 35 : 21,
          duration: isHighTemperature ? 2000 : 3000,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(liquidYAnim, {
          toValue: isHighTemperature ? 16.1 : 30.1,
          duration: isHighTemperature ? 2000 : 3000,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(liquidYAnim, {
          toValue: isHighTemperature ? 18.9 : 32.9,
          duration: isHighTemperature ? 2000 : 3000,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(liquidYAnim, {
          toValue: isHighTemperature ? 17.5 : 31.5,
          duration: isHighTemperature ? 2000 : 3000,
          useNativeDriver: false,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();

    // Indicator opacity animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(indicatorOpacityAnim, {
          toValue: isHighTemperature ? 0.4 : 0.5,
          duration: isHighTemperature ? 1500 : 2000,
          useNativeDriver: false,
        }),
        Animated.timing(indicatorOpacityAnim, {
          toValue: 0.8,
          duration: isHighTemperature ? 1500 : 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    if (isHighTemperature) {
      // Heat wave animations
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveOpacityAnim1, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(waveOpacityAnim1, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(waveOpacityAnim2, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(waveOpacityAnim2, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(waveOpacityAnim3, {
            toValue: 0.9,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(waveOpacityAnim3, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(waveTranslateAnim1, {
            toValue: 1.4,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(waveTranslateAnim1, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(waveTranslateAnim2, {
            toValue: -0.7,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(waveTranslateAnim2, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(waveTranslateAnim3, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(waveTranslateAnim3, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [isHighTemperature]);

  const AnimatedRect = Animated.createAnimatedComponent(Rect);
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);
  const AnimatedPath = Animated.createAnimatedComponent(Path);
  const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

  return (
    <Svg width="36" height="75" viewBox="0 0 36 75">
      <Defs>
        <LinearGradient id={isHighTemperature ? "highGradient" : "normalGradient"} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={isHighTemperature ? "#ef4444" : "#00ff00"} />
          <Stop offset="100%" stopColor={isHighTemperature ? "#dc2626" : "#00ff00"} />
        </LinearGradient>
      </Defs>

      {/* Thermometer Base */}
      <Circle
        cx="18"
        cy="45"
        r="7.2"
        fill={`url(#${isHighTemperature ? "highGradient" : "normalGradient"})`}
        stroke={isHighTemperature ? "#b91c1c" : "#00ff00"}
        strokeWidth="1.2"
      />

      {/* Thermometer Tube */}
      <Rect
        x="14.4"
        y="12"
        width="7.2"
        height="33"
        fill="#f8fafc"
        stroke="#64748b"
        strokeWidth="1.2"
        rx="3.6"
        ry="3.6"
      />

      {/* Mercury/Temperature Liquid */}
      <AnimatedRect
        x="15.6"
        y={liquidYAnim}
        width="4.8"
        height={liquidHeightAnim}
        fill={`url(#${isHighTemperature ? "highGradient" : "normalGradient"})`}
        rx="2.4"
        ry="2.4"
      />

      {/* Temperature Scale Lines */}
      <G stroke="#64748b" strokeWidth="0.9" opacity="0.7">
        <Line x1="10.8" y1="15" x2="13.2" y2="15" />
        <Line x1="10.8" y1="21" x2="13.2" y2="21" />
        <Line x1="10.8" y1="27" x2="13.2" y2="27" />
        <Line x1="10.8" y1="33" x2="13.2" y2="33" />
        <Line x1="10.8" y1="39" x2="13.2" y2="39" />
      </G>

      {isHighTemperature ? (
        <>
          {/* Heat Waves Animation */}
          <G stroke="#f59e0b" strokeWidth="1.2" fill="none">
            <AnimatedPath
              d="M27 15 Q28.2 12 27 9"
              strokeOpacity={waveOpacityAnim1}
              transform={[{ translateX: waveTranslateAnim1 }]}
            />
            <AnimatedPath
              d="M28.8 18 Q30 15 28.8 12"
              strokeOpacity={waveOpacityAnim2}
              transform={[{ translateX: waveTranslateAnim2 }]}
            />
            <AnimatedPath
              d="M30.6 21 Q31.8 18 30.6 15"
              strokeOpacity={waveOpacityAnim3}
              transform={[{ translateX: waveTranslateAnim3 }]}
            />
          </G>

          {/* Warning Triangle for High Temperature */}
          <AnimatedPolygon
            points="18,4.8 15.3,1.2 20.7,1.2"
            fill="#f59e0b"
            stroke="#d97706"
            strokeWidth="0.6"
            opacity={indicatorOpacityAnim}
          />
          <SvgText
            x="18"
            y="4.2"
            textAnchor="middle"
            fill="#fff"
            fontFamily="Arial, sans-serif"
            fontSize="3.6"
            fontWeight="bold"
          >
            !
          </SvgText>

          {/* Temperature Label with More Space */}
          <SvgText
            x="18"
            y="68"
            fontFamily="Arial, sans-serif"
            fontSize="6"
            fill="#ef4444"
            textAnchor="middle"
            fontWeight="bold"
          >
            HIGH
          </SvgText>
        </>
      ) : (
        <>
          {/* Normal Temperature Indicator */}
          <AnimatedCircle
            cx="18"
            cy="6"
            r="3.6"
            fill="#00ff00"
            opacity={indicatorOpacityAnim}
          />

          {/* Checkmark for Normal */}
          <Path
            d="M16.2 4.8 L17.4 6.6 L19.8 3.6"
            stroke="#fff"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />

          {/* Temperature Label with More Space */}
          <SvgText
            x="18"
            y="68"
            fontFamily="Arial, sans-serif"
            fontSize="8"
            fill="#4CAF50"
            textAnchor="middle"
            fontWeight="bold"
          >
            NORMAL
          </SvgText>
        </>
      )}
    </Svg>
  );
};

export default TempIcon;