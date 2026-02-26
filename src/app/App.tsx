import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const ThemedToaster = () => {
  const { theme } = useTheme();

  return <Toaster position="top-right" richColors theme={theme} />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <ThemedToaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
