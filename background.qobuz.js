const browser = chrome;

import {Backstage} from "./common/back.js";

class Util {

	static md5(s) {

		const L = (x, c) =>
			(x << c) | (x >>> (32 - c));

		const C = (q, a, b, x, s, t) =>
			(b + L(
				(a + q + x + t) | 0,
				s
			)) | 0;

		const K = new Uint32Array(64);

		for(let i = 0; i < 64; i++)
			K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32);
		
		const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
		
		const b = new TextEncoder()
		.encode(s);
		const p = new Uint8Array(((b.length + 8) >>> 6 << 6) + 64);

		p.set(b);
		p[b.length] = 0x80;
		
		const dv = new DataView(p.buffer);

		dv.setUint32(
			p.length - 8,
			b.length * 8,
			true
		);
		dv.setUint32(
			p.length - 4,
			0,
			true
		);
		
		let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
		
		for(let i = 0; i < p.length; i += 64) {

			const chunkView = new DataView(
				p.buffer,
				i,
				64
			);
			const X = new Uint32Array(16);

			for(let j = 0; j < 16; j++)
				X[j] = chunkView.getUint32(
					j * 4,
					true
				);
			
			let [a, b1, c, d] = [a0, b0, c0, d0];
			let f, g;
			
			for(let j = 0; j < 64; j++) {

				if(j < 16) {

					f = (b1 & c) | (~b1 & d);
					g = j;
				
				}
				else if(j < 32) {

					f = (b1 & d) | (c & ~d);
					g = (5 * j + 1) % 16;
				
				}
				else if(j < 48) {

					f = b1 ^ c ^ d;
					g = (3 * j + 5) % 16;
				
				}
				else {

					f = c ^ (b1 | ~d);
					g = (7 * j) % 16;
				
				}
				
				const tmp = d;

				d = c;
				c = b1;
				b1 = C(
					f,
					a,
					b1,
					X[g],
					S[j],
					K[j]
				);
				a = tmp;
			
			}
			
			a0 = (a0 + a) | 0;
			b0 = (b0 + b1) | 0;
			c0 = (c0 + c) | 0;
			d0 = (d0 + d) | 0;
		
		}
		
		return [a0, b0, c0, d0].map(n =>
			("00000000" + ((((n >>> 24) & 0x000000ff) | ((n >>> 8) & 0x0000ff00) | ((n << 8) & 0x00ff0000) | ((n << 24) & 0xff000000)) >>> 0).toString(16)).slice(-8))
		.join("");
	
	}

}

class QobuzBackground extends Backstage {

	constructor() {

		super("offscreen.qobuz.html");

		this.urlBase = "https://play.qobuz.com/";

		this.dat = {
			...this.dat,
			heads: false,
			appId: "",
			token: "",
			secret: ""
		};

		this.heads("https://www.qobuz.com/api.json/0.2/*");

		this.bundler = this.bundle.bind(this);
		this.bundling();

		this.watch({
			// single track qobuz.com main domain
			"/album/get": this.handleAlbum,
			"/artist/page": this.handleArtist,
			"/artist/getReleases": this.handleReleases,
			// label
			"/playlist/get?": this.handlePlaylist,
			"/track/getList": this.handleTracklist
			// search results
		});
	
	}

	heading(evt) {

		const appIdHeader = evt.requestHeaders.find(reqHeader =>
			reqHeader.name === "X-App-Id")?.value;

		const userAuthTokenHeader = evt.requestHeaders.find(reqHeader =>
			reqHeader.name === "X-User-Auth-Token")?.value;

		if(appIdHeader && userAuthTokenHeader) {

			if(this.dat.appId !== appIdHeader || this.dat.token !== userAuthTokenHeader) {

				console.log("auth data");
			
				this.dat.appId = appIdHeader;
				this.dat.token = userAuthTokenHeader;
				this.dat.heads = true;
			
			}

		}

		return {
			requestHeaders: evt.requestHeaders
		};

	}

	bundling() {

		browser.webRequest.onCompleted.addListener(
			this.bundler,
			{
				urls: [this.urlBase + "*/bundle.js"]
			}
		);
	
	}

