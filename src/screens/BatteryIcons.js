import React from 'react';
import Svg, { Rect, Path, G, Circle, Line, Polygon, Ellipse, Defs, RadialGradient, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, withRepeat, Easing } from 'react-native-reanimated';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedLine = Animated.createAnimatedComponent(Line);

export const CommunicationFailed = () => {
  const rect1Opacity = useSharedValue(0.3);
  const rect2Opacity = useSharedValue(0.3);
  const rect3Opacity = useSharedValue(0.3);
  const pathOpacity = useSharedValue(1);

  React.useEffect(() => {
    rect1Opacity.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1, true);
    rect2Opacity.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear, delay: 200 }), -1, true);
    rect3Opacity.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear, delay: 400 }), -1, true);
    pathOpacity.value = withRepeat(withTiming(0.5, { duration: 1000, easing: Easing.linear }), -1, true);
  }, []);

  const animatedRect1Props = useAnimatedProps(() => ({ opacity: rect1Opacity.value }));
  const animatedRect2Props = useAnimatedProps(() => ({ opacity: rect2Opacity.value }));
  const animatedRect3Props = useAnimatedProps(() => ({ opacity: rect3Opacity.value }));
  const animatedPathProps = useAnimatedProps(() => ({ strokeOpacity: pathOpacity.value }));

  return (
    <Svg viewBox="0 0 100 60" style={{ width: 40, height: 40 }}>
      <G transform="translate(10,10) scale(0.8)">
        {/* Battery outline */}
        <Rect x="0" y="0" width="100" height="60" rx="8" fill="none" stroke="white" strokeWidth="3" />
        {/* Battery terminal */}
        <Rect x="100" y="20" width="8" height="20" fill="none" stroke="white" strokeWidth="3" />
        
        {/* Signal bars inside the battery */}
        <G transform="translate(15,10)">
          <AnimatedRect x="0" y="30" width="8" height="20" fill="white" animatedProps={animatedRect1Props} />
          <AnimatedRect x="15" y="25" width="8" height="25" fill="white" animatedProps={animatedRect2Props} />
          <AnimatedRect x="30" y="20" width="8" height="30" fill="white" animatedProps={animatedRect3Props} />
        </G>
        
        {/* Red X indicating failure */}
        <AnimatedPath
          d="M50,20 L70,40 M70,20 L50,40"
          stroke="rgb(255, 0, 0)"
          strokeWidth="6"
          animatedProps={animatedPathProps}
        />
      </G>
    </Svg>
  );
};


