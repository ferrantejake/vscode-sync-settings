import * as os from 'os';

export function getComputerUniqueIdentifier() {

    const interfaces = os.networkInterfaces();
    const key = Object.keys(interfaces)[0]
    
    // {
    //     eth0:
    //     [{
    //         address: 'fe80::cae0:ebff:fe14:1dab',
    //         netmask: 'ffff:ffff:ffff:ffff::',
    //         family: 'IPv6',
    //         mac: 'c8:e0:eb:14:1d:ab',
    //         scopeid: 4,
    //         internal: false
    //     },
    //     {
    //         address: '192.168.178.22',
    //         netmask: '255.255.255.0',
    //         family: 'IPv4',
    //         mac: 'c8:e0:eb:14:1d:ab',
    //         internal: false
    //     }]
    // }


    return `${os.hostname()}`; // temporary
}