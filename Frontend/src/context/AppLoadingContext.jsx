import React, { createContext, useContext, useState } from 'react';

const AppLoadingContext = createContext();

export const useAppLoading = () => useContext(AppLoadingContext);

export const AppLoadingProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);

  const LoadingBar = () => (
    loading ? (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 9999 }}>
        <div style={{ height: 4, background: 'linear-gradient(90deg, #6366f1, #a5b4fc)', width: '100%', animation: 'loading-bar 1.2s linear infinite' }} />
        <style>{`
          @keyframes loading-bar {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
          }
        `}</style>
      </div>
    ) : null
  );

  return (
    <AppLoadingContext.Provider value={{ loading, setLoading, LoadingBar }}>
      {children}
    </AppLoadingContext.Provider>
  );
};

export default AppLoadingContext; 