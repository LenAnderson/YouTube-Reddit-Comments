class CommentMore {
	constructor(comment, postLink) {
		this.comment = comment;
		this.postLink = postLink;

		log('[CommentMore]', comment);
		
		this.dom = {
			root: null
		};

		this.reddit = new Reddit();

		const root = document.createElement('div'); {
			this.dom.root = root;
			root.classList.add('ytrc--comment');
			const more = document.createElement('a'); {
				more.classList.add('ytrc--comment--more');
				more.textContent = `load more comments (${comment.children.length})`;
				var clicked = false;
				more.addEventListener('click', async(evt)=>{
					evt.preventDefault();
					evt.stopPropagation();
					if (clicked) return;
					clicked = true;
					more.textContent = 'loading...';
					const data = await this.reddit.loadMore(this.postLink, this.comment.id);
					more.textContent = 'loaded!';
					log('[CommentMore]', data);
					try {
						const frag = document.createDocumentFragment();
						data.comments.forEach(comment=>{
							if (comment.kind == 'more') {
								frag.appendChild((new CommentMore(comment.data, this.postLink)).dom.root);
							} else {
								frag.appendChild((new Comment(comment.data, this.postLink)).dom.root);
							}
						});
						this.dom.root.parentElement.replaceChild(frag, this.dom.root);
					} catch(ex) {
						log('[EX]', ex);
					}
				});
				root.appendChild(more);
			}
		}
	}
}