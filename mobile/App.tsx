import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Navbar } from './src/components/Navbar';
import { HomePage } from './src/components/HomePage';
import { ChatBoxPage } from './src/components/ChatBoxPage';
import { TasksPage } from './src/components/TasksPage';
import { SettingsPage } from './src/components/SettingsPage';
import { LocationsPage } from './src/components/LocationsPage';
import { LinearGradient } from 'expo-linear-gradient';
import { NotificationListener } from './src/services/NotificationListener';
import { DevConsoleModal } from './src/components/DevConsoleModal';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { Terminal } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { Task, SavedLocation } from './src/types';
import { TaskManager } from './src/services/TaskManager';
import { DevLogger } from './src/services/DevLogger';
import { syncTasksToCloud } from './src/services/CloudSync';
import { RNAndroidNotificationListenerHeadlessJsName } from 'react-native-android-notification-listener';

// --- MERGED IMPORTS START ---
import { useFonts, Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { PlayfairDisplay_400Regular, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { LocationService } from './src/services/LocationService';
import ProximityNotificationService from './src/services/ProximityNotificationService';
import { syncLocation } from './src/services/CloudSync';
// --- MERGED IMPORTS END ---

// Register the Headless Task for background notification listening

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const chatBoxRef = useRef(null);
  const [isDevConsoleOpen, setIsDevConsoleOpen] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [savedLocations, setSavedLocations] = useState([
    { id: '1', name: 'Home', address: 'Cluj-Napoca, Romania', latitude: 46.7712, longitude: 23.6236 },
    { id: '2', name: 'Work', address: 'Cluj Business Center', latitude: 46.7700, longitude: 23.5900 },
  ]);

  // Global Sync Management (Location & Tasks)
  useEffect(() => {
    // 1. Define Sync Functions
    const syncUserLocation = async () => {
      try {
        console.log('[App] Starting global location sync...');
        const location = await LocationService.getCurrentLocation();
        if (location) {
          console.log('[App] Got location:', location.latitude, location.longitude);
          await syncLocation(location.latitude, location.longitude);
        }
      } catch (err) {
        console.error('[App] Error in global location sync:', err);
      }
    };

    const syncTasks = async () => {
      try {
        console.log('[App] Syncing tasks from cloud...');
        const cloudTasks = await TaskManager.syncWithCloud();
        console.log('[App] Received', cloudTasks.length, 'tasks from sync');
        setTasks(cloudTasks);
      } catch (error) {
        console.error('[App] Failed to sync tasks:', error);
      }
    };

    // 2. Initial Load & Sync
    const initializeApp = async () => {
      // Load local tasks first for speed
      const localTasks = await TaskManager.getTasks();
      setTasks(localTasks);

      // Perform initial syncs
      await syncTasks();
      await syncUserLocation();
      
      // Push local tasks to cloud to ensure consistency on startup
      if (localTasks.length > 0) {
         syncTasksToCloud(localTasks).catch(err => console.error('Initial push failed:', err));
      }
    };

    initializeApp();

    // 3. Set Intervals
    const locationInterval = setInterval(syncUserLocation, 60000); // 60s
    const tasksInterval = setInterval(syncTasks, 5000); // 5s

    return () => {
      clearInterval(locationInterval);
      clearInterval(tasksInterval);
    };
  }, []);

  // Request location permissions on app launch
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const granted = await LocationService.requestPermissions();
        if (!granted) {
          Alert.alert('Permission Denied', 'Location permission is required for nearby task alerts.');
        }
      } catch (e) {
        console.error('Failed to request location permissions:', e);
      }
    };
    requestPermissions();
  }, []);



  const toggleTask = async (id) => {
    const taskToUpdate = tasks.find(t => t.id === id);
    if (taskToUpdate) {
      const isCompleted = !taskToUpdate.completed;
      const updatedTask = { 
        ...taskToUpdate, 
        completed: isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : undefined
      };
      setTasks(tasks.map(task => task.id === id ? updatedTask : task));
      await TaskManager.updateTask(updatedTask);
    }
  };

  const addTask = async (newTask) => {
    // Remove the temporary ID generated by the modal
    const { id, ...taskData } = newTask;
    const savedTask = await TaskManager.addTask(taskData);
    setTasks([savedTask, ...tasks]);

    // Refresh from cloud to ensure consistent format
    try {
      const cloudTasks = await TaskManager.syncWithCloud();
      setTasks(cloudTasks);
    } catch (error) {
      console.error('Failed to refresh tasks from cloud:', error);
    }
  };

  const deleteTask = (id) => {
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this note?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            setTasks(tasks.filter(t => t.id !== id));
            await TaskManager.deleteTask(id);
          }
        }
      ]
    );
  };

  const editTask = async (editedTask) => {
    setTasks(tasks.map(t => t.id === editedTask.id ? editedTask : t));
    await TaskManager.updateTask(editedTask);
  };

