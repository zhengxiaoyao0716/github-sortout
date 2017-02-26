// sortout
// @author: zhengxiaoyao0716
(function () {
    "use strict";
    const hrefMatch = location.href.match(
        /^https?:\/\/([^\/]*)\.github\.io\/([^\/]*)(\/.*)*$/
    ) || location.href.match(
        /^https?:\/\/github\.com\/([^\/]*)\/([^\/]*)(\/.*)*$/
    );
    const sortout = {
        "data": {},
        // 加载数据文件
        "load": (url) => fetch(url).then(
            r => r.status >= 200 && r.status < 300 ? Promise.resolve(r.json()) : Promise.reject(new Error(r.statusText))
        ).then(data => sortout.data = data),
        // 拉取GitHub仓库
        "fetch": function (url, onEach, onComplete) {
            let repos = arguments[3] || [];
            fetch(url).then(
                r => r.status >= 200 && r.status < 300 ? Promise.resolve(r.json().then(j => Promise.resolve([r.headers.get('Link'), j]))) : Promise.reject(new Error(r.statusText))
            ).then(([link, data]) => {
                onEach && data.forEach(onEach);
                repos = repos.concat(data);

                url = (link && (match => match && match.length > 1 && match[1])(link.match(/<(https?:\/\/.*)>; rel="next"/)));
                url ? this.fetch(url, onEach, onComplete, repos) : onComplete && onComplete(repos);
            });
        },
        "user": (window.opener && window.opener.githubUser) || window.parent.githubUser || (hrefMatch && hrefMatch.length > 1) ? hrefMatch[1] : 'zhengxiaoyao0716',
        "repo": (window.opener && window.opener.githubRepo) || window.parent.githubRepo || (hrefMatch && hrefMatch.length > 2) ? hrefMatch[2] : 'github-sortout',
        get reposApi() { return `https://api.github.com/users/${this.user}/repos`; },
        get starredApi() { return `https://api.github.com/users/${this.user}/starred`; },
    };

    // Module defined.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = sortout;
    } else if (typeof define === 'function' && define.amd) {
        define(function () { return sortout; });
    } else {
        window.sortout = sortout;
    }
})();
