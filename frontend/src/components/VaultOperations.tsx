import { IVaultInfo, useVaultInfoContext } from '../contexts/VaultInfoContext';
import { LockAndDraw } from './LockAndDraw';
import { WipeAndFree } from './WipeAndFree';
import React, { useEffect } from 'react';
import { makeStyles, Theme, useTheme } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import { IVaultSelectionItem, useVaultContext } from '../contexts/VaultSelectionContext';

interface Props { }


interface TabPanelProps {
    children?: React.ReactNode;
    dir?: string;
    index: any;
    value: any;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`full-width-tabpanel-${index}`}
            aria-labelledby={`full-width-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box p={3}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: any) {
    return {
        id: `full-width-tab-${index}`,
        'aria-controls': `full-width-tabpanel-${index}`,
    };
}

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        backgroundColor: theme.palette.background.paper,
        // width: 500,
    },
}));

const isVaultApplyesForWipeAndFree = (vaultInfo: IVaultInfo) => {
    return vaultInfo && vaultInfo.cdp && (vaultInfo.ink.gt(0) || vaultInfo.dart.gt(0))
}

export const VaultTabsOperations: React.FC<Props> = ({ children }) => {
    const classes = useStyles();
    const theme = useTheme();
    const [value, setValue] = React.useState(0);
    const { vault } = useVaultContext()
    const { vaultInfo } = useVaultInfoContext()

    const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
        setValue(newValue);
    };

    const handleChangeIndex = (index: number) => {
        setValue(index);
    };

    useEffect(() => {
        // In case the vault it is not already created, then we
        // set the LockAnDraw tab.
        if ((vault && !vault.cdp) || !isVaultApplyesForWipeAndFree(vaultInfo))
            setValue(0)
    }, [vault, vaultInfo])

    return (
        <div className={classes.root}>
            <AppBar position="static" color="default">
                <Tabs
                    value={value}
                    onChange={handleChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="standard"
                    aria-label="full width tabs example"
                >
                    <Tab label="Lock And Draw" {...a11yProps(0)} />
                    { isVaultApplyesForWipeAndFree(vaultInfo) ? <Tab label="Wipe And Free" {...a11yProps(1)} /> : ''}
                </Tabs>
            </AppBar>
            <TabPanel value={value} index={0} dir={theme.direction}>
                {value == 0? <LockAndDraw /> : ''}
            </TabPanel>
            { isVaultApplyesForWipeAndFree(vaultInfo) ? 
                <TabPanel value={value} index={1} dir={theme.direction}>
                    {value == 1? <WipeAndFree /> : ''}
                </TabPanel>
                : ''}
        </div>
    );
}


export const VaultOperations: React.FC<Props> = ({ children }) => {

    const { vaultInfo } = useVaultInfoContext()

    return (
        <span>
            {vaultInfo.ilkInfo.ilk?
                <span>
                    <VaultTabsOperations />
                </span>
                : ''
            }
        </span>

    )
}