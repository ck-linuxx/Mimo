import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { syncAllPluggyData } from './syncService';

export const PLUGGY_BACKGROUND_SYNC_TASK = 'PLUGGY_BACKGROUND_SYNC_TASK';

// Definição da task no escopo global do módulo (exigência do expo-task-manager).
if (!TaskManager.isTaskDefined(PLUGGY_BACKGROUND_SYNC_TASK)) {
  TaskManager.defineTask(PLUGGY_BACKGROUND_SYNC_TASK, async () => {
    try {
      await syncAllPluggyData({ force: false });
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/**
 * Registra (ou atualiza) a tarefa periódica em background (~60 min).
 * É oportunista: o sistema operacional decide a janela real de execução.
 */
export async function registerPluggyBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(PLUGGY_BACKGROUND_SYNC_TASK);
    if (!isRegistered) {
      await BackgroundTask.registerTaskAsync(PLUGGY_BACKGROUND_SYNC_TASK, {
        minimumInterval: 60, // minutos
      });
    }
  } catch {
    // Em ambientes sem suporte (web / simulador), falha silenciosamente
  }
}

export async function unregisterPluggyBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(PLUGGY_BACKGROUND_SYNC_TASK);
    if (isRegistered) {
      await BackgroundTask.unregisterTaskAsync(PLUGGY_BACKGROUND_SYNC_TASK);
    }
  } catch {
    // ignore
  }
}

