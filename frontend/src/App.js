import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import { QueryClient, QueryClientProvider } from 'react-query';
import enTranslations from '@shopify/polaris/locales/en.json';

import Dashboard from './pages/Dashboard';
import DiscountStacks from './pages/DiscountStacks';
import CreateDiscountStack from './pages/CreateDiscountStack';
import EditDiscountStack from './pages/EditDiscountStack';
import Settings from './pages/Settings';

const queryClient = new QueryClient();

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const host = urlParams.get('host');
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const config = {
    apiKey: process.env.REACT_APP_SHOPIFY_API_KEY,
    host: host || (isDevelopment ? 'localhost' : null),
    forceRedirect: !isDevelopment,
  };

  const AppContent = () => (
    <AppProvider i18n={enTranslations}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/discount-stacks" element={<DiscountStacks />} />
            <Route path="/discount-stacks/create" element={<CreateDiscountStack />} />
            <Route path="/discount-stacks/:id/edit" element={<EditDiscountStack />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </AppProvider>
  );

  // In development mode, allow direct access without Shopify context
  if (isDevelopment && !host) {
    return <AppContent />;
  }

  return (
    <AppBridgeProvider config={config}>
      <AppContent />
    </AppBridgeProvider>
  );
}

export default App;