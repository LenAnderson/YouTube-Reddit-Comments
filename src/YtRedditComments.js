${include: Reddit.js}
${include: Gui.js}


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
		this.gui.create([]);
		this.gui.posts = await this.reddit.findPosts(location.href);
	}
}