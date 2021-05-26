import logo from './logo.svg';
import './App.css';
import ConnectButton from './components/Connection';
import { Unifi } from './components/Unifi';
import CssBaseline from '@material-ui/core/CssBaseline';
import React from 'react';
import { Container } from '@material-ui/core';

function App() {

  return (
    <React.Fragment>
      <CssBaseline />
      <Container maxWidth="sm">
        <div>
            <ConnectButton></ConnectButton>
            <Unifi></Unifi>
        </div>
      </Container>
    </React.Fragment>

  );
}

export default App;
