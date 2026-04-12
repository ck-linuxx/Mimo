import { useCallback, useState } from 'react';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertConfig {
  type?: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  autoClose?: number;
}

interface UseCustomAlertReturn {
  alertConfig: AlertConfig | null;
  visible: boolean;
  showAlert: (config: AlertConfig) => void;
  hideAlert: () => void;
  showSuccess: (title: string, message?: string, autoClose?: number) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
  showDestructive: (title: string, message: string, onConfirm: () => void, onCancel?: () => void, confirmText?: string) => void;
}

export function useCustomAlert(): UseCustomAlertReturn {
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const hideAlert = useCallback(() => {
    setVisible(false);
    setTimeout(() => setAlertConfig(null), 200);
  }, []);

  const showAlert = useCallback((config: AlertConfig) => {
    setAlertConfig(config);
    setVisible(true);
  }, []);

  const showSuccess = useCallback((title: string, message?: string, autoClose = 3000) => {
    showAlert({ type: 'success', title, message, autoClose });
  }, [showAlert]);

  const showError = useCallback((title: string, message?: string) => {
    showAlert({ type: 'error', title, message });
  }, [showAlert]);

  const showWarning = useCallback((title: string, message?: string) => {
    showAlert({ type: 'warning', title, message });
  }, [showAlert]);

  const showInfo = useCallback((title: string, message?: string) => {
    showAlert({ type: 'info', title, message });
  }, [showAlert]);

  const showConfirm = useCallback(
    (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
      showAlert({
        type: 'warning',
        title,
        message,
        buttons: [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => { onCancel?.(); hideAlert(); },
          },
          {
            text: 'Confirmar',
            style: 'default',
            onPress: () => { onConfirm(); hideAlert(); },
          },
        ],
      });
    },
    [showAlert, hideAlert],
  );

  const showDestructive = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void,
      confirmText = 'Excluir',
    ) => {
      showAlert({
        type: 'error',
        title,
        message,
        buttons: [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => { onCancel?.(); hideAlert(); },
          },
          {
            text: confirmText,
            style: 'destructive',
            onPress: () => { onConfirm(); hideAlert(); },
          },
        ],
      });
    },
    [showAlert, hideAlert],
  );

  return {
    alertConfig,
    visible,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showDestructive,
  };
}
