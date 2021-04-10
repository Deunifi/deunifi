import logo from './logo.svg';
import './App.css';
import ConnectButton from './components/Connection';
import { Unifi } from './components/Unifi';

function App() {

  return (
    <div>
        <ConnectButton></ConnectButton>
        <Unifi></Unifi>
    </div>
  );
}

export default App;
