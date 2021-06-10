import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers'
import { InjectedConnector } from '@web3-react/injected-connector'
import { useEffect, useState } from 'react';
import { useEffectAutoCancel } from '../hooks/useEffectAutoCancel';
import { AppBar, Box, Button, Card, CardActions, CardContent, createStyles, Grid, makeStyles, Theme, Toolbar, Typography } from '@material-ui/core';
import { CreateProxyButton } from './CreateProxyButton';
import { useDsProxyContext } from '../contexts/DsProxyContext';
import { VaultActualValue } from '../components/VaultInfo';
import { VaultSelection } from './VaultSelection';

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

const ConnectionProperty: React.FC<{ label: string, value: string|number }> = ({ label, value }) => {
  return (
      <span>
          <Typography variant="caption" component="p" color="textSecondary">
              {label}:
          </Typography>
          <Typography variant="body2" component="p" color="textPrimary">
              {value}
          </Typography>
      </span>
  )
}

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

  const { dsProxy } = useDsProxyContext()

  return (

    

      <Grid container spacing={2}>
        <Grid item xs={12} >
          <div className={classes.root}>
          <AppBar position="static">
            <Toolbar>
              
              <Typography variant="h6" className={classes.title}>
                DEUNIFI
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
          </div >
        </Grid>
        <Grid item xs={12}>

          {
            web3React.active ?
              <Card>
                <CardContent>
                  {/* <Typography color="textSecondary" gutterBottom>
                    Connection
                  </Typography> */}

                  <Grid container spacing={2} alignItems="center" direction="row" justify="space-around">

                  <Grid item xs={4}>
                      {
                        dsProxy ?
                          // <VaultSelection></VaultSelection>
                          <ConnectionProperty 
                          label='Proxy'
                          value={dsProxy.address || ''}
                          />
                          : <CreateProxyButton></CreateProxyButton>
                      }
                    </Grid>


                  <Grid item xs={4}>
                      <ConnectionProperty 
                        label='Address'
                        value={address || ''}
                        />
                    </Grid>

                    <Grid item xs={4}>
                      <ConnectionProperty 
                        label='Chain ID'
                        value={web3React.chainId || ''}
                        />
                    </Grid>

                  </Grid>

                </CardContent>

              </Card>
              : undefined
          }
        </Grid>
      </Grid>
  );
}

export default ConnectButton;
