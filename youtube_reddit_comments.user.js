// ==UserScript==
// @name         YouTube - Reddit Comments
// @namespace    https://github.com/LenAnderson/
// @downloadURL  https://github.com/LenAnderson/YouTube-Reddit-Comments/raw/master/youtube_reddit_comments.user.js
// @version      0.4
// @author       LenAnderson
// @match        https://www.youtube.com/watch*
// @grant        GM_xmlhttpRequest
// @connect      reddit.com
// ==/UserScript==

(function() {
    'use strict';

    const $ = (query)=>document.querySelector(query);
    const $$ = (query)=>Array.from(document.querySelectorAll(query));
    const log = (...msgs)=>{
        console.log.call(console.log, '[YT-RedditComments]', ...msgs);
    };

    const wait = async(millis)=>new Promise(resolve=>setTimeout(resolve,millis));

    const decodeEntities = (encodedString)=>{
        const translate_re = /&(nbsp|amp|quot|lt|gt);/g;
        const translate = {
            "nbsp":" ",
            "amp" : "&",
            "quot": "\"",
            "lt"  : "<",
            "gt"  : ">"
        };
        return encodedString.replace(translate_re, function(match, entity) {
            return translate[entity];
        }).replace(/&#(\d+);/gi, function(match, numStr) {
            const num = parseInt(numStr, 10);
            return String.fromCharCode(num);
        });
    }




    const dom = {
        root: null,
        tabBar: null,
        tabContainer: null,
        tabs: {}
    };

    let lastUrl = 'INIT';




    const formatTimespan = (span)=>{
        span = span/1000;
        if (span < 60) return span + ' seconds';
        if (span < 3600) return Math.round(span/60) + ' minutes';
        if (span < 3600*24) return Math.round(span/3600) + ' hours';
        if (span < 3600*24*7) return Math.round(span/3600/24) + ' days';
        if (span < 3600*24*30) return Math.round(span/3600/24/7) + ' weeks';
        if (span < 3600*24*365) return Math.round(span/3600/24/30) + ' months';
        return Math.round(span/3600/24/365) + ' months';
    }




    const searchRedditUrl = async(url)=>{
        log('searchRedditUrl: ', url);
        return new Promise(resolve=>{
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://www.reddit.com/submit.json?url=${encodeURIComponent(url)}`,
                onload: (resp)=>{
                    log(resp.responseText);
                    if (resp.responseText == '"{}"') {
                        console.log(url, 'nothing found');
                        resolve(null);
                    } else {
                        resolve(JSON.parse(resp.responseText))
                    }
                },
                onerror: (err)=>{
                    log('[ERROR]', err);
                }
            });
        });
    };

	const searchReddit = async()=>{
        log('searchReddit');
		return searchRedditUrl(location.href);
	}

	const searchRedditShortened = async()=>{
        log('searchRedditShortened');
		return searchRedditUrl(`https://youtu.be/${location.search.substring(1).split('&').map(it=>it.split('=')).find(it=>it[0]=='v')[1]}`);
	};

    const loadRedditPosts = async(searchResult)=>{
        log('loadRedditPosts', searchResult);
        if (searchResult.kind == 'Listing') {
            log('found a list of posts');
            return Promise.all(
                searchResult.data.children
                .filter(it=>it.data.subreddit_name_prefixed[0] == 'r' && it.data.num_comments > 0)
                .sort((a,b)=>a.data.score>b.data.score?-1:a.data.score<b.data.score?1:0)
                .map(it=>loadRedditPost(it.data))
            );
        } else {
            log('found a single post');
            return [parseRedditPost(searchResult)].filter(it=>it.comments.length);
        }
    };

    const loadRedditPost = async(header)=>{
        log('loadRedditPost', header);
        return new Promise(resolve=>{
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://www.reddit.com${header.permalink}.json`,
                onload: (resp)=>{
                    resolve(parseRedditPost(JSON.parse(resp.responseText)));
                }
            });
        });
    };

    const parseRedditPost = (post)=>({
        header: post[0].data.children[0].data,
        comments: post[1].data.children
    });


    const getYtComments = async()=>{
        let ytComments = $('#comments');
        while (!ytComments) {
            log('trying for ytComments');
            await wait(0.1);
            ytComments = $('#comments');
        }
        return ytComments;
    };


    const buildGUI = async()=>{
        log('buildGUI');
        const ytComments = await getYtComments();
        const container = document.createElement('div'); {
            dom.root = container;
            container.style.outline = '5px solid red';
            const tabBar = document.createElement('div'); {
                dom.tabBar = tabBar;
                tabBar.style.overflow = 'auto';
                tabBar.style.whiteSpace = 'nowrap';
                container.appendChild(tabBar);
            }
            const tabContainer = document.createElement('div'); {
                dom.tabContainer = tabContainer;
                container.appendChild(tabContainer);
            }
            ytComments.parentElement.insertBefore(container, ytComments);
        }

        addTab('YT Comments', ytComments);
        switchTab(ytComments.id);
        log('/buildGUI');
    };

    const clearGUI = async()=>{
        log('clearGUI');
        switchTab('comments');
        Array.from(dom.tabBar.children).slice(1).forEach(it=>it.remove());
        Array.from(dom.tabContainer.children).slice(1).forEach(it=>it.remove());
        log('/clearGUI');
    };

    const buildTab = async(post)=>{
        log('buildTab', post.header.name);
        const body = document.createElement('div'); {
            body.id = `reddit_${post.header.name}`;
            body.style.fontSize = '24px';
            body.style.color = 'var(--yt-spec-text-primary)';
            post.comments.forEach(root=>{
                if (root.kind == 'more') {
                    renderMore(root.data, body);
                } else {
                    renderComment(root.data, body);
                }
            });
        }
        addTab(`${post.header.subreddit_name_prefixed}: ${post.header.title}`, body);
    };

    const renderMore = (comment, parent)=>{
        log('renderMore', comment, parent);
        const p = document.createElement('div'); {
            const more = document.createElement('a'); {
                more.textContent = `load more comments (${comment.children.length})`;
                more.style.fontSize = 'x-small';
                more.style.fontWeight = 'bold';
                p.appendChild(more);
            }
            parent.appendChild(p);
        }
    }

    const renderComment = (comment, parent)=>{
        log('renderComment', comment, parent);
        const p = document.createElement('div'); {
            const head = document.createElement('div'); {
                const toggle = document.createElement('a'); {
                    toggle.textContent = '[-]';
                    toggle.style.fontFamily = 'Verdana';
                    toggle.style.fontSize = 'x-small';
                    toggle.style.cursor = 'pointer';
                    toggle.addEventListener('click', ()=>{
                        body.style.display = body.style.display ? '' : 'none';
                    });
                    head.appendChild(toggle);
                }
                const user = document.createElement('a'); {
                    user.textContent = comment.author;
                    user.href = `https://www.reddit.com/u/${comment.author}`;
                    user.style.color = 'rgb(51,102,153)';
                    user.style.margin = '0 5px';
                    user.style.fontWeight = 'bold';
                    user.style.fontSize = 'x-small';
                    head.appendChild(user);
                }
                const info = document.createElement('span'); {
                    info.style.fontSize = 'x-small';
                    info.style.color = 'rgb(136,136,136)';
                    info.textContent = `${comment.score} points ${formatTimespan(new Date().getTime() - comment.created_utc*1000)} ago`;
                    head.appendChild(info);
                }
                p.appendChild(head);
            }
            const body = document.createElement('div'); {
                p.body = body;
                body.style.paddingLeft = '20px';
                const commentBody = document.createElement('div'); {
                    commentBody.innerHTML = decodeEntities(comment.body_html);
                    Array.from(commentBody.querySelectorAll('a')).forEach(it=>{
                        it.classList.add('yt-simple-endpoint');
                        it.classList.add('yt-formatted-string');
                        if (it.getAttribute('href')[0] == '/') {
                            it.href = `https://www.reddit.com${it.getAttribute('href')}`;
                        }
                    });
                    commentBody.style.wordWrap = 'break-word';
                    commentBody.style.marginBottom = '10px';
                    commentBody.style.fontSize = '1.4rem';
                    body.appendChild(commentBody);
                }
                p.appendChild(body);
            }
            (parent.body||parent).appendChild(p);
            if (comment.replies) {
                comment.replies.data.children.forEach(reply=>{
                    if (reply.kind == 'more') {
                        renderMore(reply.data, p);
                    } else {
                        renderComment(reply.data, p);
                    }
                });
            }
        }
    }

    const addTab = (title, content)=>{
        dom.tabs[content.id] = content;
        content.style.display = 'none';
        dom.tabContainer.appendChild(content);
        const header = document.createElement('div'); {
            header.textContent = title;
            header.title = title;
            header.style.color = 'var(--yt-spec-text-primary)';
            header.style.display = 'inline-block';
            header.style.overflow = 'hidden';
            header.style.whiteSpace = 'nowrap';
            header.style.textOverflow = 'ellipsis';
            header.style.maxWidth = '120px';
            header.style.marginRight = '10px';
            header.style.cursor = 'pointer';
            header.addEventListener('click', evt=>{
                evt.preventDefault();
                evt.stopPropagation();
                switchTab(content.id);
            });
            dom.tabBar.appendChild(header);
        }
    };

    const switchTab = (id)=>{
        Object.keys(dom.tabs).forEach((key,idx)=>{
            if (key == id) {
                dom.tabs[key].style.display = '';
            } else {
                dom.tabs[key].style.display = 'none';
            }
        });
    };




    const checkUrl = async()=>{
        try {
            if (lastUrl != location.href) {
                log('url changed');
                lastUrl = location.href;
                await clearGUI();
				const searchResults = (await Promise.all([searchReddit(), searchRedditShortened()]));
				const searchResult = {
					kind: 'Listing',
					data: {
						children: []
					}
				};
				searchResults.forEach(sr=>{
					if (sr) {
						if (sr.kind == 'Listing') {
							searchResult.data.children = searchResult.data.children.concat(sr.data.children);
						} else {
							searchResult.data.children.push(sr[0].data.children[0]);
						}
					}
				});
                if (searchResult) {
					log('searchResult: ', searchResult);
                    const posts = await loadRedditPosts(searchResult);
                    log(posts);
                    posts.forEach(buildTab);
                }
            }
        } catch (ex) {
            log('[EX]', ex);
        }
        setTimeout(()=>checkUrl(), 500);
    }




    const init = async()=>{
        try {
            await buildGUI();
            checkUrl();
        } catch (ex) {
            log('[EX]', ex);
        }
    };
    init();
})();
