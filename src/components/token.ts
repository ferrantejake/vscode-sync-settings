import * as localconfig from './local-config';

export function get() {
    const { token } = localconfig.get();
    return token;
}
export function set(pat: string) {
    localconfig.add({ token: pat });
}