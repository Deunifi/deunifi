import logo from './logo.svg';
import './App.css';
import ConnectButton from './components/Connection';
import { Unifi } from './components/Unifi';
import CssBaseline from '@material-ui/core/CssBaseline';
import React from 'react';
import { Container } from '@material-ui/core';
import { Block } from './contexts/BlockContext';

function App() {

  return (
    <React.Fragment>
      <CssBaseline />
      <Container maxWidth="sm">
        <div>
          <Block>

            <ConnectButton></ConnectButton>
            <Unifi></Unifi>
          </Block>
        </div>
      </Container>
    </React.Fragment>

  );
}

export default App;
