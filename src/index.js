import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Import i18n configuration
import './i18n';

// Helper component to set localStorage and render App
const AppWithParams = ({ startParams }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    // Clear any existing params first to prevent conflicts
    localStorage.removeItem('matb_start_params');
    
    if (startParams) {
      // Store the parameters in localStorage
      localStorage.setItem('matb_start_params', JSON.stringify(startParams));
      
      // Small delay to ensure localStorage is set before App checks it
      setTimeout(() => {
        setIsLoading(false);
      }, 50);
    } else {
      setIsLoading(false);
    }
    
    // Cleanup on unmount
    return () => {
      // We don't remove the params here anymore since the App component will handle them
    };
  }, [startParams]);
  
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: '#f0f0f0'
      }}>
        <div>Loading...</div>
      </div>
    );
  }
  
  return <App />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter basename={process.env.PUBLIC_URL}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/comms" element={<AppWithParams startParams={{ mode: 'custom', tasks: ['comm'] }} />} />
        <Route path="/monitoring" element={<AppWithParams startParams={{ mode: 'custom', tasks: ['monitoring'] }} />} />
        <Route path="/tracking" element={<AppWithParams startParams={{ mode: 'custom', tasks: ['tracking'] }} />} />
        <Route path="/resource" element={<AppWithParams startParams={{ mode: 'custom', tasks: ['resource'] }} />} />
        <Route path="/normal" element={<AppWithParams startParams={{ mode: 'normal', duration: 5 * 60 * 1000 }} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
