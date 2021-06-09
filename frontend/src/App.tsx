import logo from './logo.svg';
import './App.css';
import ConnectButton from './components/Connection';
import { Unifi } from './components/Unifi';
import CssBaseline from '@material-ui/core/CssBaseline';
import React from 'react';
import { Container } from '@material-ui/core';
import { Block } from './contexts/BlockContext';
import { DsProxyProvider } from './contexts/DsProxyContext';

function App() {

  return (
    <React.Fragment>
      <CssBaseline />
      <Container maxWidth="md">
        <div>
          <Block>
            <DsProxyProvider>
              <ConnectButton></ConnectButton>
              <Unifi></Unifi>
            </DsProxyProvider>
          </Block>
        </div>
      </Container>
    </React.Fragment>

  );
}

export default App;
