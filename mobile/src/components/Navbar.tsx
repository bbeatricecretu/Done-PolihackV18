import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Home, MessageCircle, CheckSquare } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface NavbarProps {
  currentPage: 'home' | 'chat' | 'tasks' | 'settings';
  onPageChange: (page: 'home' | 'chat' | 'tasks' | 'settings') => void;
}

export function Navbar({ currentPage, onPageChange }: NavbarProps) {
  const navItems = [
    { id: 'chat' as const, icon: MessageCircle, label: 'Chat' },
    { id: 'home' as const, icon: Home, label: 'Home' },
    { id: 'tasks' as const, icon: CheckSquare, label: 'Tasks' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onPageChange(item.id)}
              style={[styles.button, isActive && styles.activeButton]}
            >
              {isActive ? (
                <LinearGradient
                  colors={['#fda4af', '#f9a8d4', '#c4b5fd']} // rose-300, pink-300, violet-300
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.activeBackground}
                >
                  <Icon size={24} color="white" strokeWidth={2.5} />
                </LinearGradient>
              ) : (
                <View style={styles.inactiveBackground}>
                  <Icon size={24} color="#9ca3af" strokeWidth={2.5} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 48,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButton: {
    transform: [{ scale: 1.1 }],
  },
  activeBackground: {
    padding: 12,
    borderRadius: 16,
  },
  inactiveBackground: {
    padding: 12,
  },
});
