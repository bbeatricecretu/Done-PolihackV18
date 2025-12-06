import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { ChevronRight, Bell, Mail, Calendar, Info } from 'lucide-react-native';

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
            trackColor={{ false: '#e5e7eb', true: '#f472b6' }}
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

export function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [calendar, setCalendar] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your preferences</Text>
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
});
