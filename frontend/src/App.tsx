import './App.css';
import { Deunifi } from './components/Deunifi';
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
                  <Deunifi></Deunifi>
                </DsProxyProvider>
            </Block>
          </ConnectionProvider>
        </div>
      </Container>
    </React.Fragment>

  );
}

export default App;
