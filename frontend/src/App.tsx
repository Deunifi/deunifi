import logo from './logo.svg';
import './App.css';
import ConnectButton from './components/Connection';
import { Unifi } from './components/Unifi';
import CssBaseline from '@material-ui/core/CssBaseline';
import React from 'react';
import { Container } from '@material-ui/core';
import { Block } from './contexts/BlockContext';
import { DsProxyProvider } from './contexts/DsProxyContext';
import { ConnectionProvider } from './contexts/ConnectionContext';

function App() {

  return (
    <React.Fragment>
      <CssBaseline />
      <Container maxWidth="lg">
        <div>
          <ConnectionProvider>
            <Block>
                <DsProxyProvider>
                  <Unifi></Unifi>
                </DsProxyProvider>
            </Block>
          </ConnectionProvider>
        </div>
      </Container>
    </React.Fragment>

  );
}

export default App;
