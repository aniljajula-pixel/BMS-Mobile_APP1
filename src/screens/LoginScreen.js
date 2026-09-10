import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageBackground,
  ActivityIndicator,
  Alert,
} from 'react-native';
import api from '../Api';
import { AuthContext } from '../../AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useContext(AuthContext);

  const handleSignIn = async () => {
    // Only trim leading and trailing spaces (spaces in middle are kept)
    const cleanedUsername = username.trim();
    const cleanedPassword = password.trim();

    if (!cleanedUsername || !cleanedPassword) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    if (cleanedUsername.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting login with username:', cleanedUsername);

      const response = await api.post('/authenticate', {
        username: cleanedUsername,
        password: cleanedPassword,
      });

      console.log('Login Response received');

      const token = response.data.jwt;

      if (token && typeof token === 'string' && token.length > 0) {
        // Just pass the token - AuthContext will decode it
        await login(token, 'LoginScreen');
        Alert.alert('Success', 'Login successful!');
      } else {
        Alert.alert('Error', 'Authentication failed: Invalid or missing token');
      }
    } catch (error) {
      console.error('Login Error:', error?.response?.data || error.message);

      if (error.response?.status === 401) {
        Alert.alert('Error', 'Invalid credentials');
      } else if (error.request) {
        Alert.alert(
          'Network Error',
          'Cannot connect to server. Please check your internet or server URL.'
        );
      } else {
        Alert.alert('Error', 'Login failed – please try again');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/bg3.jpg')}
      style={styles.background}
    >
      <Text style={styles.versionText}>Version: 1.1.O</Text>

      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Image
          source={require('../../assets/images/maha-removebg-preview.png')}
          style={styles.mahaLogo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.container}>
        <Image
          source={require('../../assets/images/Watermark-removebg-preview.png')}
          style={styles.watermark}
          resizeMode="contain"
        />

        <Text style={styles.footerText}>
          Remote Battery Monitoring & Battery Charger Monitoring System
        </Text>

        <Text style={styles.title}>Login</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#ccc"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#ccc"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 }, 
  versionText: {
    position: 'absolute', 
    bottom: 16,
    alignSelf: 'center',
    color: '#e0e0e0',
    fontSize: 13,
    fontWeight: '400',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
  },
  logoContainer: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',   
    zIndex: 1,
    alignItems: 'center',
  },
  logo: { width: 150, height: 50 },
  mahaLogo: { width: 180, height: 90 },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  watermark: {
    position: 'absolute',
    width: '80%',
    height: '60%',
    opacity: 0.3,
    zIndex: 0,
    top: '30%',
  },
  footerText: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    zIndex: 1,
  },
  input: {
    width: '90%',
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: 'rgba(30, 112, 112, 0.7)',
    color: '#000',
    fontSize: 16,
    zIndex: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: 'rgba(30, 112, 112, 0.7)',
    zIndex: 1,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    color: '#000',
    fontSize: 16,
  },
  eyeIcon: {
    paddingHorizontal: 12,
  },
  button: {
    width: '90%',
    padding: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 123, 255, 0.5)',
    alignItems: 'center',
    marginTop: 8,
    zIndex: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});