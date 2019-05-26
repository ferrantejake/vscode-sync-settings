import { localsettings } from '.';

export function get() {
    const { token } = localsettings.get();
    return token;
}
export function set(pat: string) {
    localsettings.add({ token: pat });
}