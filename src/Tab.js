${include: CommentMore.js}
${include: Comment.js}


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
					const comm = new CommentMore(root.data, this.post.header.permalink);
					body.appendChild(comm.dom.root);
				} else {
					const comm = new Comment(root.data, this.post.header.permalink);
					body.appendChild(comm.dom.root);
				}
			});
		}
		log('[Tab]', '/createTab');
	}
}