export const OpenBattery = () => {
  const outlineOpacity = useSharedValue(1);
  const terminalOpacity = useSharedValue(1);
  const triangleOpacity = useSharedValue(0.8);

  React.useEffect(() => {
    outlineOpacity.value = withRepeat(withTiming(0.3, { duration: 800, easing: Easing.linear }), -1, true);
    terminalOpacity.value = withRepeat(withTiming(0.3, { duration: 800, easing: Easing.linear }), -1, true);
    triangleOpacity.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1, true);
  }, []);

  const animatedOutlineProps = useAnimatedProps(() => ({ opacity: outlineOpacity.value }));
  const animatedTerminalProps = useAnimatedProps(() => ({ opacity: terminalOpacity.value }));
  const animatedTriangleProps = useAnimatedProps(() => ({ opacity: triangleOpacity.value }));

  return (
    <Svg viewBox="0 0 100 60" style={{ width: 40, height: 40 }}>
      <G transform="translate(10,10) scale(0.8)">
        <AnimatedRect
          x="0"
          y="0"
          width="100"
          height="60"
          fill="none"
          stroke="#D4A017"
          strokeWidth="3"
          rx="5"
          animatedProps={animatedOutlineProps}
        />
        <AnimatedRect
          x="100"
          y="20"
          width="8"
          height="20"
          fill="none"
          stroke="#D4A017"
          strokeWidth="3"
          rx="2"
          animatedProps={animatedTerminalProps}
        />
        <Rect x="8" y="8" width="12" height="44" fill="#D4A017" stroke="#FAFA33" strokeWidth="1" opacity="0.9" />
        <Rect x="24" y="8" width="12" height="44" fill="#D4A017" stroke="#FAFA33" strokeWidth="1" opacity="0.9" />
        <Rect x="40" y="8" width="12" height="44" fill="#D4A017" stroke="#FAFA33" strokeWidth="1" opacity="0.9" />
        <G transform="translate(50,30)">
          <AnimatedPath
            d="M-20,15 L20,15 L0,-15 Z"
            fill="#FF0000"
            stroke="#FF0000"
            strokeWidth="4"
            animatedProps={animatedTriangleProps}
          />
          <Line x1="0" y1="6" x2="0" y2="-6" stroke="#D4A017" strokeWidth="5" strokeLinecap="round" />
          <Circle cx="0" cy="9" r="3" fill="#D4A017" />
        </G>
      </G>
    </Svg>
  );
};
export const HighTemperature = () => {
  const strokeColor = useSharedValue('#E53935');
  const bulbFill = useSharedValue('#E53935');
  const liquidHeight = useSharedValue(20);
  const liquidY = useSharedValue(15);
  const liquidFill = useSharedValue('#E53935');
  const flameSize = useSharedValue(1);
  const flameFill = useSharedValue('#FF5722');
  const heatWave1Y1 = useSharedValue(12);
  const heatWave1Y2 = useSharedValue(18);
  const heatWave2Y1 = useSharedValue(5);
  const heatWave2Y2 = useSharedValue(11);
  const glowOpacity = useSharedValue(0.2);

  React.useEffect(() => {
    strokeColor.value = withRepeat(
      withTiming('#FF1744', { duration: 500, easing: Easing.linear }, () =>
        withTiming('#E53935', { duration: 500, easing: Easing.linear })
      ),
      -1
    );
    bulbFill.value = withRepeat(
      withTiming('#FF1744', { duration: 500, easing: Easing.linear }, () =>
        withTiming('#FF5722', { duration: 500, easing: Easing.linear }, () =>
          withTiming('#E53935', { duration: 500, easing: Easing.linear })
        )
      ),
      -1
    );
    liquidHeight.value = withRepeat(withTiming(28, { duration: 1000, easing: Easing.linear }), -1, true);
    liquidY.value = withRepeat(withTiming(7, { duration: 1000, easing: Easing.linear }), -1, true);
    liquidFill.value = withRepeat(
      withTiming('#FF1744', { duration: 500, easing: Easing.linear }, () =>
        withTiming('#FF5722', { duration: 500, easing: Easing.linear }, () =>
          withTiming('#E53935', { duration: 500, easing: Easing.linear })
        )
      ),
      -1
    );
    flameSize.value = withRepeat(withTiming(1.2, { duration: 600, easing: Easing.linear }), -1, true);
    flameFill.value = withRepeat(
      withTiming('#FF1744', { duration: 400, easing: Easing.linear }, () =>
        withTiming('#E53935', { duration: 400, easing: Easing.linear }, () =>
          withTiming('#FF5722', { duration: 400, easing: Easing.linear })
        )
      ),
      -1
    );
    heatWave1Y1.value = withRepeat(withTiming(18, { duration: 400, easing: Easing.linear }), -1, true);
    heatWave1Y2.value = withRepeat(withTiming(12, { duration: 400, easing: Easing.linear }), -1, true);
    heatWave2Y1.value = withRepeat(withTiming(11, { duration: 500, easing: Easing.linear }), -1, true);
    heatWave2Y2.value = withRepeat(withTiming(5, { duration: 500, easing: Easing.linear }), -1, true);
    glowOpacity.value = withRepeat(withTiming(0.8, { duration: 1500, easing: Easing.linear }), -1, true);
  }, []);

  const animatedStrokeProps = useAnimatedProps(() => ({ stroke: strokeColor.value }));  
  const animatedBulbProps = useAnimatedProps(() => ({ fill: bulbFill.value }));
  const animatedLiquidProps = useAnimatedProps(() => ({
    height: liquidHeight.value,
    y: liquidY.value,
    fill: liquidFill.value, 
  }));
  const animatedFlameProps = useAnimatedProps(() => ({
    transform: [{ scale: flameSize.value }],
    fill: flameFill.value,
  }));
  const animatedHeatWave1Props = useAnimatedProps(() => ({
    d: `M -8 15 Q -5 ${heatWave1Y1.value} -2 15 Q 1 ${heatWave1Y2.value} 4 15`,
  }));
  const animatedHeatWave2Props = useAnimatedProps(() => ({
    d: `M -8 8 Q -5 ${heatWave2Y1.value} -2 8 Q 1 ${heatWave2Y2.value} 4 8`,
  }));
  const animatedGlowProps = useAnimatedProps(() => ({ opacity: glowOpacity.value }));

  return (
    <Svg viewBox="0 0 100 60" style={{ width: 40, height: 40 }}>
      <G transform="translate(10,10) scale(0.8)">
        <AnimatedRect
          x="0"
          y="0"
          width="100"
          height="60"
          rx="8"
          fill="none"
          strokeWidth="3"
          animatedProps={animatedStrokeProps}
        />
        <AnimatedRect
          x="100"
          y="20"
          width="8"
          height="20"
          fill="none"
          strokeWidth="3" 
          animatedProps={animatedStrokeProps}
        />
        <G transform="translate(25, 10)">  
          <AnimatedCircle
            cx="8"
            cy="35"
            r="8"
            stroke="#FF1744"
            strokeWidth="2"
            animatedProps={animatedBulbProps}
          />
          <Rect x="5" y="7" width="6" height="28" rx="3" fill="#333333" stroke="#FF1744" strokeWidth="2" />
          <AnimatedRect
            x="6.5"
            y="10"
            width="3"
            height="25"
            rx="1.5"
            animatedProps={animatedLiquidProps}
          />
          <Line x1="14" y1="12" x2="11" y2="12" stroke="#FF1744" strokeWidth="1.5" />
          <Line x1="14" y1="20" x2="11" y2="20" stroke="#FF1744" strokeWidth="1.5" />
          <Line x1="14" y1="28" x2="11" y2="28" stroke="#FF1744" strokeWidth="1.5" />
        </G>
        <G transform="translate(60, 10)">
          <AnimatedPath
            d="M-12,-7 Q-10,-12 -7,-10 Q-4,-15 0,-12 Q2,-15 7,-12 Q10,-15 12,-10 Q15,-12 17,-7 Q12,-4 7,-7 Q2,-2 0,-5 Q-2,-2 -7,-5 Q-10,-4 -12,-7 Z"
            animatedProps={animatedFlameProps}
          />
          <G opacity="0.7">
            <AnimatedPath
              stroke="#FF5722"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              animatedProps={animatedHeatWave1Props}
            />
            <AnimatedPath
              stroke="#FF1744"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              animatedProps={animatedHeatWave2Props}
            />
          </G>
        </G>
        <AnimatedRect
          x="-2"
          y="-2"
          width="104"
          height="64"
          rx="10"
          fill="none"
          stroke="#FF1744"
          strokeWidth="1"
          animatedProps={animatedGlowProps}
        />
      </G>
    </Svg>
  );
};

