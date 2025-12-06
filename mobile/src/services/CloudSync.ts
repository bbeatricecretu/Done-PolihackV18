import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types';
// Configuration
// Using computer's IP for connection since ADB might not be available
const API_BASE = 'http://192.168.34.114:3000/api';
const SYNC_KEY = '@memento_last_sync';
const ID_MAP_KEY = '@memento_id_map';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function getCloudId(localId: number): Promise<string> {
  const idMapStr = await AsyncStorage.getItem(ID_MAP_KEY);
  const idMap: Record<number, string> = idMapStr ? JSON.parse(idMapStr) : {};
  
  if (!idMap[localId]) {
    const newId = generateUUID();
    idMap[localId] = newId;
    await AsyncStorage.setItem(ID_MAP_KEY, JSON.stringify(idMap));
    return newId;
  }
  return idMap[localId];
}

function parseDueDate(dueDate?: string): string | null {
  if (!dueDate) return null;
  
  // Check if it's already in ISO format
  if (dueDate.includes('T') || dueDate.includes('-')) {
    return new Date(dueDate).toISOString();
  }
  
  // Parse DD/MM/YYYY format
  const parts = dueDate.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  return null;
}

function mapTaskToCloud(task: Task, cloudId: string) {
  return {
    id: cloudId,
    title: task.title,
    description: task.description,
    category: task.category?.toLowerCase() || 'general',
    priority: task.priority?.toLowerCase() || 'medium',
    status: task.completed ? 'completed' : 'pending',
    completed_at: task.completed ? (task.completedAt || new Date().toISOString()) : null,
    due_date: parseDueDate(task.dueDate),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source: task.source?.toLowerCase() === 'notification' ? 'notification' : 'manual',
    source_app: task.source || 'mobile',
    is_deleted: false
  };
}

export async function createTaskInCloud(task: Task) {
  try {
    const cloudId = await getCloudId(task.id);
    const cloudTask = mapTaskToCloud(task, cloudId);
    
    console.log('[CloudSync] Creating task:', { title: task.title, cloudId, dueDate: task.dueDate });
    
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cloudTask)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CloudSync] Create failed (Server):', errorText);
    } else {
      console.log('[CloudSync] Created task successfully:', cloudId);
    }
  } catch (e) {
    console.error('[CloudSync] Create failed (Network):', e);
  }
}

export async function updateTaskInCloud(task: Task) {
  try {
    const cloudId = await getCloudId(task.id);
    const cloudTask = mapTaskToCloud(task, cloudId);
    
    const response = await fetch(`${API_BASE}/tasks/${cloudId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cloudTask)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CloudSync] Update failed (Server):', errorText);
    } else {
      console.log('[CloudSync] Updated task:', cloudId);
    }
  } catch (e) {
    console.error('[CloudSync] Update failed (Network):', e);
  }
}

export async function fetchTasksFromCloud(currentLocalTasks: Task[]): Promise<Task[]> {
  try {
    const response = await fetch(`${API_BASE}/tasks`);
    if (!response.ok) throw new Error('Failed to fetch from cloud');
    
    const cloudTasks = await response.json();
    console.log(`[CloudSync] Fetched ${cloudTasks.length} tasks from cloud`);

    // Load ID Map
    const idMapStr = await AsyncStorage.getItem(ID_MAP_KEY);
    const idMap: Record<number, string> = idMapStr ? JSON.parse(idMapStr) : {};
    
    // Create reverse map (Cloud UUID -> Local ID)
    const reverseMap: Record<string, number> = {};
    Object.entries(idMap).forEach(([localId, cloudId]) => {
      reverseMap[cloudId as string] = parseInt(localId);
    });

    let maxLocalId = currentLocalTasks.length > 0 
      ? Math.max(...currentLocalTasks.map(t => t.id)) 
      : 0;

    const mergedTasks: Task[] = [];
    let mapChanged = false;

    for (const cloudTask of cloudTasks) {
      let localId = reverseMap[cloudTask.id];

      // If this cloud task is not mapped locally, create a new local ID
      if (!localId) {
        maxLocalId++;
        localId = maxLocalId;
        idMap[localId] = cloudTask.id;
        reverseMap[cloudTask.id] = localId;
        mapChanged = true;
      }

      // Convert Cloud Task to Local Task
      const localTask: Task = {
        id: localId,
        title: cloudTask.title,
        description: cloudTask.description || '',
        completed: cloudTask.status === 'completed',
        dueDate: cloudTask.due_date ? new Date(cloudTask.due_date).toLocaleDateString() : undefined,
        date: new Date(cloudTask.created_at).toLocaleDateString(),
        category: cloudTask.category ? cloudTask.category.charAt(0).toUpperCase() + cloudTask.category.slice(1) : 'General',
        priority: cloudTask.priority ? cloudTask.priority.charAt(0).toUpperCase() + cloudTask.priority.slice(1) : 'Medium',
        source: cloudTask.source_app || 'Manual'
      };
      
      mergedTasks.push(localTask);
    }

    if (mapChanged) {
      await AsyncStorage.setItem(ID_MAP_KEY, JSON.stringify(idMap));
    }

    return mergedTasks;
  } catch (e) {
    console.error('[CloudSync] Fetch failed:', e);
    return currentLocalTasks; // Return existing tasks on failure
  }
}

export async function deleteTaskInCloud(taskId: number) {
  try {
    const cloudId = await getCloudId(taskId);
    
    await fetch(`${API_BASE}/tasks/${cloudId}`, {
      method: 'DELETE'
    });
    console.log('[CloudSync] Deleted task:', cloudId);
  } catch (e) {
    console.error('[CloudSync] Delete failed:', e);
  }
}

export async function syncTasksToCloud(tasks: Task[]) {
  try {
    console.log('[CloudSync] Starting sync with', tasks.length, 'tasks');
    
    // Load ID mapping (Local ID -> Cloud UUID)
    const idMapStr = await AsyncStorage.getItem(ID_MAP_KEY);
    const idMap: Record<number, string> = idMapStr ? JSON.parse(idMapStr) : {};
    let mapChanged = false;

    const tasksToSync = await Promise.all(tasks.map(async (task) => {
      let cloudId = idMap[task.id];
      
      if (!cloudId) {
        cloudId = generateUUID();
        idMap[task.id] = cloudId;
        mapChanged = true;
      }

      return mapTaskToCloud(task, cloudId);
    }));

    if (mapChanged) {
      await AsyncStorage.setItem(ID_MAP_KEY, JSON.stringify(idMap));
    }
    
    const response = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: tasksToSync,
        deviceId: 'mobile-device-1'
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[CloudSync] Sync successful:', result);
    
    await AsyncStorage.setItem(SYNC_KEY, new Date().toISOString());
    return true;
  } catch (error) {
    console.error('[CloudSync] Sync error:', error);
    return false;
  }
}

export async function getLastSyncTime(): Promise<string | null> {
  return await AsyncStorage.getItem(SYNC_KEY);
}
