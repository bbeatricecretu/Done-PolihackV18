import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { ChevronRight, Bell, Moon, Shield, LogOut } from 'lucide-react-native';

export function SettingsPage() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#e0f2fe' }]}>
              <Bell size={20} color="#0284c7" />
            </View>
            <Text style={styles.rowLabel}>Notifications</Text>
          </View>
          <Switch value={true} trackColor={{ false: '#e5e7eb', true: '#a78bfa' }} />
        </View>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#f3e8ff' }]}>
              <Moon size={20} color="#7c3aed" />
            </View>
            <Text style={styles.rowLabel}>Dark Mode</Text>
          </View>
          <Switch value={false} trackColor={{ false: '#e5e7eb', true: '#a78bfa' }} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#dcfce7' }]}>
              <Shield size={20} color="#16a34a" />
            </View>
            <Text style={styles.rowLabel}>Privacy & Security</Text>
          </View>
          <ChevronRight size={20} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
              <LogOut size={20} color="#dc2626" />
            </View>
            <Text style={[styles.rowLabel, { color: '#dc2626' }]}>Log Out</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    padding: 8,
    borderRadius: 10,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
});
