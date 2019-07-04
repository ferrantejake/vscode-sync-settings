import * as request from './request';
import { Gist } from './types';

export async function list(pat: string, username: string, page?: number): Promise<Gist[]> {
    const opts: request.RequestOptions = {
        url: `https://api.github.com/users/${username}/gists`,
        headers: {
            'Authorization': `token ${pat}`,
            'User-Agent': 'Sync-Settings'
        }
    };
    if (page) { opts.url += `?page=${page}`; }
    const res = await request.get(opts);
    return res.body;
}


export async function get(pat: string, gistId: string): Promise<Gist> {
    const opts: request.RequestOptions = {
        url: `https://api.github.com/gists/${gistId}`,
        headers: {
            'Authorization': `token ${pat}`,
            'User-Agent': 'Sync-Settings'
        }
    };
    const res = await request.get(opts);
    return res.body;
}
export async function update(pat: string, gistId: string, jsonPayload: any): Promise<Gist> {
    const opts: request.RequestOptions = {
        url: `https://api.github.com/gists/${gistId}`,
        headers: {
            'Authorization': `token ${pat}`,
            'User-Agent': 'Sync-Settings'
        },
        json: jsonPayload
    };
    const res = await request.patch(opts);
    return res.body;
}

export async function create(pat: string, jsonPayload: any): Promise<Gist> {
    const opts: request.RequestOptions = {
        url: `https://api.github.com/gists`,
        headers: {
            'Authorization': `token ${pat}`,
            'User-Agent': 'Sync-Settings'
        },
        json: jsonPayload
    };
    const res = await request.post(opts);
    return res.body;
}