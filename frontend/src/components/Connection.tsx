import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers'
import { AppBar, Box, Button, Card, CardContent, createStyles, Grid, makeStyles, Theme, Toolbar, Tooltip, Typography } from '@material-ui/core';
import { CreateProxyButton } from './CreateProxyButton';
import { useDsProxyContext } from '../contexts/DsProxyContext';
import { useConnectionContext } from '../contexts/ConnectionContext';
import { SimpleCard } from './VaultInfo';
import { VaultSelection } from './VaultSelection';
import { OpenVaultButton } from './OpenVaultButton';
import { useWeb3Modal } from './Web3ModalTest';

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
  const { signer, address, toogleConnection } = useConnectionContext()

  const classes = useStyles();

  const { dsProxy } = useDsProxyContext()

  const web3Modal = useWeb3Modal()

  return (

      <Grid container spacing={2}>
        <Grid item xs={12} >
          <div className={classes.root}>
          <AppBar position="static">
            <Toolbar>
              
              <Box className={classes.title}>
                  <Typography variant="h6" >
                    DEUNIFI
                  </Typography>
                  <Typography variant="caption" >
                    Decentralized and Unified Finance
                  </Typography>
              </Box>

              <Button
                size="small"
                variant="contained"
                color={web3React.active ? 'default' : 'secondary'}
                // onClick={() => toogleConnection()}
                onClick={async () => {
                  const provider = await web3Modal.connect()
                }}
              >
                {web3React.active ? 'Disconnect' : 'Connect'}
              </Button>

            </Toolbar>
          </AppBar>
          </div >
        </Grid>
        
        <Grid item xs={4}>
          
            { web3React.active ?
              <SimpleCard>
              { dsProxy ? undefined : <Box mb={1}> <CreateProxyButton /> </Box> }
                  <Grid container spacing={2} alignItems="center" direction="row" justify="space-evenly">
                      <Grid item xs={8}>
                          <VaultSelection>
                          </VaultSelection>
                      </Grid>
                      <Grid item xs={4}>
                          <Box mt={2}>
                              <OpenVaultButton></OpenVaultButton>
                          </Box>
                      </Grid>
                  </Grid>
                </SimpleCard>
                : undefined
                        }
                       

        </Grid>
        
        <Grid item xs={8}>

          {
            web3React.active ?
              <Card>
                <CardContent>
                  {/* <Typography color="textSecondary" gutterBottom>
                    Connection
                  </Typography> */}

                  <Grid container spacing={2} alignItems="center" direction="row" justify="space-around">

                  <Grid item xs={6}>
                      <ConnectionProperty 
                        label='Address'
                        value={address || ''}
                        />
                    </Grid>

                    <Grid item xs={6}>
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
