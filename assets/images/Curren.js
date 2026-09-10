import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Path, Polygon, Defs, LinearGradient, Stop, G, Text as SvgText } from 'react-native-svg';

const CurrentIcon = ({ isHighCurrent = false }) => {
  const sparkOpacityAnim = useRef(new Animated.Value(1)).current;
  const particle1OpacityAnim = useRef(new Animated.Value(0.8)).current;
  const particle1TranslateXAnim = useRef(new Animated.Value(0)).current;
  const particle2OpacityAnim = useRef(new Animated.Value(0.3)).current;
  const particle2TranslateXAnim = useRef(new Animated.Value(0)).current;
  const particle3OpacityAnim = useRef(new Animated.Value(0.5)).current;
  const particle3TranslateXAnim = useRef(new Animated.Value(0)).current;
  const indicatorOpacityAnim = useRef(new Animated.Value(0.8)).current;
  const arcOpacityAnim1 = useRef(new Animated.Value(0.9)).current;
  const arcOpacityAnim2 = useRef(new Animated.Value(0.4)).current;
  const arcOpacityAnim3 = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Spark animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkOpacityAnim, {
          toValue: isHighCurrent ? 0.5 : 0.7,
          duration: isHighCurrent ? 1000 : 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(sparkOpacityAnim, {
          toValue: 1,
          duration: isHighCurrent ? 1000 : 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();

    // Particle 1 animation
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(particle1OpacityAnim, {
            toValue: isHighCurrent ? 0.2 : 0.3,
            duration: isHighCurrent ? 800 : 1500,
            useNativeDriver: true,
          }),
          Animated.timing(particle1TranslateXAnim, {
            toValue: isHighCurrent ? 3.5 : 2.1,
            duration: isHighCurrent ? 800 : 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(particle1OpacityAnim, {
            toValue: isHighCurrent ? 0.9 : 0.8,
            duration: isHighCurrent ? 800 : 1500,
            useNativeDriver: true,
          }),
          Animated.timing(particle1TranslateXAnim, {
            toValue: 0,
            duration: isHighCurrent ? 800 : 1500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Particle 2 animation (delayed)
    Animated.loop(
      Animated.sequence([
        Animated.delay(isHighCurrent ? 300 : 500),
        Animated.parallel([
          Animated.timing(particle2OpacityAnim, {
            toValue: isHighCurrent ? 0.9 : 0.8,
            duration: isHighCurrent ? 800 : 1500,
            useNativeDriver: true,
          }),
          Animated.timing(particle2TranslateXAnim, {
            toValue: isHighCurrent ? -2.8 : -1.4,
            duration: isHighCurrent ? 800 : 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(particle2OpacityAnim, {
            toValue: isHighCurrent ? 0.2 : 0.3,
            duration: isHighCurrent ? 800 : 1500,
            useNativeDriver: true,
          }),
          Animated.timing(particle2TranslateXAnim, {
            toValue: 0,
            duration: isHighCurrent ? 800 : 1500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Particle 3 animation (more delayed)
    Animated.loop(
      Animated.sequence([
        Animated.delay(isHighCurrent ? 600 : 1000),
        Animated.parallel([
          Animated.timing(particle3OpacityAnim, {
            toValue: isHighCurrent ? 1 : 0.9,
            duration: isHighCurrent ? 800 : 1500,
            useNativeDriver: true,
          }),
          Animated.timing(particle3TranslateXAnim, {
            toValue: isHighCurrent ? 2.8 : 1.4,
            duration: isHighCurrent ? 800 : 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(particle3OpacityAnim, {
            toValue: isHighCurrent ? 0.5 : 0.5,
            duration: isHighCurrent ? 800 : 1500,
            useNativeDriver: true,
          }),
          Animated.timing(particle3TranslateXAnim, {
            toValue: 0,
            duration: isHighCurrent ? 800 : 1500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Indicator animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(indicatorOpacityAnim, {
          toValue: isHighCurrent ? 0.4 : 0.5,
          duration: isHighCurrent ? 1000 : 2000,
          useNativeDriver: true,
        }),
        Animated.timing(indicatorOpacityAnim, {
          toValue: 0.8,
          duration: isHighCurrent ? 1000 : 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    if (isHighCurrent) {
      // Arc animations for high current
      Animated.loop(
        Animated.sequence([
          Animated.timing(arcOpacityAnim1, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(arcOpacityAnim1, {
            toValue: 0.9,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(arcOpacityAnim2, {
            toValue: 0.9,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(arcOpacityAnim2, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(arcOpacityAnim3, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(arcOpacityAnim3, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isHighCurrent]);

  const AnimatedPath = Animated.createAnimatedComponent(Path);
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);
  const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
  const AnimatedG = Animated.createAnimatedComponent(G);

  return (
    <Svg width="42" height="70" viewBox="0 0 42 70">
      <Defs>
        <LinearGradient id={isHighCurrent ? "highSparkGradient" : "normalSparkGradient"} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={isHighCurrent ? "#ff4040" : "#00ff00"} />
          <Stop offset="100%" stopColor={isHighCurrent ? "#ff4040" : "#00ff00"} />
        </LinearGradient>
      </Defs>

      {/* Main Spark/Lightning Bolt */}
      <AnimatedPath
        d="M24.5 14 L17.5 31.5 L22.4 31.5 L14 49 L28 28 L22.4 28 L31.5 14 Z"
        fill={`url(#${isHighCurrent ? "highSparkGradient" : "normalSparkGradient"})`}
        stroke={isHighCurrent ? "#ff4040" : "#00ff00"}
        strokeWidth={isHighCurrent ? 1.4 : 1.05}
        opacity={sparkOpacityAnim}
      />

      {/* Electric Particles */}
      <G>
        <AnimatedCircle
          cx="10.5"
          cy="24.5"
          r={isHighCurrent ? 1.75 : 1.4}
          fill={isHighCurrent ? "#ff4040" : "#00ff00"}
          opacity={particle1OpacityAnim}
          transform={[{ translateX: particle1TranslateXAnim }]}
        />
        <AnimatedCircle
          cx="33.6"
          cy="38.5"
          r={isHighCurrent ? 1.4 : 1.05}
          fill={isHighCurrent ? "#ff4040" : "#00ff00"}
          opacity={particle2OpacityAnim}
          transform={[{ translateX: particle2TranslateXAnim }]}
        />
        <AnimatedCircle
          cx="8.4"
          cy="42"
          r={isHighCurrent ? 1.05 : 0.7}
          fill={isHighCurrent ? "#ff4040" : "#00ff00"}
          opacity={particle3OpacityAnim}
          transform={[{ translateX: particle3TranslateXAnim }]}
        />
      </G>

      {isHighCurrent ? (
        <>
          {/* High Current Electric Arcs */}
          <G stroke="#fbbf24" strokeWidth="1.4" fill="none">
            <AnimatedPath
              d="M7 21 Q5.6 24.5 7 28"
              opacity={arcOpacityAnim1}
            />
            <AnimatedPath
              d="M35 35 Q36.4 38.5 35 42"
              opacity={arcOpacityAnim2}
            />
            <AnimatedPath
              d="M5.6 35 Q4.2 31.5 5.6 28"
              opacity={arcOpacityAnim3}
            />
          </G>

          {/* Warning Triangle for High Current */}
          <AnimatedPolygon
            points="21,5.6 17.5,1.4 24.5,1.4"
            fill="#f59e0b"
            stroke="#d97706"
            strokeWidth="0.7"
            opacity={indicatorOpacityAnim}
          />
          <SvgText
            x="21"
            y="4.95"
            textAnchor="middle"
            fontFamily="Arial, sans-serif"
            fontSize="4"
            fill="#fff"
            fontWeight="bold"
          >
            !
          </SvgText>

          {/* Current Label */}
          <SvgText
            x="21"
            y="65"
            fontFamily="Arial, sans-serif"
            fontSize="8"
            fill="#ff4040"
            textAnchor="middle"
            fontWeight="bold"
          >
            HIGH
          </SvgText>
        </>
      ) : (
        <>
          {/* Normal Current Indicator */}
          <AnimatedCircle
            cx="21"
            cy="7"
            r="4"
            fill="#00ff00"
            opacity={indicatorOpacityAnim}
          />

          {/* Checkmark for Normal */}
          <Path
            d="M18.9 5.6 L20.3 7.7 L23.1 4"
            stroke="#ffffff"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />

          {/* Current Label */}
          <SvgText
            x="21"
            y="65"
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

export default CurrentIcon;