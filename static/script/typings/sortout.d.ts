declare module sortout {
    type UrlString = string;
    interface RepoData {
        name: string,
        icon: string,
        color: string,
        note: string,
        href: string,
    }
    interface GroupData {
        name: string,
        icon: string,
        color: string,
        note: string,
        drawers: string,
    }
    interface DrawerData extends Array<string> {
        [0]: "repo" | "group",
        [1]: string,
    }
    export const data: {
        "repo": { [id: string]: RepoData };
        "group": { [id: string]: GroupData},
        "drawers": Array<DrawerData>,
    };
    export function load(url: UrlString);
    interface Repository {
        // https://developer.github.com/v3/repos
        id: number;
        owner: {
            login: string;
            avatar_url: UrlString;
        },
        name: string;
        description: string;
        homepage: UrlString;
        language: string;
        updated_at: string;
        stargazers_count: number;
        forks_count: number;
        html_url: UrlString;
    }
    /**
     * 拉取GitHub仓库
     */
    export function fetch(url: UrlString, onEach: (repo: Repository) => any, onComplete?: (data: Repository[]) => any);
    export let user: string;
    export let repo: string;
    export const reposApi: UrlString;
    export const starredApi: UrlString;
}