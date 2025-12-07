import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";

interface BlobBackgroundProps {
  opacity?: number;
  flipColors?: boolean;
}

export default function BlobBackground({ opacity = 0.9, flipColors = false }: BlobBackgroundProps) {
  return (
    <View style={styles.container}>
      <Svg height="100%" width="100%">
        <Defs>
          {/* Blue → Transparent */}
          <RadialGradient id="blobBlue" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#8ED7FF" stopOpacity={opacity} />
            <Stop offset="100%" stopColor="#8ED7FF" stopOpacity="0" />
          </RadialGradient>

          {/* Lilac → Transparent */}
          <RadialGradient id="blobLilac" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#B58DFF" stopOpacity={opacity} />
            <Stop offset="100%" stopColor="#B58DFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Big glowing blob 1 (Top Left) */}
        <Circle 
          cx="-200" 
          cy="200" 
          r="450" 
          fill={flipColors ? "url(#blobLilac)" : "url(#blobBlue)"} 
        />

        {/* Big glowing blob 2 (Bottom Right) */}
        <Circle 
          cx="500" 
          cy="600" 
          r="450" 
          fill={flipColors ? "url(#blobBlue)" : "url(#blobLilac)"} 
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
