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

export type Report<T> = {
    allSuccess: boolean;
    success: boolean[],
    successCount: number,
    responses: T[]
    rejections: Error[]
};

function ensureAll<T>(promises: Promise<T>[]): Promise<Report<T>> {
    const report: Report<T> = {
        allSuccess: true,
        successCount: 0,
        success: [],
        responses: [],
        rejections: []
    };
    let count = 0;
    return new Promise<Report<T>>(resolve => {
        if (!promises || promises.length === 0) resolve();
        promises.forEach((p, i) => {
            p
                .then(res => {
                    report.success[i] = true;
                    report.responses[i] = res;
                    report.successCount++;
                })
                .catch(e => {
                    report.allSuccess = false;
                    report.success[i] = false;
                    report.responses[i] = e;
                    report.rejections[i] = e;
                })
                .then(_ => {
                    if (++count === promises.length)
                        resolve(report);
                });
        });
    });
}

export const promise = {
    ensureAll
}