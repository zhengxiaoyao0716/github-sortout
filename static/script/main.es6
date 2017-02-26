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
        size: "middle",
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
        drawers: [(() => document.querySelector(".drawer"))()],
        buttons: (buttons => {
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
            "resize": e => ((style) => {
                let index = parseInt(style.getAttribute(main.keys.nextStyleIndex) || { "small": 0, "middle": 1, "large": 2 }[main.size]);
                style.setAttribute(main.keys.nextStyleIndex, String((index + 1) % 3));
                style.innerHTML = `.drawer>a {${[
                    "transform: scale(0.6); margin: -16px;",
                    "transform: scale(0.8); margin: 0px;",
                    "transform: scale(1); margin: 12px; margin-bottom: 16px;"
                ][index]}};`;
                style.setAttribute("id", "sizeStyle");
                document.head.appendChild(style);
            })(document.querySelector("#sizeStyle") || document.createElement("style")),
            "save": e => {
                const win = open(`https://github.com/${sortout.user}/${sortout.repo}/edit/gh-pages/${main.keys.savePath}`, "_blank");
                win.prompt("Please copy those data and paste into the editor: (Ctrl + C)", JSON.stringify(sortout.data));
            },
        }),
        menu: (() => {
            const menu = document.querySelector(".menu");
            menu.addEventListener("mouseleave", (e) => anims.fadeOut.call(menu));
            return {
                show(x, y) {
                    menu.style.setProperty("left", x - 10 + "px");
                    menu.style.setProperty("top", y - 10 + "px");
                    anims.show.call(menu);
                    (button => {
                        if (typeof this.menu.href == "string") {
                            button.setAttribute("href", this.menu.href);
                            button.setAttribute("target", "_blank");
                        } else {
                            button.addEventListener("click", this.menu.href);
                        }
                    })(menu.querySelector("#openButton"));
                    ["name", "icon", "color", "note"].forEach(key => ((button, key) => {
                        const input = button.querySelector("input");
                        button.onclick = e => {
                            button.classList.add("edit");
                            input.focus();
                        };
                        input.onclick = e => {
                            e.stopPropagation();
                            e.preventDefault();
                        };
                        const onSubmit = e => {
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
                        input.onblur = e => {
                            onSubmit(e);
                            button.classList.remove("edit");
                        };
                        input.onkeydown = e => {
                            e.keyCode == 13 && onSubmit(e);
                        }
                        input.value = this.menu[key];
                    })(menu.querySelector(`#${key}Button`), key));
                    // todo
                    menu.querySelector("#moveButton").setAttribute("href", "");
                    menu.querySelector("#deleteButton").setAttribute("href", "");
                }
            };
        })(),
        addChild(type, id, name, icon, color, note, href, drawers) {
            const child = document.createElement("a");
            child.classList.add(type);
            child.setAttribute(main.keys.name, name);
            switch (type) {
                case "repo":
                    child.textContent = name[0];
                    break;
                case "group":
                    drawers && drawers.length ? drawers.forEach(([type, id]) => {
                        const { name, icon, color, note, href, drawers, } = sortout.data[type][id];
                        main.addChild.call(child, type, id, name, icon, color, note);
                    }) : child.textContent = name[0];
                    break;
                default:
                    break;
            }
            if (icon) {
                const img = document.createElement("img");
                img.src = icon;
                child.appendChild(img);
            }
            if (color) {
                const span = document.createElement("span");
                span.style.setProperty("background-color", color);
                span.textContent = name[0];
                child.appendChild(span);
            }
            // 阻止嵌套
            if ((href || drawers)) {
                function refresh() {
                    child.after(main.addChild(type, id, name, icon, color, note, href, drawers));
                    child.remove();
                }
                child.menu = {
                    get href() { return type == "repo" ? href : child.click; },
                    get name() { return name; },
                    set name(value) {
                        sortout.data[type][id].name = value;
                        name = value;
                        refresh();
                    },
                    get icon() { return icon; },
                    set icon(value) {
                        sortout.data[type][id].icon = value;
                        icon = value;
                        refresh();
                    },
                    get color() { return color; },
                    set color(value) {
                        sortout.data[type][id].color = value;
                        color = value;
                        refresh();
                    },
                    get note() { return note; },
                    set note(value) {
                        sortout.data[type][id].note = value;
                        note = value;
                        refresh();
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
                    history.pushState(name, name, "#" + name);
                    main.addDrawer(name, ...((drawers) => {
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
                    main.menu.show.call(child, e.x, e.y);
                })
            }
            this && this.appendChild && this.appendChild(child);
            return child;
        },
        addDrawer(name, ...childs) {
            const drawer = document.createElement("div");
            drawer.setAttribute(main.keys.name, name);
            childs.forEach(({type, id, name, icon, color, note, href, drawers}) => {
                main.addChild.call(drawer, type, id, name, icon, color, note, href, drawers);
            });
            drawer.classList.add("drawer");
            main.drawers[0].onAnimFinish = () => {
                document.body.prepend(drawer);
                main.drawers.unshift(drawer);
                main.buttons.back.classList.remove("invalid");
            };
            anims.fadeOut.call(main.drawers[0], 0.5);
        },
        syncRepos(api) {
            const childs = [];
            sortout.fetch(api, (
                {id, name, owner: {login: owner}, description, html_url, homepage, language, stargazers_count, forks_count, updated_at}
            ) => {
                if (!sortout.data.repo[id]) {
                    sortout.data.repo[id] = { name, icon: "", color: main.colors[language], note: description, href: html_url, };
                }
                childs.push({ type: "repo", id, name, color: main.colors[language], note: description, href: html_url, });
            }, repos => {
                main.addDrawer(api, ...childs);
            });
        },
    };
    // debug
    window.main = main;

    window.addEventListener("load", () => {
        main.buttons.resize.click();
        sortout.load(main.keys.savePath).then(data => {
            data.drawers.forEach(([type, id]) => {
                const {name, icon, color, note, href, drawers, } = data[type][id];
                main.addChild.call(main.drawers[0], type, id, name, icon, color, note, href, drawers);
            });
            main.drawers[0].appendChild((() => {
                const newButton = document.createElement("a");
                newButton.classList.add("repo");
                newButton.setAttribute(main.keys.name, "New");
                newButton.setAttribute("title", "Create new repository.");
                newButton.appendChild((() => {
                    const span = document.createElement("span");
                    span.style.setProperty("background-color", "#03A9F4");
                    span.innerHTML = '<i class="fa fa-plus" aria-hidden="true"></i>';
                    return span;
                })());
                newButton.appendChild((() => {
                    const input = document.createElement("input");
                    input.type = "text";
                    input.value = "New";
                    input.readOnly = true;
                    return input;
                })());
                newButton.href = "https://github.com/new";
                return newButton;
            })());
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
