// src/screens/SplashScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      // navigation.replace('Home'); // Descomenta cuando tengas navegación
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        <Text style={styles.white}>Puente</Text>
        <Text style={styles.blue}>Digital</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827', // bg-gray-900
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  white: {
    color: '#FFFFFF',
  },
  blue: {
    color: '#3B82F6', // text-blue-500
  },
});

export default SplashScreen;