import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Plus, Settings } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface HomePageProps {
  onNavigate: (page: 'settings') => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <View style={styles.container}>
      {/* Animated mesh gradient background simulation */}
      <View style={styles.backgroundContainer}>
        <View style={[styles.orb, styles.orb1]} />
        <View style={[styles.orb, styles.orb2]} />
        <View style={[styles.orb, styles.orb3]} />
        <View style={[styles.orb, styles.orb4]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.greeting}>Hello,</Text>
            <TouchableOpacity 
              onPress={() => onNavigate('settings')}
              style={styles.settingsButton}
            >
              <Settings size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>
          <Text style={styles.dateDisplay}>6 Dec</Text>
        </View>

        {/* Tasks Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Let's do</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Review meeting notes</Text>
              <Text style={styles.timeText}>10:00 AM</Text>
            </View>
            
            <Text style={styles.cardDescription}>
              Review the notes from yesterday's team sync regarding the Q4 roadmap.
            </Text>
            
            <View style={styles.cardFooter}>
              <View style={styles.metaContainer}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>#Work</Text>
                </View>
                <Text style={styles.dueText}>Due in 2 days</Text>
              </View>
              
              <TouchableOpacity style={styles.doneButton}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // slate-50
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.5,
  },
  orb1: {
    top: -50,
    left: -50,
    width: 300,
    height: 300,
    backgroundColor: '#e0f2fe', // sky-100
  },
  orb2: {
    top: 100,
    right: -50,
    width: 300,
    height: 300,
    backgroundColor: '#ccfbf1', // teal-100
  },
  orb3: {
    bottom: 0,
    left: 50,
    width: 300,
    height: 300,
    backgroundColor: '#ffe4e6', // rose-100
  },
  orb4: {
    top: '40%',
    left: '30%',
    width: 250,
    height: 250,
    backgroundColor: '#f3e8ff', // purple-100
    opacity: 0.4,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 48,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 48,
    fontWeight: '300',
    color: '#1f2937',
    fontFamily: 'System', // Trying to get a lighter, cleaner look
    marginBottom: 8,
  },
  dateDisplay: {
    fontSize: 56,
    fontWeight: '400',
    color: '#1f2937',
    fontFamily: 'System',
  },
  settingsButton: {
    padding: 8,
    marginTop: 8,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: '#1f2937',
    marginBottom: 16,
    fontFamily: 'System',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937', // Adding a border to match the sketch style
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 }, // Offset shadow for sketch feel
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 16,
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 24,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  metaContainer: {
    flex: 1,
  },
  tag: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  dueText: {
    fontSize: 14,
    color: '#1f2937',
  },
  doneButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
});
