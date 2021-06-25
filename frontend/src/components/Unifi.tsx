import React from 'react';
import { VaultInfo } from './VaultInfo';
// import { OneInchTest } from './OneInchTest';
// import { PsmTest } from './PsmTest';
import { VaultSelectionProvider } from '../contexts/VaultSelectionContext'
import { useDsProxyContext } from '../contexts/DsProxyContext';
import { VaultInfoProvider } from '../contexts/VaultInfoContext';
import { VaultOperations } from './VaultOperations';
import { VaultExpectedOperationProvider } from '../contexts/VaultExpectedOperationContext';
import { VaultExpectedStatusProvider } from '../contexts/VaultExpectedStatusContext';
import { ApolloClient, ApolloProvider, gql, InMemoryCache } from '@apollo/client';
import { APYProvider } from '../contexts/APYContext';
import { Grid } from '@material-ui/core';
import DeunifiHeader, { ProxyAndVaultSelection } from './DeunifiContainer';
import { SnackbarProvider } from '../contexts/SnackbarContext';
// import { TestPriceHistory } from './TestPriceHistory';


interface Props { }

const client = new ApolloClient({ 
    uri: "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2",
    cache: new InMemoryCache()
});

export const Unifi: React.FC<Props> = () => {

    const { dsProxy } = useDsProxyContext()

    return (

        <div>
            {/* <PsmTest>
            </PsmTest>
            <OneInchTest>
            </OneInchTest> */}
                        <ApolloProvider client={client}>
                            <VaultSelectionProvider>
                                <VaultInfoProvider>
                                    <VaultExpectedOperationProvider>
                                        <VaultExpectedStatusProvider>
                                            <APYProvider>

                                                <SnackbarProvider>

                                                    <DeunifiHeader></DeunifiHeader>
                                                    <div>

                                                    <Grid container spacing={2}>
                                                        <Grid item md={4} sm={12} xs={12}>
                                                            <Grid container spacing={2}>
                                                                <Grid item xs={12}>
                                                                    <ProxyAndVaultSelection></ProxyAndVaultSelection>
                                                                </Grid>
                                                                <Grid item xs={12}>
                                                                    <VaultInfo></VaultInfo>
                                                                </Grid>
                                                            </Grid>
                                                        </Grid>
                                                        <Grid item md={8} sm={12} xs={12}>
                                                            <VaultOperations></VaultOperations>
                                                        </Grid>
                                                    </Grid>
                                                    {/* <PriceHistory></PriceHistory> */}
                                                    </div>

                                                </SnackbarProvider>

                                            </APYProvider>
                                        </VaultExpectedStatusProvider>
                                    </VaultExpectedOperationProvider>
                                </VaultInfoProvider>
                            </VaultSelectionProvider>
                        </ApolloProvider>
                        </div>
    )
}