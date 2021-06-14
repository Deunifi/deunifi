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
import ConnectButton from './Connection';
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
                                                <ConnectButton></ConnectButton>
                                                {
                                                dsProxy?
                                                <div>

                                                <Grid container spacing={2}>
                                                    <Grid item xs={4}>
                                                        <VaultInfo></VaultInfo>
                                                    </Grid>
                                                    <Grid item xs={8}>
                                                        <VaultOperations></VaultOperations>
                                                    </Grid>
                                                </Grid>
                                                {/* <PriceHistory></PriceHistory> */}
                                                </div>
                                                : undefined
            }
        

                                            </APYProvider>
                                        </VaultExpectedStatusProvider>
                                    </VaultExpectedOperationProvider>
                                </VaultInfoProvider>
                            </VaultSelectionProvider>
                        </ApolloProvider>
                        </div>
    )
}