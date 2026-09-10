import React from 'react';
import Svg, { Circle, G, Path, Rect, Text } from 'react-native-svg';
import { Animated, Easing } from 'react-native';

const SOCIcon = () => {
  const dashOffsetAnim = new Animated.Value(440);

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(dashOffsetAnim, {
        toValue: 0,
        duration: 5000,
        useNativeDriver: false,
        easing: Easing.linear,
      })
    ).start();
  }, []);

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <Svg width="30" height="30" viewBox="0 0 200 200">
      <G transform="translate(10,10)">
        {/* Background Circle */}
        <Circle cx="100" cy="100" r="80" fill="#f0f0f0" stroke="#ddd" strokeWidth="1" />
        
        {/* Charging Progress Circle */}
        <AnimatedCircle
          cx="100"
          cy="100"
          r="70"
          fill="none"
          stroke="#4CAF50"
          strokeWidth="12"
          strokeDasharray="440"
          strokeDashoffset={dashOffsetAnim}
          transform="rotate(-90 100 100)"
        />
        
        {/* Battery Icon */}
        <G transform="translate(70, 70) scale(0.6)">
          <Rect x="30" y="40" width="70" height="40" rx="5" ry="5" fill="none" stroke="#333" strokeWidth="4" />
          <Rect x="100" y="50" width="10" height="20" rx="2" ry="2" fill="#333" />
        </G>

        {/* Percentage Text */}
        <Text x="100" y="105" textAnchor="middle" fontFamily="Arial" fontSize="24" fontWeight="bold" fill="#333">
          
        </Text>
        
        {/* Status Text */}
        <Text x="100" y="150" textAnchor="middle" fontFamily="Arial" fontSize="14" fill="#555">
          
        </Text>
      </G>
    </Svg>
  );
};

export default SOCIcon;
