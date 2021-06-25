import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers'
import { AppBar, Box, Button, Card, CardContent, createStyles, Grid, makeStyles, Theme, Toolbar, Tooltip, Typography } from '@material-ui/core';
import { CreateProxyButton } from './CreateProxyButton';
import { useDsProxyContext } from '../contexts/DsProxyContext';
import { useConnectionContext } from '../contexts/ConnectionContext';
import { SimpleCard } from './VaultInfo';
import { VaultSelection } from './VaultSelection';
import { OpenVaultButton } from './OpenVaultButton';

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

const getMinAddress = (address: string) => `${address.substring(0,5)}..${address.substring(address.length-3)}`

function DeunifiHeader() {

  const web3React = useWeb3React<ethers.providers.Web3Provider>()
  const { signer, address, toogleConnection, chainId } = useConnectionContext()

  const classes = useStyles();


  return (

      <Grid container spacing={2} direction="row-reverse">
        <Grid item xs={12} >
          <div className={classes.root}>
          <AppBar position="static">
            <Toolbar>
              
              <Box className={classes.title}>
                
                  <Typography variant="h6" >
                    Deunifi
                  </Typography>
                  <Typography variant="caption" >
                    Decentralized and Unified Finance
                  </Typography>
              </Box>

              <Tooltip title={web3React.active ? "" : "Only Metamask is supported for now"}>
                <Button
                  size="small"
                  variant="contained"
                  color={web3React.active ? 'default' : 'secondary'}
                  onClick={() => toogleConnection()}
                >
                  {web3React.active ? `${getMinAddress(address)}` : 'Connect'}
                </Button>
              </Tooltip>

            </Toolbar>
          </AppBar>
          </div >
        </Grid>

      </Grid>
  );
}

export function ProxyAndVaultSelection(){

    const { dsProxy } = useDsProxyContext()

    return (
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
    )
}

export default DeunifiHeader;
