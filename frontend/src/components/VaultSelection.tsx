import { Card, CardContent, FormControl, FormHelperText, InputLabel, MenuItem, Select, Typography } from "@material-ui/core";
import { useContext } from "react";
import { useVaultContext, useVaults, VaultSelectionContext } from "../contexts/VaultSelectionContext";

interface Props { }

export const VaultSelection: React.FC<Props> = ({ children }) => {

    const vaults = useVaults()
    const { vault, setVault } = useContext(VaultSelectionContext)

    return (
        <div hidden={vaults.length == 0}>
            {/* <Card>
                <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                        Vault Selection
                    </Typography> */}

                    <FormControl>
                        <InputLabel id="vault-selection-label">Vault</InputLabel>
                        <Select
                            labelId="vault-selection-label"
                            id="vault-selection-select"
                            onChange={(e) => {
                                // TODO Verify if it needs bounds check.
                                setVault(vaults.filter(v=>v.cdp.toString()==e.target.value)[0])
                            }}
                            value={vault?.cdp.toString() || ''}
                            >
                            {vaults.map(vault => (
                                <MenuItem value={vault.cdp.toString()} key={vault.cdp.toString()}>
                                    #{vault.cdp.toString()} - {vault.ilk}
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