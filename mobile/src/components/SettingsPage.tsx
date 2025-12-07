import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, TextInput, Alert } from 'react-native';
import { ChevronRight, Bell, Mail, Calendar, Info, Server, Wifi } from 'lucide-react-native';
import { getServerIp, setServerIp, testServerConnection } from '../services/CloudSync';

interface SettingsPageProps {
  onSync?: () => Promise<void>;
}

interface SettingItemProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  type: 'toggle' | 'link';
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
}

function SettingItem({ icon: Icon, title, subtitle, type, value, onValueChange, onPress }: SettingItemProps) {
  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={type === 'link' ? onPress : undefined}
      activeOpacity={type === 'link' ? 0.7 : 1}
    >
      <View style={styles.row}>
        <View style={styles.iconContainer}>
          <Icon size={20} color="#a855f7" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        {type === 'toggle' ? (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: '#e5e7eb', true: '#8ED7FF' }}
            thumbColor={'white'}
            ios_backgroundColor="#e5e7eb"
          />
        ) : (
          <ChevronRight size={20} color="#9ca3af" />
        )}
      </View>
    </TouchableOpacity>
  );
}

export function SettingsPage({ onSync }: SettingsPageProps) {
  const [notifications, setNotifications] = useState(true);
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const [serverIp, setServerIpState] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'syncing' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Load saved server IP on mount
    getServerIp().then(ip => {
      if (ip) setServerIpState(ip);
    });
  }, []);

  const handleSaveServerIp = async () => {
    if (!serverIp.trim()) {
      Alert.alert('Error', 'Please enter a valid IP address');
      return;
    }
    await setServerIp(serverIp.trim());
    Alert.alert('Saved', `Server IP set to ${serverIp.trim()}`);
  };

  const handleTestConnection = async () => {
    if (!serverIp.trim()) {
      Alert.alert('Error', 'Please enter and save a server IP first');
      return;
    }
    setConnectionStatus('testing');
    await setServerIp(serverIp.trim()); // Save before testing
    const result = await testServerConnection();
    
    if (result.success && onSync) {
      // Automatically sync when connection succeeds
      setConnectionStatus('syncing');
      try {
        await onSync();
        setConnectionStatus('success');
        Alert.alert('Success', 'Connected and synced with server!');
      } catch (e) {
        setConnectionStatus('success');
        Alert.alert('Connected', 'Connected but sync failed.');
      }
    } else {
      setConnectionStatus(result.success ? 'success' : 'error');
      Alert.alert(result.success ? 'Success' : 'Failed', result.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your preferences</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Connection</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Server size={20} color="#a855f7" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Bridge Server IP</Text>
              <Text style={styles.cardSubtitle}>Your computer's local IP address</Text>
            </View>
          </View>
          <TextInput
            style={styles.ipInput}
            placeholder="e.g., 192.168.1.100"
            placeholderTextColor="#9ca3af"
            value={serverIp}
            onChangeText={setServerIpState}
            keyboardType="numeric"
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveServerIp}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.testButton, (connectionStatus === 'testing' || connectionStatus === 'syncing') && styles.buttonDisabled]} 
              onPress={handleTestConnection}
              disabled={connectionStatus === 'testing' || connectionStatus === 'syncing'}
            >
              <Wifi size={16} color="white" />
              <Text style={styles.buttonText}>
                {connectionStatus === 'testing' ? 'Connecting...' : connectionStatus === 'syncing' ? 'Syncing...' : 'Connect'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Sources</Text>
        <SettingItem
          icon={Bell}
          title="Notifications"
          subtitle="System and app notifications"
          type="toggle"
          value={notifications}
          onValueChange={setNotifications}
        />
        <SettingItem
          icon={Mail}
          title="Email"
          subtitle="Gmail integration"
          type="toggle"
          value={email}
          onValueChange={setEmail}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SMS Reminders</Text>
        <SettingItem
          icon={Bell}
          title="Text Reminders"
          subtitle="SMS notifications"
          type="toggle"
          value={sms}
          onValueChange={setSms}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>
        <SettingItem
          icon={Calendar}
          title="Calendar"
          subtitle="Sync with calendar"
          type="toggle"
          value={calendar}
          onValueChange={setCalendar}
        />
        <SettingItem
          icon={Info}
          title="About"
          subtitle="Version 1.0.0"
          type="link"
          onPress={() => {}}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    padding: 24,
    paddingTop: 40,
  },
  header: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 12,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fdf4ff', // fuchsia-50
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  ipInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#B58DFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  testButton: {
    flex: 1,
    backgroundColor: '#8ED7FF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
