'use strict';

// delete require.cache[require.resolve('./data/core.json')]
const referrersMain		= require('./data/core.json');
const referrersNews 	= require('./data/referrers-news.json');
const countries 		= require('./data/countries.json');
const url 				= require('url');
const fs 				= require('fs');
const querystring 		= require('querystring');

let referrers 			= referrersMain;
referrers.news 			= referrersNews;

let Referer = function(ref) {

	if (!ref) {
		throw new Error('No referral URL found');
	}

	let data 	= url.parse(ref);
	this.refferal = {};
	//sometimes when there is no protocol, url doesn't do anything
	//so we will have to do it ourselves
	if (data.host === null) {
		if (ref.indexOf('/') > 0) {
			let splits = ref.split('/');
			data.host = splits[0];
			data.path = ref.slice(splits[0].length);
			data.pathname = data.path;
		} else {
			data.host = ref;
		}
	}

	let res = this.searcher(data);

	//no information was found, lets reurn the host and move on 
	if (res === null) {
		this.refferal.host = data.host;
		// this.refferal.ss = data.host;
		return;
	}

	res 		= this.puller(res, data);

	if (res.type) { 	this.refferal.type 		= res.type }
	if (res.name) { 	this.refferal.name 		= res.name }
	if (res.search) { 	this.refferal.search 	= res.search }
	if (data.host) { 	this.refferal.host 		= data.host }

};

Referer.prototype.searcher = function(data) {

		//there a few different types of ways that the site is figured out going from exact to fairly broad chances
		//1. exact match of the hosts - no regexing, just string for string the same
		//2. finding the hostname within the string
		//3. finding the hostname within the string with non standard tld
		//4. finding the hostname within the string with all iso tld
		//if we can't find it in with any of these filters, we probably are not aware of it

		// first try for an exact match
		for (let medium in referrers) {
			for (let domain in referrers[medium]) {
				for (let urlIndex = 0 ; urlIndex < referrers[medium][domain].urls.length ; urlIndex++) {
					if (referrers[medium][domain].urls[urlIndex] === data.host) {
						//it has been found
						return {
							type: medium,
							name: domain,
							data: referrers[medium][domain]
						};
					}
				}
			}
		}	

		// lets try find containing chars
		for (let medium in referrers) {
			for (let domain in referrers[medium]) {
				for (let urlIndex = 0 ; urlIndex < referrers[medium][domain].urls.length ; urlIndex++) {
					if ( data.host.indexOf(referrers[medium][domain].urls[urlIndex]) >= 0) {
						//it has been found
						return {
							type: medium,
							name: domain,
							data: referrers[medium][domain]
						};
					}
				}
			}
		}	

		//now try for a custom tld and sld
		const domains = ['.com', '.co.uk', '.co.jp', '.co.kr', '.co.nf'];
		let withoutTLD;

		for (let medium in referrers) {
			for (let domain in referrers[medium]) {
				for (let urlIndex = 0 ; urlIndex < referrers[medium][domain].urls.length ; urlIndex++) {
					//if there is a regex at the end
					if (referrers[medium][domain].urls[urlIndex].endsWith('.{}')) {
						for(let dinx = 0 ; dinx < domains.length ; dinx++) {
							withoutTLD = referrers[medium][domain].urls[urlIndex].slice(0, -3);
							if (data && data.host && data.host.includes(withoutTLD + domains[dinx])) {
								return {
									type: medium,
									name: domain,
									data: referrers[medium][domain]
								};
							}
						}
					}
				}
			}
		}


		//now try for a tdl based on country
		for (let medium in referrers) {
			for (let domain in referrers[medium]) {
				for (let urlIndex = 0 ; urlIndex < referrers[medium][domain].urls.length ; urlIndex++) {
					//if there is a regex at the end
					if (referrers[medium][domain].urls[urlIndex].endsWith('.{}')) {
						let shortURL = referrers[medium][domain].urls[urlIndex].slice(0, -3);
						for (let country in countries.countries) {
							if (data.host.includes(shortURL + countries.countries[country].tld)) {
								return {
									type: medium,
									name: domain,
									data: referrers[medium][domain]
								};
							}
						}
					}
				}
			}
		}

		//we cant figure out where it is from
		return null;
};

Referer.prototype.puller = function(result, data) {

	if (result.type === 'search' || result.type === 'bbc' && result.name === 'search') {
		//pull out queries
		if (data.hash) {
			data.hash = data.hash.substr(1);
			let ps = querystring.parse(data.hash);

			for (let idx = 0 ; idx < result.data.params.length; idx++) {
				for (let uri in ps) {
					if (uri === result.data.params[idx]) {
						result.search = ps[uri];
						return result;
					}
				}
			} 
		}

		if (data.search) {
			let ps = querystring.parse(data.search);
			for (let idx = 0 ; idx < result.data.params.length; idx++) {
				for (let uri in ps) {
					if (uri === result.data.params[idx]) {
						result.search = ps[uri];
						return result;
					}
				}
			} 
		}

		if (data.query) {
			let ps = querystring.parse(data.query);
			for (let idx = 0 ; idx < result.data.params.length; idx++) {
				for (let uri in ps) {
					if (uri === result.data.params[idx]) {
						result.search = ps[uri];
						return result;
					}
				}
			} 
		}
	}

	return result;
};

module.exports = Referer;
