// ==Userscript==
// @name         YouTube - Reddit Comments
// @namespace    https://github.com/LenAnderson/
// @downloadURL  https://github.com/LenAnderson/YouTube-Reddit-Comments/raw/master/youtube_reddit_comments.user.js
// @version      1.0
// @author       LenAnderson
// @match        https://www.youtube.com/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      reddit.com
// /==Userscript==

(()=>{
	'use strict';

	const $ = (query)=>document.querySelector(query);
	const $$ = (query)=>Array.from(document.querySelectorAll(query));
	const log = (...msgs)=>console.log.call(console.log, '[YT-RedditComments]', ...msgs);


	const wait = async(millis)=>new Promise(resolve=>setTimeout(resolve, millis));

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
	};

	const formatTimespan = (span)=>{
		span = span/1000;
		if (span < 60) return span + ' seconds';
		if (span < 3600) return Math.round(span/60) + ' minutes';
		if (span < 3600*24) return Math.round(span/3600) + ' hours';
		if (span < 3600*24*7) return Math.round(span/3600/24) + ' days';
		if (span < 3600*24*30) return Math.round(span/3600/24/7) + ' weeks';
		if (span < 3600*24*365) return Math.round(span/3600/24/30) + ' months';
		return Math.round(span/3600/24/365) + ' months';
	};




	class Reddit {
	constructor() {}

	async search(url) {
		log('[Reddit]', 'search', url);
		return new Promise(resolve=>{
			GM_xmlhttpRequest({
				method: 'GET',
				url: `https://www.reddit.com/submit.json?url=${encodeURIComponent(url)}`,
				onload: (resp)=>{
					if (resp.responseText == '"{}"') {
						resolve(null);
					} else {
						resolve(JSON.parse(resp.responseText));
					}
				},
				onerror: (err)=>{
					log('[ERROR]', err);
				}
			});
		});
	}




	async findPosts(url) {
		log('[Reddit]', 'findPosts', url);
		const videoId = location.search.substring(1).split('&').map(it=>it.split('=')).find(it=>it[0]=='v')[1];
		const searchResults = await Promise.all([
			this.search(`https://www.youtube.com/watch?v=${videoId}`),
			this.search(`https://youtu.be/${videoId}`)
		]);

		const searchResult = {
			kind: 'Listing',
			data: {
				children: []
			}
		};
		log('[Reddit]', 'findPosts', '-- searchResults: ', searchResults);
		searchResults.forEach(sr=>{
			if (sr) {
				if (sr.kind == 'Listing') {
					searchResult.data.children = searchResult.data.children.concat(sr.data.children);
				} else {
					searchResult.data.children.push(sr[0].data.children[0]);
				}
			}
		});

		const posts = await this.loadPosts(searchResult);
		return posts;
	}


	async loadPosts(searchResult) {
		log('[Reddit]', 'loadPosts', searchResult);
		if (searchResult.kind == 'Listing') {
			return Promise.all(
				searchResult.data.children
					.filter(it=>it.data.subreddit_name_prefixed[0] == 'r' && it.data.num_comments > 0)
					.sort((a,b)=>a.data.score>b.data.score?-1:a.data.score<b.data.score?1:0)
					.map(it=>this.loadPost(it.data))
			);
		} else {
			return [this.parsePost(searchResult)].filter(it=>it.comments.length);
		}
	}

	async loadPost(header) {
		log('[Reddit]', 'loadPost', header);
		return new Promise(resolve=>{
			GM_xmlhttpRequest({
				method: 'GET',
				url: `https://www.reddit.com${header.permalink}.json`,
				onload: (resp)=>resolve(this.parsePost(JSON.parse(resp.responseText)))
			});
		})
	}


	parsePost(post) {
		log('[Reddit]', 'parsePost', post);
		return {
			header: post[0].data.children[0].data,
			comments: post[1].data.children
		};
	}
}
class CommentMore {
	constructor(comment) {
		this.comment = comment;
		
		this.dom = {
			root: null
		};

		const root = document.createElement('div'); {
			this.dom.root = root;
			root.classList.add('ytrc--comment');
			const more = document.createElement('a'); {
				more.classList.add('ytrc--comment--more');
				more.textContent = `load more comments (${comment.children.length})`;
				more.addEventListener('click', (evt)=>{
					evt.preventDefault();
					evt.stopPropagation();
					alert('loading more comments is not implemented');
				});
				root.appendChild(more);
			}
		}
	}
}
class Comment {
	constructor(comment) {
		this.comment = comment;

		this.dom = {
			root: null,
			head: null,
			body: null
		}
		const root = document.createElement('div'); {
			this.dom.root = root;
			root.classList.add('ytrc--comment');
			const head = document.createElement('div'); {
				this.dom.head = head;
				head.classList.add('ytrc--comment--head');
				const toggle = document.createElement('a'); {
					toggle.textContent = '[-]';
					toggle.classList.add('ytrc--comment--toggle');
					toggle.addEventListener('click', (evt)=>{
						this.dom.body.classList.toggle('ytrc--comment--collapsed');
					});
					head.appendChild(toggle);
				}
				const user = document.createElement('a'); {
					user.classList.add('ytrc--comment--user');
					user.textContent = this.comment.author;
					user.href = `https://www.reddit.com/u/${comment.author}`;
					head.appendChild(user);
				}
				const info = document.createElement('span'); {
					info.classList.add('ytrc--comment--info');
					info.textContent = `${comment.score} points ${formatTimespan(new Date().getTime() - comment.created_utc*1000)} ago`;
					head.appendChild(info);
				}
				root.appendChild(head);
			}
			const body = document.createElement('div'); {
				this.dom.body = body;
				body.classList.add('ytrc--comment--body');
				const commentBody = document.createElement('div'); {
					commentBody.classList.add('ytrc--comment--commentBody');
					commentBody.innerHTML = decodeEntities(comment.body_html);
					Array.from(commentBody.querySelectorAll('a')).forEach(it=>{
						it.classList.add('yt-simple-endpoint');
						it.classList.add('yt-formatted-string');
						if (it.getAttribute('href')[0] == '/') {
							it.href = `https://www.reddit.com${it.getAttribute('href')}`;
						}
					});
					body.appendChild(commentBody);
				}
				if (comment.replies) {
					comment.replies.data.children.forEach(reply=>{
						if (reply.kind == 'more') {
							const com = new CommentMore(reply.data);
							body.appendChild(com.dom.root);
						} else {
							const com = new Comment(reply.data);
							body.appendChild(com.dom.root);
						}
					});
				}
				root.appendChild(body);
			}
		}
	}
}


class Tab {
	constructor(post) {
		this.post = post;

		this.title = `${post.header.subreddit_name_prefixed}: ${post.header.title}`;
		this.dom = {
			root: null
		};

		this.create();
	}

	create() {
		log('[Tab]', 'createTab', this.post);
		const body = document.createElement('div'); {
			this.dom.root = body;
			body.id = `reddit_${this.post.header.name}`;
			body.classList.add('ytrc--post');
			const title = document.createElement('a'); {
				title.classList.add('ytrc--post--title');
				title.textContent = this.title;
				title.href = `https://www.reddit.com${this.post.header.permalink}`;
				body.appendChild(title);
			}
			this.post.comments.forEach(root=>{
				if (root.kind == 'more') {
					const comm = new CommentMore(root.data);
					body.appendChild(comm.dom.root);
				} else {
					const comm = new Comment(root.data);
					body.appendChild(comm.dom.root);
				}
			});
		}
		log('[Tab]', '/createTab');
	}
}


class Gui {
	constructor() {
		this.posts = [];
		this.dom = {
			root: null,
			css: null,
			tabBar: null,
			tabContainer: null,
			tabs: {}
		};
	}

	remove() {
		log('[Gui]', 'remove');
		try {
			this.dom.root.parentElement.insertBefore(this.dom.tabContainer.children[0].children[0], this.dom.root);
		} catch (ex) {
			// do nothing
		}
		if (this.dom.root) {
			this.dom.root.remove();
		}
		log('[Gui]', '/remove');
	}

	async create(posts) {
		log('[Gui]', 'create', posts);
		const yt = await this.findYtComments();
		const container = document.createElement('div'); {
			this.dom.root = container;
			container.classList.add('ytrc--root');
			const css = document.createElement('style'); {
				this.dom.css = css;
				css.innerHTML = '.ytrc--root {  outline: 5px solid red;}.ytrc--root > .ytrc--tabBar {  overflow: auto;  white-space: nowrap;}.ytrc--root > .ytrc--tabBar > .ytrc--tabHeader {  color: var(--yt-spec-text-primary);  cursor: pointer;  display: inline-block;  margin-right: 10px;  max-width: 120px;  overflow: hidden;  text-overflow: ellipsis;  white-space: nowrap;}.ytrc--root > .ytrc--tabContainer > .ytrc--tabContentWrapper {  display: none;}.ytrc--root > .ytrc--tabContainer > .ytrc--tabContentWrapper.ytrc--active {  display: block;}.ytrc--root > .ytrc--tabContainer > .ytrc--tabContentWrapper > .ytrc--post {  font-size: 24px;  color: var(--yt-spec-text-primary);}.ytrc--root > .ytrc--tabContainer > .ytrc--tabContentWrapper > .ytrc--post .ytrc--post--title {  color: var(--yt-spec-text-primary);  display: block;  margin: 10px;  text-decoration: none;}.ytrc--root > .ytrc--tabContainer > .ytrc--tabContentWrapper > .ytrc--post .ytrc--comment > .ytrc--comment--more {  font-size: x-small;  font-weight: bold;}.ytrc--root > .ytrc--tabContainer > .ytrc--tabContentWrapper > .ytrc--post .ytrc--comment > .ytrc--comment--head > .ytrc--comment--toggle {  font-family: Verdana;  font-size: x-small;  cursor: pointer;}.ytrc--root > .ytrc--tabContainer > .ytrc--tabContentWrapper > .ytrc--post .ytrc--comment > .ytrc--comment--head > .ytrc--comment--user {  color: #336699;  margin: 0 5px;  font-weight: bold;  font-size: x-small;}.ytrc--root > .ytrc--tabContainer > .ytrc--tabContentWrapper > .ytrc--post .ytrc--comment > .ytrc--comment--head > .ytrc--comment--info {  font-size: x-small;  color: #888888;}.ytrc--root > .ytrc--tabContainer > .ytrc--tabContentWrapper > .ytrc--post .ytrc--comment > .ytrc--comment--body {  padding-left: 20px;}.ytrc--root > .ytrc--tabContainer > .ytrc--tabContentWrapper > .ytrc--post .ytrc--comment > .ytrc--comment--body.ytrc--comment--collapsed {  display: none;}.ytrc--root > .ytrc--tabContainer > .ytrc--tabContentWrapper > .ytrc--post .ytrc--comment > .ytrc--comment--body > .ytrc--comment--commentBody {  word-wrap: break-word;  margin-bottom: 10px;  font-size: 1.4rem;}';
				container.appendChild(css);
			}
			const tabBar = document.createElement('div'); {
				this.dom.tabBar = tabBar;
				tabBar.classList.add('ytrc--tabBar');
				container.appendChild(tabBar);
			}
			const tabContainer = document.createElement('div'); {
				this.dom.tabContainer = tabContainer;
				tabContainer.classList.add('ytrc--tabContainer');
				container.appendChild(tabContainer);
			}
			yt.parentElement.insertBefore(container, yt);
		}

		this.addTab('YT Comments', yt);
		this.switchTab(`ytrc--${yt.id}`);

		posts.forEach(post=>{
			log('[Gui]', 'creating tab for: ', post);
			const tab = new Tab(post);
			this.addTab(tab.title, tab.dom.root);
		});

		log('[Gui]', '/create');
	}




	addTab(title, content) {
		log('[Gui]', 'addTab', title, content);
		const id = `ytrc--${content.id}`;
		const wrapper = document.createElement('div'); {
			this.dom.tabs[id] = wrapper;
			wrapper.id = id;
			wrapper.classList.add('ytrc--tabContentWrapper');
			wrapper.appendChild(content);
			this.dom.tabContainer.appendChild(wrapper);
		}
		const header = document.createElement('div'); {
			header.classList.add('ytrc--tabHeader');
			header.textContent = title;
			header.title = title;
			header.addEventListener('click', evt=>{
				evt.preventDefault();
				evt.stopPropagation();
				this.switchTab(id);
			});
			this.dom.tabBar.appendChild(header);
		}
	}

	switchTab(newKey) {
		log('[Gui]', 'switchTab', newKey);
		Object.keys(this.dom.tabs).forEach((key)=>{
			if (key == newKey) {
				this.dom.tabs[key].classList.add('ytrc--active');
			} else {
				this.dom.tabs[key].classList.remove('ytrc--active');
			}
		});
	}




	async findYtComments() {
		log('[Gui]', 'findYtComments');
		let yt;
		while (!yt) {
			await wait(0.1);
			log('[Gui]', 'trying to find YT comments');
			yt = $('#comments');
		}
		log('[Gui]', 'found YT comments');
		return yt;
	}
}


class YtRedditComments {
	constructor() {
		this.reddit = new Reddit();
		this.gui = new Gui();

		this.prevUrl = 'INIT';

		if (this.checkUrl()) {
			this.init();
		}

		this.mo = new MutationObserver(this.handleMutations.bind(this));
		this.mo.observe(document.body, {childList:true, subtree:true});
	}

	checkUrl() {
		if (location.href != this.prevUrl) {
			log('url is new');
			this.prevUrl = location.href;
			if (location.href.search(/^https:\/\/www.youtube.com\/watch\?(.*&|)v=.+/) == 0) {
				log('url is video');
				return true;
			}
		}
		return false;
	}

	handleMutations(muts) {
		if (this.checkUrl()) {
			this.init();
		}
	}




	async init() {
		log('init');
		this.gui.remove();
		const posts = await this.reddit.findPosts(location.href);
		log('posts: ', posts);
		this.gui.create(posts);
	}
}
	const app = new YtRedditComments();
	unsafeWindow.ytrc = app;
})();