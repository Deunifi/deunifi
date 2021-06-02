import { parseBytes32String } from "@ethersproject/strings";
import { useState } from "react";
import { useSigner } from "./Connection";
import { useContract } from "./Deployments";
import { proxyExecute } from "./WipeAndFree";
import { useEffectAutoCancel } from "../hooks/useEffectAutoCancel";
import { Button, Card, CardActions, CardContent, FormControl, FormHelperText, InputLabel, MenuItem, Select, Typography } from "@material-ui/core";
import { useDsProxyContext } from "../contexts/DsProxyContext";

interface Props { }

export const OpenVault: React.FC<Props> = ({ children }) => {

    const signer = useSigner()

    const ilkRegistry = useContract('IlkRegistry')

    const { dsProxy } = useDsProxyContext()

    const [ilkList, setIlkList] = useState<string[]>([])
    const [selectedIlk, setSelectedIlk] = useState<string>()

    useEffectAutoCancel(function* (){

        if (!ilkRegistry)
            return

        const list = (yield ilkRegistry['list()']()) as string[]

        setIlkList(list.filter(ilk => /UNIV2/.test(parseBytes32String(ilk))))

    }, [ilkRegistry])

    const dssProxyActions = useContract('DssProxyActions')
    const manager = useContract('DssCdpManager')

    return (
        <div>

        <Card>
            <CardContent>
                <Typography color="textSecondary" gutterBottom>
                Vault Creation
                </Typography>

                <FormControl>
                    <InputLabel id="vault-type-label">Vault type</InputLabel>
                    <Select
                        labelId="vault-type-label"
                        id="vault-type-select"
                        onChange={(e) => setSelectedIlk(e.target.value as string)}
                        value={selectedIlk || ''}
                        >
                        {ilkList.map(ilk => (
                                <MenuItem value={ilk} key={ilk}>
                                    {parseBytes32String(ilk)}
                                </MenuItem>
                        ))}
                    </Select>
                    <FormHelperText>Vault type to be created</FormHelperText>
                </FormControl>

            </CardContent>

                <CardActions>
                    
                    <Button
                            size="small"
                            variant="contained"
                            color='secondary'
                            onClick={async (e) => {
                                e.preventDefault()
                                if (!dssProxyActions || !manager || !selectedIlk || !dsProxy || !signer)
                                    return
                                try {
                                    proxyExecute(
                                        dsProxy, 'execute(address,bytes)',
                                        dssProxyActions, 'open',[
                                            manager.address,
                                            selectedIlk,
                                            dsProxy.address
                                        ]
                                    )
                                } catch (error) {
                                    console.error(error)                            
                                }

                            }}
                        >
                        Create Vault
                    </Button>

                </CardActions>

        </Card>


        </div>
    )
}