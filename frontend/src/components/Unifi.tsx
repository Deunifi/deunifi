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
            {
                dsProxy?
                    <div>
                        <ApolloProvider client={client}>
                            <VaultSelectionProvider>
                                <VaultExpectedOperationProvider>
                                    <VaultInfoProvider>
                                        <VaultExpectedStatusProvider>
                                            <APYProvider>
                                                <VaultInfo></VaultInfo>
                                                <VaultOperations></VaultOperations>
                                            </APYProvider>
                                        </VaultExpectedStatusProvider>
                                    </VaultInfoProvider>
                                </VaultExpectedOperationProvider>
                            </VaultSelectionProvider>
                        </ApolloProvider>
                    </div>
                    : undefined
            }
        </div>
    )
}