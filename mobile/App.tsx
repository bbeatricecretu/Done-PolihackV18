import React, { useState, useEffect } from 'react';
import { StyleSheet, View, StatusBar, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Navbar } from './src/components/Navbar';
import { HomePage } from './src/components/HomePage';
import { ChatBoxPage } from './src/components/ChatBoxPage';
import { TasksPage } from './src/components/TasksPage';
import { SettingsPage } from './src/components/SettingsPage';
import { LinearGradient } from 'expo-linear-gradient';
import { notificationListener } from './src/services/NotificationListener';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'chat' | 'tasks' | 'settings'>('home');

  // Initialize notification listener on app start
  useEffect(() => {
    const initNotifications = async () => {
      console.log('[App] Initializing notification listener...');
      const success = await notificationListener.initialize();
      
      if (success) {
        console.log('[App] ✓ Notification listener active');
        Alert.alert(
          'Notification Access Enabled',
          'Memento will now learn from your notifications to create smart tasks.',
          [{ text: 'Got it' }]
        );
      } else {
        console.log('[App] ✗ Notification listener failed to initialize');
        Alert.alert(
          'Notification Access Required',
          'Please grant notification permissions in Settings to use Memento\'s smart task creation.',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // TODO: Open app settings
            }}
          ]
        );
      }
    };

    initNotifications();

    // Cleanup on unmount
    return () => {
      notificationListener.stopListening();
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={(page) => setCurrentPage(page)} />;
      case 'chat':
        return <ChatBoxPage />;
      case 'tasks':
        return <TasksPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <SafeAreaProvider>
      <LinearGradient
        colors={['#eff6ff', '#f5f3ff', '#fdf2f8']} // blue-50, purple-50, pink-50
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <StatusBar barStyle="dark-content" />
          
          {/* Page content */}
          <View style={styles.content}>
            {renderPage()}
          </View>
          
          {/* Bottom navbar */}
          <Navbar currentPage={currentPage} onPageChange={setCurrentPage} />
        </SafeAreaView>
      </LinearGradient>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
});
