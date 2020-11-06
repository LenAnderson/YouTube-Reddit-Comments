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

	async loadMore(postLink, id) {
		log('[Reddit]', 'loadMore', postLink, id);
		return new Promise(resolve=>{
			GM_xmlhttpRequest({
				method: 'GET',
				url: `https://www.reddit.com${postLink}${id}.json`,
				onload: (resp)=>resolve(this.parsePost(JSON.parse(resp.responseText)))
			});
		});
	}


	parsePost(post) {
		log('[Reddit]', 'parsePost', post);
		return {
			header: post[0].data.children[0].data,
			comments: post[1].data.children
		};
	}
}