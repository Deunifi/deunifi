import { Box, FormControl, FormHelperText, InputLabel, ListItemIcon, ListItemText, ListSubheader, MenuItem, Select, SvgIcon } from "@material-ui/core";
import { useContext } from "react";
import { VaultSelectionContext, IVaultSelectionItem } from "../contexts/VaultSelectionContext";
import MonetizationOnIcon from '@material-ui/icons/MonetizationOn';

interface Props { }

function keyFromVault(v: IVaultSelectionItem | undefined) {
    if (!v)
        return ''
    if (v.cdp) {
        return v.cdp.toString()
    }
    return v.ilk
}


export const VaultSelection: React.FC<Props> = ({ children }) => {

    const { vault, setVault, userVaults, protocolVaults } = useContext(VaultSelectionContext)

    const vaults: IVaultSelectionItem[] = [...userVaults, ...protocolVaults]

    return (
        // <div hidden={vaults.length == 0}>
        <span>
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
                        setVault(vaults.filter(v => keyFromVault(v) == e.target.value)[0])
                    }}
                    value={keyFromVault(vault)} // TODO check vault.ilk 
                >

                    {userVaults.length == 0 ? undefined : <ListSubheader>Your vaults</ListSubheader>}
                    {userVaults.map(vault => (
                        <MenuItem value={keyFromVault(vault)} key={keyFromVault(vault)}>
                            <ListItemIcon>
                                {vault.iconToken0}
                                {vault.iconToken1}
                            </ListItemIcon>
                            {vault.cdp ? `#${vault.cdp.toString()} - ${vault.ilk}` : vault.ilk}
                        </MenuItem>
                    ))}

                    {userVaults.length == 0 ? undefined : <ListSubheader>Open new vault</ListSubheader>}
                    {protocolVaults.map(vault => (
                        <MenuItem value={keyFromVault(vault)} key={keyFromVault(vault)}>
                            <ListItemIcon>
                                {vault.iconToken0}
                                {vault.iconToken1}
                            </ListItemIcon>
                            {vault.cdp ? `#${vault.cdp.toString()} - ${vault.ilk}` : vault.ilk}
                        </MenuItem>
                    ))}

                </Select>
                <FormHelperText></FormHelperText>
            </FormControl>

            {/* </CardContent>
            </Card> */}
        </span>
    )
}