export interface Task {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  date: string;
  category?: string;
  priority?: string;
  source?: string;
  completedAt?: string;
}