const addLocation = (location) => {
    const newLocation = { ...location, id: Date.now().toString() };
    setSavedLocations([...savedLocations, newLocation]);
  };

  const updateLocation = (location) => {
    setSavedLocations(savedLocations.map(loc => loc.id === location.id ? location : loc));
  };

  // Sync tasks with server - called when connecting to server
  const syncWithServer = async () => {
    const currentTasks = await TaskManager.getTasks();
    
    // First push local tasks to cloud
    if (currentTasks.length > 0) {
      await syncTasksToCloud(currentTasks);
    }
    
    // Then pull tasks from cloud and update local
    const cloudTasks = await TaskManager.syncWithCloud();
    if (cloudTasks.length > 0) {
      setTasks(cloudTasks);
    }
  };

  // Initialize notification listener on app start
  useEffect(() => {
    const initNotifications = async () => {
      try {
        console.log('[App] Initializing notification listener...');
        const success = await NotificationListener.initialize();
        console.log('[App] Notification listener init result:', success);
      } catch (error) {
        console.error('[App] Failed to initialize notification listener:', error);
      }
    };
    
    initNotifications();
  }, []);

  // Initialize proximity notification service
  useEffect(() => {
    const initProximityNotifications = async () => {
      try {
        console.log('[App] Initializing proximity notifications...');
        const success = await ProximityNotificationService.initialize();
        
        if (success) {
          console.log('[App] Starting proximity notification polling...');
          ProximityNotificationService.startPolling();
          
          // Handle notification taps (optional: navigate to task)
          ProximityNotificationService.addNotificationResponseListener((response) => {
            const taskId = response.notification.request.content.data?.task_id;
            if (taskId) {
              console.log('[App] User tapped proximity notification for task:', taskId);
              // Navigate to tasks page
              setCurrentPage('tasks');
            }
          });
        }
      } catch (error) {
        console.error('[App] Failed to initialize proximity notifications:', error);
      }
    };

    initProximityNotifications();

    // Cleanup on unmount
    return () => {
      ProximityNotificationService.stopPolling();
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage 
          onNavigate={(page) => setCurrentPage(page)} 
          tasks={tasks}
          onToggleTask={toggleTask}
          onDeleteTask={deleteTask}
          onEditTask={editTask}
        />;
      case 'tasks':
        return <TasksPage 
          tasks={tasks}
          savedLocations={savedLocations}
          onToggleTask={toggleTask}
          onAddTask={addTask}
          onDeleteTask={deleteTask}
          onEditTask={editTask}
        />;
      case 'locations':
        return <LocationsPage 
          tasks={tasks}
          savedLocations={savedLocations}
          onAddLocation={addLocation}
          onUpdateLocation={updateLocation}
        />;
      case 'settings':
        return <SettingsPage onSync={syncWithServer} />;
      case 'chat':
        // Return null for chat since it's always mounted
        return null;
      default:
        return <HomePage 
          onNavigate={(page) => setCurrentPage(page)} 
          tasks={tasks}
          onToggleTask={toggleTask}
          onDeleteTask={deleteTask}
          onEditTask={editTask}
        />;
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

          {/* ChatBoxPage - Always mounted, shown/hidden based on currentPage */}
          <View
            style={[styles.chatContainer, currentPage === 'chat' ? styles.chatVisible : styles.chatHidden]}
            pointerEvents={currentPage === 'chat' ? 'auto' : 'none'}
          >
            <ChatBoxPage onTasksUpdate={() => {
              // Reload tasks when chat creates/modifies them
              syncWithServer();
            }} />
          </View>
          
          {/* Bottom navbar */}
          <Navbar currentPage={currentPage} onPageChange={setCurrentPage} />

          {/* Dev Console Button */}
          <TouchableOpacity
            style={styles.devButton}
            onPress={() => setIsDevConsoleOpen(true)}
          >
            <Terminal size={24} color="#fff" />
          </TouchableOpacity>

          <DevConsoleModal
            visible={isDevConsoleOpen}
            onClose={() => setIsDevConsoleOpen(false)}
          />
        </SafeAreaView>
      </LinearGradient>
    </SafeAreaProvider>
  );
}

// Wrap the app in an ErrorBoundary to catch any errors and prevent crashes
export default function App() {
  let [fontsLoaded] = useFonts({
    Pacifico_400Regular,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
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
  chatContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  chatVisible: {
    display: 'flex',
  },
  chatHidden: {
    display: 'none',
  },
  devButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#333',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
});