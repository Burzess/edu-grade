/**
 * Toast utility menggunakan react-hot-toast
 * Menyediakan interface yang konsisten untuk notifications di seluruh aplikasi
 */

import toast from 'react-hot-toast';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'success' | 'error' | 'loading' | 'default';
  duration?: number;
}

/**
 * Tampilkan toast notification
 * @param options - Konfigurasi toast
 */
export const showToast = ({ title, description, variant = 'default', duration }: ToastOptions) => {
  const message = description ? `${title}: ${description}` : title;

  switch (variant) {
    case 'success':
      return toast.success(message, { duration });
    case 'error':
      return toast.error(message, { duration });
    case 'loading':
      return toast.loading(message, { duration });
    default:
      return toast(message, { duration });
  }
};

/**
 * Toast sukses
 */
export const toastSuccess = (title: string, description?: string, duration?: number) => {
  const message = description ? `${title}: ${description}` : title;
  return toast.success(message, {
    duration: duration || 3000,
    style: {
      background: '#f0fdf4',
      color: '#16a34a',
      border: '1px solid #86efac',
      borderRadius: 'var(--radius)',
      fontSize: '14px',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#16a34a',
      secondary: 'white',
    },
  });
};

/**
 * Toast error
 */
export const toastError = (title: string, description?: string, duration?: number) => {
  const message = description ? `${title}: ${description}` : title;
  return toast.error(message, {
    duration: duration || 5000,
    style: {
      background: '#fef2f2',
      color: '#dc2626',
      border: '1px solid #fca5a5',
      borderRadius: 'var(--radius)',
      fontSize: '14px',
      fontWeight: '500',
    },
    iconTheme: {
      primary: '#dc2626',
      secondary: 'white',
    },
  });
};

/**
 * Toast loading
 */
export const toastLoading = (title: string, description?: string) => {
  return showToast({ title, description, variant: 'loading' });
};

/**
 * Toast default/info
 */
export const toastInfo = (title: string, description?: string, duration?: number) => {
  const message = description ? `${title}: ${description}` : title;
  return toast(message, {
    duration: duration || 4000,
    style: {
      background: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 'var(--radius)',
      fontSize: '14px',
      fontWeight: '500',
    },
    icon: '📢',
  });
};

/**
 * Tutup toast tertentu
 */
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

/**
 * Tutup semua toast
 */
export const dismissAllToasts = () => {
  toast.dismiss();
};

/**
 * Toast dengan promise - untuk operasi async
 */
export const toastPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
): Promise<T> => {
  return toast.promise(promise, messages);
};

// Export toast object untuk penggunaan advanced
export { toast };

// Export sebagai default untuk backward compatibility
export default {
  success: toastSuccess,
  error: toastError,
  loading: toastLoading,
  info: toastInfo,
  promise: toastPromise,
  dismiss: dismissToast,
  dismissAll: dismissAllToasts,
};