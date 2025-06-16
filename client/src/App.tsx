import React from 'react';
import { WalletContextProvider } from './contexts/WalletProvider';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import './App.css';

function App() {
  return (
    <WalletContextProvider>
      <AuthProvider>
        <div className="App">
          <Header />
          <main className="main-content">
            <div className="container">
              <h2>Welcome to Solana Cash Machine</h2>
              <p>Connect your wallet and authenticate to get started!</p>
            </div>
          </main>
        </div>
      </AuthProvider>
    </WalletContextProvider>
  );
}

export default App;
