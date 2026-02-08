import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TamaguiProvider } from 'tamagui';
import config from './tamagui.config';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TamaguiProvider config={config} defaultTheme="dark">
      <App />
    </TamaguiProvider>
  </StrictMode>
);
