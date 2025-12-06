import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Plus } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export function HomePage() {
  return (
    <View style={styles.container}>
      {/* Animated mesh gradient background simulation */}
      <View style={styles.backgroundContainer}>
        <View style={[styles.orb, styles.orb1]} />
        <View style={[styles.orb, styles.orb2]} />
        <View style={[styles.orb, styles.orb3]} />
        <View style={[styles.orb, styles.orb4]} />
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Memento</Text>
          <Text style={styles.subtitle}>Your memories, organized</Text>
        </View>

        {/* Add new memento button */}
        <View style={styles.addButtonContainer}>
          <TouchableOpacity style={styles.addButton}>
            <Plus size={24} color="#a78bfa" />
            <Text style={styles.addButtonText}>Add New Memento</Text>
          </TouchableOpacity>
        </View>

        {/* Single recent memento */}
        <View style={styles.recentContainer}>
          <Text style={styles.sectionTitle}>Recent</Text>
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Review meeting notes</Text>
                <Text style={styles.cardDescription}>From yesterday's team sync</Text>
                <View style={styles.tagsContainer}>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>Work</Text>
                  </View>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.dueText}>Due in 2 days</Text>
                </View>
              </View>
            </View>
            <Text style={styles.timeText}>2 hours ago</Text>
          </TouchableOpacity>
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
    paddingTop: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937', // gray-800
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280', // gray-500
  },
  addButtonContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  recentContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#f0fdfa', // teal-50
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
    color: '#0d9488', // teal-600
  },
  dot: {
    marginHorizontal: 8,
    color: '#9ca3af',
    fontSize: 12,
  },
  dueText: {
    fontSize: 12,
    color: '#fb7185', // rose-400
  },
  timeText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },
});
