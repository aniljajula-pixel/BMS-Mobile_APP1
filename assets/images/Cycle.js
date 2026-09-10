import React from 'react';
import Svg, { Circle, G, Path, Rect, Text, Line } from 'react-native-svg';
import { Animated, Easing } from 'react-native';

const CycleIcon = () => {
  // Create animated values for the battery segments
  const segment1Anim = new Animated.Value(0);
  const segment2Anim = new Animated.Value(0);
  const segment3Anim = new Animated.Value(0);
  const segment4Anim = new Animated.Value(0);
  const segment5Anim = new Animated.Value(0);

  // Create animated values for the arrows
  const chargingArrowOpacity = new Animated.Value(1);
  const dischargingArrowOpacity = new Animated.Value(0);
  const movingArrowRotation = new Animated.Value(0);

  // Create animated values for the flow lines
  const chargingFlowX2 = new Animated.Value(55);
  const dischargingFlowX1 = new Animated.Value(245);

  // Animate the battery segments
  React.useEffect(() => {
    const animateSegments = () => {
      Animated.sequence([
        Animated.timing(segment1Anim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(segment2Anim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(segment3Anim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(segment4Anim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(segment5Anim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(segment1Anim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(segment2Anim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(segment3Anim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(segment4Anim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(segment5Anim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ]).start(() => animateSegments());
    };

    animateSegments();
  }, []);

  // Animate the arrows
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(chargingArrowOpacity, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(chargingArrowOpacity, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(dischargingArrowOpacity, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(dischargingArrowOpacity, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(movingArrowRotation, {
        toValue: 360,
        duration: 12000,
        useNativeDriver: false,
        easing: Easing.linear,
      })
    ).start();
  }, []);

  // Animate the flow lines
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(chargingFlowX2, {
          toValue: 70,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(chargingFlowX2, {
          toValue: 55,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dischargingFlowX1, {
          toValue: 235,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(dischargingFlowX1, {
          toValue: 245,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  // Animated components
  const AnimatedRect = Animated.createAnimatedComponent(Rect);
  const AnimatedPath = Animated.createAnimatedComponent(Path);
  const AnimatedLine = Animated.createAnimatedComponent(Line);

  return (
    <Svg width="80" height="80" viewBox="0 0 300 200">
      {/* Background */}
      {/* <Rect x="0" y="0" width="300" height="200" fill="#f8f9fa" rx="10" ry="10" /> */}

      {/* Battery Container */}
      <Rect x="75" y="70" width="150" height="80" rx="5" ry="5" fill="#e0e0e0" stroke="#333" strokeWidth="2" />
      <Rect x="225" y="95" width="10" height="30" rx="2" ry="2" fill="#333" />

      {/* Battery Segments */}
      <AnimatedRect
        x="85"
        y="80"
        width="20"
        height="60"
        rx="2"
        ry="2"
        fill={segment1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['#f0f0f0', '#4CAF50'],
        })}
      />
      <AnimatedRect
        x="110"
        y="80"
        width="20"
        height="60"
        rx="2"
        ry="2"
        fill={segment2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['#f0f0f0', '#4CAF50'],
        })}
      />
      <AnimatedRect
        x="135"
        y="80"
        width="20"
        height="60"
        rx="2"
        ry="2"
        fill={segment3Anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['#f0f0f0', '#4CAF50'],
        })}
      />
      <AnimatedRect
        x="160"
        y="80"
        width="20"
        height="60"
        rx="2"
        ry="2"
        fill={segment4Anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['#f0f0f0', '#ff9800'],
        })}
      />
      <AnimatedRect
        x="185"
        y="80"
        width="20"
        height="60"
        rx="2"
        ry="2"
        fill={segment5Anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['#f0f0f0', '#ff9800'],
        })}
      />

      {/* Cycle Arrow */}
      <G transform="translate(150, 40)">
        <Circle cx="0" cy="0" r="25" fill="none" stroke="#555" strokeWidth="2" strokeDasharray="5,3" />

        {/* Charging Arrow (Green) */}
        <AnimatedPath
          d="M-12,-5 L0,-15 L12,-5"
          stroke="#4CAF50"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={chargingArrowOpacity}
        />

        {/* Discharging Arrow (Orange) */}
        <AnimatedPath
          d="M-12,5 L0,15 L12,5"
          stroke="#ff9800"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={dischargingArrowOpacity}
        />

        {/* Moving Arrow */}
        <G
          style={{
            transform: [
              {
                rotate: movingArrowRotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          }}
        >
          <Path d="M0,-25 L5,-15 L-5,-15 Z" fill="#555" />
        </G>
      </G>

      {/* Energy Flow Indicators */}
      {/* Charging Flow */}
      <G>
        {/* Power Source */}
        <Rect x="35" y="95" width="20" height="30" rx="2" ry="2" fill="#4CAF50" opacity="0.7" />

        {/* Flow Lines */}
        <AnimatedLine
          x1="55"
          y1="110"
          x2={chargingFlowX2}
          y2="110"
          stroke="#4CAF50"
          strokeWidth="2"
        />
        <AnimatedLine
          x1="55"
          y1="105"
          x2={chargingFlowX2}
          y2="105"
          stroke="#4CAF50"
          strokeWidth="2"
        />
        <AnimatedLine
          x1="55"
          y1="115"
          x2={chargingFlowX2}
          y2="115"
          stroke="#4CAF50"
          strokeWidth="2"
        />
      </G>

      {/* Discharging Flow */}
      <G>
        {/* Power Consumer */}
        <Rect x="245" y="95" width="20" height="30" rx="2" ry="2" fill="#ff9800" opacity="0.7" />

        {/* Flow Lines */}
        <AnimatedLine
          x1={dischargingFlowX1}
          y1="110"
          x2="245"
          y2="110"
          stroke="#ff9800"
          strokeWidth="2"
        />
        <AnimatedLine
          x1={dischargingFlowX1}
          y1="105"
          x2="245"
          y2="105"
          stroke="#ff9800"
          strokeWidth="2"
        />
        <AnimatedLine
          x1={dischargingFlowX1}
          y1="115"
          x2="245"
          y2="115"
          stroke="#ff9800"
          strokeWidth="2"
        />
      </G>

      {/* Status Indicators */}
      <Text x="150" y="175" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="16" fill="#333">
        
      </Text>

      {/* Cycle Counter */}
      <Text x="250" y="175" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fill="#555">
        
      </Text>

      {/* Battery Percentage */}
      <Text x="50" y="175" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12" fill="#555">
        
      </Text>
    </Svg>
  );
};

export default CycleIcon;