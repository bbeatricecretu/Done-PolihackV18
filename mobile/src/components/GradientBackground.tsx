import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

export default function GradientBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Image
        // Placeholder gradient image. 
        // To use a local image: replace source={{ uri: ... }} with source={require('../../assets/your-image.jpg')}
        source={{ uri: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop' }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
    </View>
  );
}