export const BatteryLowVoltage = () => {
  const strokeOpacity = useSharedValue(1);
  const fillOpacity = useSharedValue(1);

  React.useEffect(() => {
    strokeOpacity.value = withRepeat(withTiming(0.3, { duration: 2000, easing: Easing.linear }), -1, true);
    fillOpacity.value = withRepeat(withTiming(0.3, { duration: 2000, easing: Easing.linear }), -1, true);
  }, []);

  const animatedStrokeProps = useAnimatedProps(() => ({ strokeOpacity: strokeOpacity.value }));
  const animatedFillProps = useAnimatedProps(() => ({ fillOpacity: fillOpacity.value }));

  return (
    <Svg viewBox="0 0 100 60" style={{ width: 40, height: 40 }}>
      <G transform="translate(10,10) scale(0.8)">
        <AnimatedRect x="0" y="0" width="100" height="60" rx="8" fill="none" stroke="#FF0000" strokeWidth="3" animatedProps={animatedStrokeProps} />
        <AnimatedRect x="100" y="20" width="8" height="20" fill="none" stroke="#FF0000" strokeWidth="3" animatedProps={animatedStrokeProps} />
        <AnimatedRect x="5" y="5" width="20" height="50" rx="6" fill="#FF0000" animatedProps={animatedFillProps} />
      </G>
    </Svg>
  );
};

export const AboutToDie = () => {
  const strokeOpacity = useSharedValue(1);
  const fillOpacity = useSharedValue(1);

  React.useEffect(() => {
    strokeOpacity.value = withRepeat(withTiming(0.3, { duration: 500, easing: Easing.linear }), -1, true);
    fillOpacity.value = withRepeat(withTiming(0.3, { duration: 500, easing: Easing.linear }), -1, true);
  }, []);

  const animatedStrokeProps = useAnimatedProps(() => ({ strokeOpacity: strokeOpacity.value }));
  const animatedFillProps = useAnimatedProps(() => ({ fillOpacity: fillOpacity.value }));

  return (
    <Svg viewBox="0 0 100 60" style={{ width: 40, height: 40 }}>
      <G transform="translate(10,10) scale(0.8)">
        <AnimatedRect x="0" y="0" width="100" height="60" rx="8" fill="none" stroke="#C62828" strokeWidth="3" animatedProps={animatedStrokeProps} />
        <Rect x="100" y="20" width="8" height="20" fill="none" stroke="#C62828" strokeWidth="3" />
        <AnimatedRect x="5" y="5" width="15" height="50" rx="6" fill="#FF0000" animatedProps={animatedFillProps} />
        <AnimatedPath d="M40,15 L50,35 L30,35 Z" fill="#C62828" animatedProps={animatedFillProps} />
        <Circle cx="40" cy="31" r="2" fill="#FFEBEE" />
      </G>
    </Svg>
  );
};

