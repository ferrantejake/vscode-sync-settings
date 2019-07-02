import { localconfig } from '.';

export function get() {
    const { token } = localconfig.get();
    return token;
}
export function set(pat: string) {
    localconfig.add({ token: pat });
}