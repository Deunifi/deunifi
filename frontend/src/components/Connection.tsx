import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers'
import { InjectedConnector } from '@web3-react/injected-connector'
import { useEffect, useState } from 'react';
import { useEffectAutoCancel } from '../hooks/useEffectAutoCancel';
import { AppBar, Button, Card, CardActions, CardContent, createStyles, makeStyles, Theme, Toolbar, Typography } from '@material-ui/core';
import { useDSProxyContainer } from './VaultSelection';
import { CreateProxyButton } from './CreateProxyButton';

const injectedConnector = new InjectedConnector({
  supportedChainIds: [
    1, // Mainet
    3, // Ropsten
    4, // Rinkeby
    5, // Goerli
    42, // Kovan
    1337, //localhost
  ],
})

export function useProvider() {
  const web3React = useWeb3React<ethers.providers.Web3Provider>()
  const [provider, setProvider] = useState<ethers.providers.Web3Provider>()

  useEffect(() => {
    setProvider(web3React.library)
  }, [web3React])

  return provider
}

export function useSigner() {
  const web3React = useWeb3React<ethers.providers.Web3Provider>()
  const [signer, setSigner] = useState<ethers.providers.JsonRpcSigner>()

  useEffect(() => {
    setSigner(web3React.library?.getSigner())
  }, [web3React])

  return signer
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
    },
    menuButton: {
      marginRight: theme.spacing(2),
    },
    title: {
      flexGrow: 1,
    },
  }),
);

function ConnectButton() {

  const web3React = useWeb3React<ethers.providers.Web3Provider>()
  const signer = useSigner()
  const [address, setAddress] = useState<string>()

  useEffectAutoCancel(function* () {
    if (!signer)
      setAddress(ethers.constants.AddressZero)
    else
      setAddress((yield signer.getAddress()) as string)
  }, [signer])


  const toogleConnection = () => {
    if (!web3React.active)
      web3React.activate(injectedConnector)
    else
      web3React.deactivate()
  }

  const classes = useStyles();

  const { dsProxy } = useDSProxyContainer()

  return (

    <div className={classes.root}>

      <AppBar position="static">
        <Toolbar>
          {/* <IconButton edge="start" className={classes.menuButton} color="inherit" aria-label="menu">
            <MenuIcon />
          </IconButton> */}
          <Typography variant="h6" className={classes.title}>
            Deunifi
          </Typography>
          <Button
            size="small"
            variant="contained"
            color={web3React.active ? 'default' : 'secondary'}
            onClick={() => toogleConnection()}
          >
            {web3React.active ? 'Disconnect' : 'Connect'}
          </Button>

        </Toolbar>
      </AppBar>

      { 
        web3React.active ?
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Connection
              </Typography>
              {/* <Typography variant="h5" component="h2">
                be{bull}nev{bull}o{bull}lent
              </Typography> */}
              <Typography color="textSecondary">
                Address: {address}
              </Typography>
              <Typography variant="body2" component="p" color="textSecondary">
                Chain ID: {web3React.chainId}
              </Typography>
              {
                dsProxy? 
                  <Typography variant="body2" component="p" color="textSecondary">
                    Proxy: {dsProxy.address}
                  </Typography> :
                  undefined
              }

            </CardContent>

            {
              dsProxy? 
                undefined : 
                <CardActions>
                  <CreateProxyButton></CreateProxyButton>
                </CardActions>
            }

          </Card>
          : undefined
      }

    </div>
  );
}

export default ConnectButton;