export const HighVoltage = () => {
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withRepeat(withTiming(2, { duration: 200, easing: Easing.linear }), -1, true);
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Svg viewBox="0 0 100 60" style={{ width: 40, height: 40 }}>
      <G transform="translate(10,10) scale(0.8)">
        <Defs>
          <RadialGradient id="highVoltageGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#F57F17" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#F57F17" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="60" rx="8" fill="url(#highVoltageGradient)" />
        <Rect x="0" y="0" width="100" height="60" rx="8" fill="none" stroke="#F57F17" strokeWidth="3" />
        <Rect x="100" y="20" width="8" height="20" fill="none" stroke="#F57F17" strokeWidth="3" />
        <AnimatedPath
          d="M45,10 L55,10 L50,25 L60,25 L40,50 L45,35 L35,35 Z"
          fill="#F57F17"
          animatedProps={animatedProps}
        />
      </G>
    </Svg>
  );
};

export const Charging = () => {
  const width = useSharedValue(20);
  const strokeOpacity = useSharedValue(0.3);

  React.useEffect(() => {
    width.value = withRepeat(
      withTiming(70, { duration: 3000, easing: Easing.linear }), 
      -1, 
      false
    );
    strokeOpacity.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }), 
      -1, 
      true
    );
  }, []);

  const animatedFillProps = useAnimatedProps(() => ({ 
    width: width.value 
  }));
  
  const animatedStrokeProps = useAnimatedProps(() => ({ 
    strokeOpacity: strokeOpacity.value 
  }));

  return (
    <Svg viewBox="0 0 100 60" style={{ width: 40, height: 40 }}>
      <G transform="translate(10,10) scale(0.8)">
        {/* Battery outline */}
        <AnimatedRect 
          x="0" 
          y="0" 
          width="100" 
          height="60" 
          rx="8" 
          fill="none" 
          stroke="#2E7D32" 
          strokeWidth="3" 
          animatedProps={animatedStrokeProps} 
        />
        {/* Battery terminal */}
        <AnimatedRect 
          x="100" 
          y="20" 
          width="8" 
          height="20" 
          fill="none" 
          stroke="#2E7D32" 
          strokeWidth="3" 
          animatedProps={animatedStrokeProps} 
        />
        {/* Battery fill - animates from 20 to 70 width */}
        <AnimatedRect 
          x="5" 
          y="5" 
          height="50" 
          rx="6" 
          fill="#4CAF50" 
          animatedProps={animatedFillProps} 
        />
      </G>
    </Svg>
  );
};

export const Discharging = () => {
  const width = useSharedValue(70);
  const strokeOpacity = useSharedValue(1);

  React.useEffect(() => {
    width.value = withRepeat(
      withTiming(20, { duration: 3000, easing: Easing.linear }), 
      -1, 
      false
    );
    strokeOpacity.value = withRepeat(
      withTiming(0.3, { duration: 2000, easing: Easing.linear }), 
      -1, 
      true
    );
  }, []);

  const animatedFillProps = useAnimatedProps(() => ({ 
    width: width.value 
  }));
  
  const animatedStrokeProps = useAnimatedProps(() => ({ 
    strokeOpacity: strokeOpacity.value 
  }));

  return (
    <Svg viewBox="0 0 100 60" style={{ width: 40, height: 40 }}>
      <G transform="translate(10,10) scale(0.8)">
        {/* Battery outline */}
        <AnimatedRect 
          x="0" 
          y="0" 
          width="100" 
          height="60" 
          rx="8" 
          fill="none" 
          stroke="#C62828" 
          strokeWidth="3" 
          animatedProps={animatedStrokeProps} 
        />
        {/* Battery terminal */}
        <AnimatedRect 
          x="100" 
          y="20" 
          width="8" 
          height="20" 
          fill="none" 
          stroke="#C62828" 
          strokeWidth="3" 
          animatedProps={animatedStrokeProps} 
        />
        {/* Battery fill - animates from 70 to 20 width */}
        <AnimatedRect 
          x="5" 
          y="5" 
          height="50" 
          rx="6" 
          fill="#FF5252" 
          animatedProps={animatedFillProps} 
        />
      </G>
    </Svg>
  );
};