// ==Userscript==
// @name         YouTube - Reddit Comments
// @namespace    https://github.com/LenAnderson/
// @downloadURL  https://github.com/LenAnderson/YouTube-Reddit-Comments/raw/master/youtube_reddit_comments.user.js
// @version      1.1
// @author       LenAnderson
// @match        https://www.youtube.com/*
// @grant        GM_xmlhttpRequest
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




	${include: YtRedditComments.js}
	const app = new YtRedditComments();
})();