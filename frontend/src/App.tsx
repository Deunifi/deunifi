import React from 'react';
import logo from './logo.svg';
import './App.css';
import ConnectButton from './components/ConnectButton';
import { Deployments, DeploymentsContext } from './components/Deployments'
import { Greeter } from './components/Greeter';

function App() {



  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <ConnectButton></ConnectButton>
        <Deployments>
        </Deployments>
      </header>
    </div>
  );
}

export default App;
