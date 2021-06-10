import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { Card, CardContent, FormControl, FormHelperText, InputLabel, ListSubheader, MenuItem, Select, Typography } from "@material-ui/core";
import { useContext } from "react";
import { useVaultContext, useVaults, VaultSelectionContext, IVaultSelectionItem } from "../contexts/VaultSelectionContext";

interface Props { }

function keyFromVault(v: IVaultSelectionItem | undefined){
    if (!v)
        return ''
    if (v.cdp){
        return v.cdp.toString()
    }
    return v.ilk
}

export const VaultSelection: React.FC<Props> = ({ children }) => {

    const { vault, setVault } = useContext(VaultSelectionContext)

    const { userVaults, protocolVaults } = useVaults()

    const vaults: IVaultSelectionItem[] = [...userVaults, ...protocolVaults]

    return (
        // <div hidden={vaults.length == 0}>
        <div>
            {/* <Card>
                <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                        Vault Selection
                    </Typography> */}

                    <FormControl fullWidth>
                        <InputLabel id="vault-selection-label">Vault</InputLabel>
                        <Select
                            fullWidth
                            // variant="outlined"
                            labelId="vault-selection-label"
                            id="vault-selection-select"
                            onChange={(e) => {
                                // TODO Verify if it needs bounds check.
                                setVault(vaults.filter(v=>keyFromVault(v)==e.target.value)[0])
                            }}
                            value={keyFromVault(vault)} // TODO check vault.ilk 
                            >

                            { userVaults.length == 0 ? '' : <ListSubheader>Your vaults</ListSubheader> }
                            {userVaults.map(vault => (
                                <MenuItem value={keyFromVault(vault)} key={keyFromVault(vault)}>
                                    { vault.cdp ? `#${vault.cdp.toString()} - ${vault.ilk}` : vault.ilk}
                                </MenuItem>
                            ))}

                            { userVaults.length == 0 ? '' : <ListSubheader>Open new vault</ListSubheader> }
                            {protocolVaults.map(vault => (
                                <MenuItem value={keyFromVault(vault)} key={keyFromVault(vault)}>
                                    { vault.cdp ? `#${vault.cdp.toString()} - ${vault.ilk}` : vault.ilk}
                                </MenuItem>
                            ))}

                        </Select>
                        <FormHelperText></FormHelperText>
                    </FormControl>

                {/* </CardContent>
            </Card> */}
        </div>
    )
}