	async bundle(res) {

		// console.log("bundle");

		browser.webRequest.onCompleted.removeListener(this.bundler);

		let bundleCode = await (await fetch(res.url)).text();

		const secrets = new Set();
		const seeds = [...bundleCode.matchAll(/[a-z]\.initialSeed\("([\w=]+)",window\.utimezone\.([a-z]+)\)/g)];

		for(const [, seed, timezone] of seeds) {

			const infoMatch = bundleCode.match(
				new RegExp(`name:"\\w+/${timezone[0].toUpperCase() + timezone.slice(1)}",info:"([\\w=]+)",extras:"([\\w=]+)"`)
			);

			if(infoMatch) {

				try {

					const combined = seed + infoMatch[1] + infoMatch[2];

					const decoded = atob(combined.slice(
						0,
						-44
					));

					if(decoded.length === 32 && /^[a-f0-9]+$/.test(decoded)) {

						secrets.add(decoded);
					
					}
				
				}
				catch(err) {} // silent
			
			}
		
		}

		bundleCode = null;

		if(!secrets.size) {

			this.icon.back("#ce2626");

			console.error("no secrets");

			this.dat.auth = false;

			return;
		
		}

		const unix = Math.floor(Date.now() / 1000);

		const getFile = ["track", "getFileUrl"];

		const reqs = {
			format_id: "5",
			intent: "stream",
			track_id: "5966783"
		};

		const strs = getFile.join("") + Object.entries(reqs)
		.map(([k, v]) =>
			k + v)
		.join("");

		for(const secret of secrets) {

			try {

				const sig = Util.md5(`${strs}${unix}${secret}`);

				await this.request(
					"/" + getFile.join("/"),
					{
						request_sig: sig,
						request_ts: unix,
						...reqs
					}
				);

				console.log("secret found");

				this.dat.secret = secret;

				this.dat.auth = true;

				this.ready();

				continue;
			
			}
			catch(err) {} // silent
		
		}

		if(!this.dat.secret) {

			this.dat.auth = false;

			this.icon.back("#ce2626");

			console.error("secret fail");

		}

		this.bundling();

	}

	async request(endpoint, params = {}) {

		const query = Object.keys(params).length
			? "?" + new URLSearchParams(params) : "";
		
		const res = await fetch(
			// keep www
			`https://www.qobuz.com/api.json/0.2${endpoint}${query}`,
			{
				headers: {
					"Content-Type": "application/json",
					...(this.dat.heads ? {
						"X-User-Auth-Token": this.dat.token,
						"X-App-Id": this.dat.appId
					} : {})
				}
			}
		);

		if(!res.ok)
			throw new Error(`http ${res.status}: ${res.statusText}`);
		
		const dat = await res.json();

		return dat;
	
	}

	handleAlbum(dat) {

		this.media = {
			...dat,
			extype: "album"
		};

		console.log(
			"album",
			this.media
		);

		this.mediaHint();

		this.syncMedia();

	}

	handleReleases(dat) {

		this.media = {
			...dat,
			extype: "releases"
		};

		console.log(
			"releases",
			this.media
		);

		this.syncMedia();
	
	}

	handleArtist(dat) {

		this.media = {
			...dat,
			extype: "artist"
		};

		console.log(
			"artist",
			this.media
		);

		this.syncMedia();

	}

	handleLabel(dat) {

	}

	handlePlaylist(dat) {

		this.media = {
			...dat,
			extype: "playlist"
		};

		console.log(
			"playlist",
			this.media
		);

	}

	handleTracklist(dat) {

		if(this.media.extype === "playlist") {

			this.media.tracks = dat.tracks;

			console.log(
				"tracklist",
				this.media
			);

		}

		this.syncMedia();

	}

	trackList() {

		return this?.media?.tracks?.items || [];
	
	}

	async getTrackUrl(trackId, formatId) {

		const unix = Math.floor(Date.now() / 1000);
		const sig = Util.md5(`trackgetFileUrlformat_id${formatId}intentstreamtrack_id${trackId}${unix}${this.dat.secret}`);

		return await this.request(
			"/track/getFileUrl",
			{
				request_ts: unix,
				request_sig: sig,
				track_id: trackId,
				format_id: formatId,
				intent: "stream"
			}
		);
	
	}

	getCoverUrl(media) {

		return (media.album || this.media)?.image?.small;

	}

	getFilePath(track, album) {

		// album?.artists.length === 0
		// album?.subtitle.toLowerCase() === "various artists"
		const variousArtists = album.artist?.name.toLowerCase()
		.startsWith("various");

		const artistName = this.sanitize(variousArtists ? "Various Artists" : album?.artist?.name || album?.composer?.name);

		const albumTitle = this.sanitize(this.albumTitle(album));

		const albumYear = new Date(album.release_date_original || 0)
		.getFullYear();

		const trackNum = String(track.track_number || 1)
		.padStart(
			2,
			"0"
		);

		const fileName = this.sanitize(`${trackNum}. ${variousArtists ? track?.performer.name + " -" : ""} ${this.trackTitle(track)}`);
		
		const fileExt = ".flac";

		return `Qobuz/${artistName}/${albumTitle} (${albumYear})/${fileName}${fileExt}`;

	}

	getMetaData(track, album) {

		return {
			"TITLE": this.trackTitle(track),
			"ARTIST": track.performer?.name || album?.artist?.name || "Unknown",
			"ALBUM": this.albumTitle(album),
			"TRACKNUMBER": String(track.track_number || 1),
			"ALBUMARTIST": album?.artist?.name || "Unknown",
			"DATE": new Date(album?.release_date_original || 0)
			.getFullYear(),
			"TOTALTRACKS": String(album?.tracks_count || "")
		};
	
	}

}

new QobuzBackground();