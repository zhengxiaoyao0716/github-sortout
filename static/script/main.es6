// main
// @author: zhengxiaoyao0716
/// <reference path="typings/sortout.d.ts" />
; (function () {
    "use strict";

    const anims = (() => {
        function onFadeIn() {
            this.removeEventListener("transitionend", onFadeIn);
            this.onAnimFinish && this.onAnimFinish();
        }
        function onFadeOut() {
            this.removeEventListener("transitionend", onFadeOut);
            this.style.setProperty("display", "none");
            this.onAnimFinish && this.onAnimFinish();
        }
        return {
            show() {
                this.removeEventListener("transitionend", onFadeOut);
                this.style.setProperty("opacity", "1");
                this.style.removeProperty("display");
            },
            hide() {
                this.removeEventListener("transitionend", onFadeIn);
                this.style.setProperty("opacity", "0");
                this.style.setProperty("display", "none");
            },
            fadeIn(duration = 1) {
                this.style.removeProperty("display");
                this.style.setProperty("transition", `opacity ${duration * 10}s`);
                this.style.setProperty("opacity", "1");
                this.removeEventListener("transitionend", onFadeOut);
                this.addEventListener("transitionend", onFadeIn);
            },
            fadeOut(duration = 1) {
                this.style.setProperty("transition", `opacity ${duration}s`);
                this.style.setProperty("opacity", "0");
                this.removeEventListener("transitionend", onFadeIn);
                this.addEventListener("transitionend", onFadeOut)
            }
        }
    })();

    const main = {
        keys: { name: "data-sortout-name", savePath: "./static/asset/github_sortout.json", nextStyleIndex: "data-sortout-next_style_index", },
        colors: {
            "Assembly": "#6E4C13",
            "C": "#555555",
            "C++": "#f34b7d",
            "C#": "#178600",
            "CSS": "#563d7c",
            "Go": "#375eab",
            "HTML": "#e34c26",
            "Java": "#b07219",
            "JavaScript": "#f1e05a",
            "Matlab": "#bb92ac",
            "PHP": "#4F5D95",
            "Python": "#3572A5",
            "Ruby": "#701516",
            "SQLPL": "#ccc",
            "Shell": "#89e051",
            "TypeScript": "#2b7489",
        },
        drawers: [],
        clipboard: [],
        buttons: (buttons => {
            new Clipboard('#saveButton', { text() { return JSON.stringify(sortout.data); } }).on('success', function (e) {
                const win = open(`https://github.com/${sortout.user}/${sortout.repo}/edit/gh-pages/${main.keys.savePath}`, "_blank");
                win.alert("Please paste save-data into the editor: (Ctrl + V)");
            });
            const toolbar = document.querySelector(".toolbar");
            for (const key in buttons) {
                const onClick = buttons[key];
                const button = toolbar.querySelector(`#${key}Button`);
                button.addEventListener("click", onClick);
                buttons[key] = button;
            }
            return buttons;
        })({
            "back": e => history.back(),
            "repos": e => main.syncRepos(sortout.reposApi),
            "stars": e => main.syncRepos(sortout.starredApi),
            "all": e => {
                main.addDrawer("All repositories", "All repositories", ...((childs) => {
                    for (const id in sortout.data.repo) {
                        const { name, icon, color, note, href, } = sortout.data.repo[id];
                        childs.push({ type: "repo", id, name, icon, color, note, href, drawers: null, })
                    }
                    return childs;
                })([]));
            },
            "resize": e => {
                let style = document.querySelector("#sizeStyle");
                let index = parseInt(localStorage.getItem("sortout-size-index"));
                index = index == null ? 1 : index;
                if (style) {
                    index = (index + 1) % 3;
                } else {
                    style = document.createElement("style");
                    style.setAttribute("id", "sizeStyle");
                    document.head.appendChild(style);
                }
                localStorage.setItem("sortout-size-index", String(index));
                style.setAttribute(main.keys.nextStyleIndex, String(index));
                style.innerHTML = `.drawer>a {${[
                    "transform: scale(0.6); margin: -16px;",
                    "transform: scale(0.8); margin: 0px;",
                    "transform: scale(1); margin: 12px; margin-bottom: 16px;"
                ][index]}};`;
            },
            // "save": e => {
            //     const win = open(`https://github.com/${sortout.user}/${sortout.repo}/edit/gh-pages/${main.keys.savePath}`, "_blank");
            //     win.prompt("Please copy those data and paste into the editor: (Ctrl + C)", JSON.stringify(sortout.data));
            // },
            "repair": e => {
                for (const id in sortout.data.repo) {
                    sortout.data.repo[id].refs = [];
                }
                for (const id in sortout.data.group) {
                    sortout.data.group[id].refs = [];
                }
                const watchedMap = { repo: {}, group: {} };
                function repair(parentId, group) {
                    const uniqueMap = {};
                    group.drawers = group.drawers.filter(([type, id]) => {
                        if (uniqueMap[type + id]) {
                            console.info(`Removed repeat ${type}: ${id}(name: ${sortout.data[type][id].name}) from ${parentId}(${group.name} || 'Pinned') .`);
                            return false;
                        }
                        switch (type) {
                            case "repo":
                                watchedMap.repo[id] = true;
                                sortout.data.repo[id].refs.push(parentId);
                                break;
                            case "group":
                                if (!watchedMap.group[id]) {
                                    watchedMap.group[id] = true;
                                    repair(id, sortout.data.group[id]);
                                }
                                sortout.data.group[id].refs.indexOf(parentId) == -1 && sortout.data.group[id].refs.push(parentId);
                                break;
                            default:
                                console.info(`Removed invalid item, type: ${type}, id: ${id} from ${parentId}(${group.name || "Pinned"})`);
                                return false;
                        }
                        uniqueMap[type + id] = true;
                        return true;
                    });
                }
                repair("", sortout.data);
                for (const id in sortout.data.repo) {
                    if (!watchedMap.repo[id]) {
                        console.info(`Deleted unused repo: ${id}(${sortout.data.repo[id].name})`);
                        delete sortout.data.repo[id];
                    }
                }
                for (const id in sortout.data.group) {
                    if (!watchedMap.group[id]) {
                        console.info(`Deleted unused group: ${id}(${sortout.data.group[id].name})`);
                        delete sortout.data.group[id];
                    }
                }
                alert("Repaired finish.");
                location.href = "";
            }
        }),
        menu: (() => {
            function create(...content) {
                const menu = document.createElement("div");
                menu.classList.add("menu");
                menu.style.setProperty("display", "none");
                menu.addEventListener("mouseleave", (e) => anims.fadeOut.call(menu));
                document.body.appendChild(menu);
                content.forEach(({ id, text, placeholder, hook, }, index) => {
                    menu.appendChild((() => {
                        if (!id) {
                            return text ? (() => {
                                const span = document.createElement("span");
                                span.textContent = text;
                                return span;
                            })() : document.createElement("hr");
                        }
                        const a = document.createElement("a");
                        a.setAttribute("id", id);
                        a.setAttribute("href", "javascript:;");
                        if (placeholder) {
                            const span = document.createElement("span");
                            span.textContent = text;
                            a.appendChild(span);
                            const input = document.createElement("input");
                            input.setAttribute("placeholder", placeholder);
                            a.appendChild(input);
                            // input
                            a.onclick = e => {
                                a.classList.add("edit");
                                input.focus();
                            };
                            input.onclick = e => {
                                e.stopPropagation();
                                e.preventDefault();
                            }
                            input.onblur = e => {
                                input.onSubmit(e);
                                a.classList.remove("edit");
                            };
                            input.onkeydown = e => {
                                e.keyCode == 13 && input.onSubmit(e);
                            }
                        } else {
                            a.text = text;
                        }
                        hook && hook(a);
                        return a;
                    })());
                });
                return menu;
            }
            const menu = create(
                { id: "openButton", text: "Open", },
                {},
                { text: "Edit info" },
                { id: "nameButton", text: "Name", placeholder: "Name", },
                { id: "iconButton", text: "Icon", placeholder: "Icon" },
                { id: "colorButton", text: "Color", placeholder: "Color" },
                { id: "noteButton", text: "Note", placeholder: "Note" },
                {},
                { text: "Operator" },
                { id: "copyButton", text: "Copy" },
                { id: "cutButton", text: "Cut", },
                { id: "removeButton", text: "Remove", }
            );
            return {
                show(x, y) {
                    menu.style.setProperty("left", x - 10 + "px");
                    menu.style.setProperty("top", y - 10 + "px");
                    anims.show.call(menu);
                    (button => {
                        if (this.menu.href) {
                            button.textContent = "Open link in new tab";
                            button.setAttribute("href", this.menu.href);
                            button.setAttribute("target", "_blank");
                            button.onclick = () => { };
                        } else {
                            button.textContent = "Open and edit group";
                            button.setAttribute("href", "javascript:;");
                            button.onclick = e => {
                                e.preventDefault();
                                e.stopPropagation();
                                // todo edit mode.
                                alert("unfinished");
                            };
                        }
                    })(menu.querySelector("#openButton"));
                    ["name", "icon", "color", "note"].forEach(key => ((button, key) => {
                        const input = button.querySelector("input");
                        input.onSubmit = e => {
                            if (input.value == this.menu[key]) {
                                return;
                            }
                            if (confirm("是否保存所作的修改？")) {
                                this.menu[key] = input.value;
                                input.blur();
                            } else {
                                // input.setAttribute("value", this.menu[key]);
                                input.value = this.menu[key];
                            }
                        };
                        input.value = this.menu[key];
                    })(menu.querySelector(`#${key}Button`), key));
                    menu.querySelector("#copyButton").onclick = e => {
                        this.menu.copy();
                    };
                    menu.querySelector("#cutButton").onclick = e => {
                        this.menu.cut();
                        anims.hide.call(menu);
                    };
                    menu.querySelector("#removeButton").onclick = e => {
                        this.menu.remove();
                        anims.hide.call(menu);
                    };
                },
                bind(element, ...content) {
                    const menu = create(...content)
                    element && element.addEventListener("contextmenu", e => {
                        e.stopPropagation();
                        e.preventDefault();
                        menu.style.setProperty("left", e.x - 10 + "px");
                        menu.style.setProperty("top", e.y - 10 + "px");
                        anims.show.call(menu);
                    });
                },
            };
        })(),
        addChild(type, id, name, icon, color, note, href, drawers) {
            const abbr = name && name[0];  // name.slice(0, 2);
            const _parent = this;
            const child = document.createElement("a");
            child.classList.add(type);
            child.setAttribute(main.keys.name, name);
            switch (type) {
                case "repo":
                    child.textContent = abbr;
                    break;
                case "group":
                    drawers && drawers.length ? (() => {
                        let childs = [];
                        drawers.slice(0, 5).forEach(([type, id]) => {
                            const { name, icon, color, note, href, drawers, } = sortout.data[type][id];
                            childs.push([type, id, name, icon, color, note]);
                        });
                        if (childs.length > 4) {
                            childs = childs.slice(0, 3);
                            const i = document.createElement("i");
                            i.classList.add("fa", "fa-ellipsis-h");
                            i.setAttribute("aria-hidden", "true");
                            childs.push(["repo", null, null, i,]);
                        }
                        childs.forEach(data => main.addChild.call(child, ...data));
                    })() : (() => {
                        child.textContent = abbr
                        child.style.setProperty("justify-content", "center");
                    })();
                    break;
                default:
                    break;
            }
            if (icon) {
                if (icon instanceof Element) {
                    child.appendChild(icon);
                } else {
                    const img = document.createElement("img");
                    img.src = icon;
                    child.appendChild(img);
                }
            }
            if (color) {
                const span = document.createElement("span");
                span.style.setProperty("background-color", color);
                span.textContent = drawers && drawers.length ? "" : abbr;
                child.appendChild(span);
            }
            // 阻止嵌套
            if ((href != undefined || drawers != undefined)) {
                function refresh() {
                    child.after(main.addChild.call({ id }, type, id, name, icon, color, note, href, drawers));
                    child.remove();
                }
                child.menu = {
                    get name() { return name || ""; },
                    set name(value) {
                        sortout.data[type][id].name = value;
                        name = value;
                        refresh();
                    },
                    get icon() { return icon || ""; },
                    set icon(value) {
                        sortout.data[type][id].icon = value;
                        icon = value;
                        refresh();
                    },
                    get color() { return color || ""; },
                    set color(value) {
                        sortout.data[type][id].color = value;
                        color = value;
                        refresh();
                    },
                    get note() { return note || ""; },
                    set note(value) {
                        sortout.data[type][id].note = value;
                        note = value;
                        refresh();
                    },
                    get href() { return type == "repo" ? href : ""; },
                    copy() {
                        main.clipboard.push([type, id]);
                    },
                    cut() {
                        const data = _parent.id === "" ? sortout.data : sortout.data.group[_parent.id];
                        if (data) {
                            data.drawers = data.drawers.filter(([_type, _id]) => type != _type || id != _id);
                        }
                        sortout.data[type][id].refs = sortout.data[type][id].refs.filter(groupId => groupId != _parent.id);
                        child.remove();
                        main.clipboard.push([type, id]);
                    },
                    remove() {
                        const refs = sortout.data[type][id].refs;
                        refs.forEach(groupId => {
                            const data = groupId === "" ? sortout.data : sortout.data.group[groupId];
                            if (data) {
                                data.drawers = data.drawers.filter(([_type, _id]) => type != _type || id != _id);
                            }
                        });
                        delete (sortout.data[type][id]);
                        child.remove();
                    },
                };
                child.appendChild((() => {
                    const input = document.createElement("input");
                    input.type = "text";
                    input.value = name;
                    input.addEventListener("click", (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                    });
                    const onSubmit = (e) => {
                        if (input.value == name) {
                            return;
                        }
                        if (confirm("是否保存所作的修改？")) {
                            sortout.data[type][id].name = input.value;
                            name = input.value;
                            input.blur();
                            refresh();
                        } else {
                            input.value = name;
                        }
                    };
                    input.addEventListener("blur", onSubmit);
                    input.addEventListener("keydown", e => e.keyCode == 13 && onSubmit(e));
                    return input;
                })());
                child.setAttribute("title", note);
                href && child.setAttribute("href", href);
                drawers && child.addEventListener("click", (e) => {
                    main.addDrawer(id, name, ...((drawers) => {
                        const childs = [];
                        drawers.forEach(([type, id]) => {
                            const { name, icon, color, note, href, drawers, } = sortout.data[type][id];
                            childs.push({ type, id, name, icon, color, note, href, drawers });
                        });
                        return childs;
                    })(drawers));
                });
                child.addEventListener("contextmenu", e => {
                    e.preventDefault();
                    e.stopPropagation();
                    main.menu.show.call(child, e.x, e.y);
                })
            }
            _parent && _parent.appendChild && _parent.appendChild(child);
            return child;
        },
        addDrawer(id, name, ...childs) {
            id && history.pushState(id, id, "#" + name);
            const drawer = document.createElement("div");
            drawer.id = id;
            const groupData = id === "" ? sortout.data : sortout.data.group[id];
            const parentId = id;
            main.menu.bind(drawer,
                {
                    id: "closeButton", text: "Close and save group", hook(a) {
                        a.addEventListener("click", e => {
                            // todo save group.
                            alert("unfinished");
                        })
                    }
                },
                {},
                { text: "Operator" },
                {
                    id: "newButton", text: "New", placeholder: "Repo or group name", hook(a) {
                        if (!groupData) {
                            a.classList.add("invalid");
                            return;
                        }
                        const input = a.querySelector("input");
                        input.onSubmit = e => {
                            if (!input.value) {
                                return;
                            }
                            const href = prompt(`If you need create an repo, input the href, otherwise it will create a group.`);
                            if (href === null) {
                                return;
                            }
                            const type = href == "" ? "group" : "repo";
                            if (groupData.drawers.some(([_type, id]) => _type == type && id == input.value)) {
                                alert("Conflict id with exited " + type);
                            } else {
                                groupData.drawers.push([type, input.value]);
                                if (sortout.data[type][input.value]) {
                                    sortout.data[type][input.value] = {
                                        name: input.value,
                                        icon: null,
                                        color: null,
                                        note: null,
                                        href: href ? href : undefined,
                                        drawers: href ? undefined : [],
                                        refs: []
                                    }
                                }
                                const data = sortout.data[type][input.value];
                                data.refs.push(id);
                                main.addChild.call(drawer, type, input.value, data.name, data.icon, data.color, data.note, data.href, data.drawers);
                            }
                            input.value = null;
                            input.blur();
                        };
                    }
                },
                {
                    id: "pasteButton", text: "Paste", hook(a) {
                        a.onclick = e => {
                            if (!main.clipboard.length) {
                                alert("Nothing to paste");
                                return;
                            }
                            while (main.clipboard.length) {
                                const [type, id] = main.clipboard.pop();
                                if (groupData.drawers.some(([_type, _id]) => type == _type && id == _id)) {
                                    continue;
                                }
                                groupData.drawers.push([type, id]);
                                const data = sortout.data[type][id];
                                data.refs.push(parentId);
                                main.addChild.call(drawer, type, id, data.name, data.icon, data.color, data.note, data.href, data.drawers);
                            }
                        };
                    }
                },
                {
                    id: "editButton", text: "Edit", hook(a) {
                        function onEditClick(e) {
                            // todo edit mode.
                            alert("unfinished");
                            a.text = "Save";
                            a.onclick = e => {
                                // todo save group.
                                alert("unfinished");
                                a.text = "Edit";
                                a.onclick = onEditClick;
                            }
                        };
                        a.onclick = onEditClick;
                    }
                }
            );
            drawer.setAttribute(main.keys.name, name);
            childs.forEach(({ type, id, name, icon, color, note, href, drawers }) => {
                main.addChild.call(drawer, type, id, name, icon, color, note, href, drawers);
            });
            drawer.classList.add("drawer");
            if (main.drawers.length) {
                main.drawers[0].onAnimFinish = () => {
                    document.body.prepend(drawer);
                    main.drawers.unshift(drawer);
                    main.buttons.back.classList.remove("invalid");
                };
                anims.fadeOut.call(main.drawers[0], 0.5);
            } else {
                document.body.prepend(drawer);
                main.drawers.unshift(drawer);
            }
        },
        syncRepos(api, filter = repo => true) {
            const childs = [];
            sortout.fetch(api, repo => {
                if (filter && !filter(repo)) {
                    return;
                }
                const { id, name, owner: { login: owner }, description, html_url, homepage, language, stargazers_count, forks_count, updated_at } = repo;
                if (!sortout.data.repo[id]) {
                    sortout.data.repo[id] = { name, icon: "", color: main.colors[language], note: description, href: html_url, refs: [], };
                    childs.push({ type: "repo", id, name, color: main.colors[language], note: description, href: html_url, });
                }
            }, repos => {
                main.addDrawer(api, api, ...childs);
            });
        },
    };
    // debug
    window.main = main;

    window.addEventListener("load", () => {
        main.buttons.resize.click();
        sortout.load(main.keys.savePath).then(data => {
            main.addDrawer("", "Pinned");
            data.drawers.forEach(([type, id]) => {
                const { name, icon, color, note, href, drawers, } = data[type][id];
                main.addChild.call(main.drawers[0], type, id, name, icon, color, note, href, drawers);
            });
        });
        window.addEventListener("popstate", e => {
            if (main.drawers.length == 1) {
                main.buttons.back.classList.add("invalid");
                return;
            }
            main.drawers.shift().remove();
            anims.show.call(main.drawers[0]);
            main.drawers.length == 1 && main.buttons.back.classList.add("invalid");
        });
        // window.onbeforeunload = e => "false";
    });
})();
