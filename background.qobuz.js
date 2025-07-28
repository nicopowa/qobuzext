const browser = chrome;

import {Backstage, BaseQueueManager} from "./common/back.js";

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

class QobuzQueueManager extends BaseQueueManager {

	async downloadTask(task) {

		const trackData = await this.main.trackUrl(
			task.track.id,
			task.quality
		);

		if(!trackData.url)
			throw new Error("no download url");

		await this.startDownload(
			trackData.url,
			task
		);
	
	}

}

class QobuzBackground extends Backstage {

	constructor() {

		super();

		this.dat = {
			auth: false,
			appId: "",
			token: "",
			secret: ""
		};

		this.queue = new QobuzQueueManager(this);

		this.heading = this.heads.bind(this);
		this.bundling = this.bundle.bind(this);

		this.init();
	
	}
	
	async init() {

		browser.webRequest.onBeforeSendHeaders.addListener(
			this.heading,
			{
				urls: ["https://www.qobuz.com/api.json/0.2/*"]
			},
			[
				"requestHeaders"
			]
		);

		this.bundleHook();

		const dataUrls = {
			"/album/get": this.handleAlbum,
			"/artist/page": this.handleArtist,
			"/artist/getReleases": this.handleReleases

		};

		Object.entries(dataUrls)
		.forEach(([url, cbk]) =>
			this.track(
				url,
				cbk.bind(this)
			));

		await this.queue.init("offscreen.qobuz.html");
	
	}

	heads(evt) {

		const appIdHeader = evt.requestHeaders.find(reqHeader =>
			reqHeader.name === "X-App-Id");

		const userAuthTokenHeader = evt.requestHeaders.find(reqHeader =>
			reqHeader.name === "X-User-Auth-Token");

		if(appIdHeader && userAuthTokenHeader) {

			if(this.dat.appId !== appIdHeader.value || this.dat.token !== userAuthTokenHeader.value) {

				console.log("auth header");
			
				this.dat.appId = appIdHeader.value;
				this.dat.token = userAuthTokenHeader.value;
				this.dat.auth = true;
			
			}

		}

		return {
			requestHeaders: evt.requestHeaders
		};

	}

	bundleHook() {

		browser.webRequest.onCompleted.addListener(
			this.bundling,
			{
				urls: ["https://play.qobuz.com/*/bundle.js"]
			}
		);
	
	}

	async bundle(res) {

		console.log("parse bundle");

		browser.webRequest.onCompleted.removeListener(this.bundling);

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
				catch(err) {
					// silent
				}
			
			}
		
		}

		bundleCode = null;

		if(!secrets.size) {

			console.error("no secrets");

			this.icon.back("#ce2626");

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

				continue;
			
			}
			catch(err) {
				// silent
			}
		
		}

		if(!this.dat.secret) {

			console.error("secret fail");

			this.icon.back("#ce2626");

		}

		this.bundleHook();

	}

	async request(endpoint, params = {}) {

		const query = Object.keys(params).length
			? "?" + new URLSearchParams(params) : "";
		
		const res = await fetch(
			// must keep www
			`https://www.qobuz.com/api.json/0.2${endpoint}${query}`,
			{
				headers: {
					"Content-Type": "application/json",
					...(this.dat.auth ? {
						"X-User-Auth-Token": this.dat.token,
						"X-App-Id": this.dat.appId
					} : {})
				}
			}
		);

		if(!res.ok)
			throw new Error(`http ${res.status}: ${res.statusText}`);
		
		const dat = await res.json();

		if(dat.status && dat.status !== "success")
			throw new Error(dat.message || "api request failed");

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

	}

	async trackUrl(trackId, formatId) {

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

	filename(track, album) {

		const trackNum = String(track.track_number || 1)
		.padStart(
			2,
			"0"
		);

		const ext = ".flac";
		const title = this.sanitize(this.trackName(track));
		const artist = this.sanitize(track.performer?.name || album?.artist?.name || "Unknown");
		const albumTitle = this.sanitize(album?.title || "Unknown");
		const year = new Date(album.release_date_original)
		.getFullYear();

		return `Qobuz/${artist}/${albumTitle} (${year})/${trackNum}. ${title}${ext}`;
	
	}
	
	async handleDownload(msg) {

		try {

			const {
				mediaType, mediaId, quality
			} = msg;

			const coverBlob = await this.getCover(this.media.image.small);

			if(mediaType === "track") {

				const track = this.media?.tracks.items.find(track =>
					track.id === mediaId);

				if(track) {

					this.trackDownload(
						track,
						this.media,
						quality,
						coverBlob
					);

				}
			
			}
			else if(mediaType === "album") {

				for(const track of this.media.tracks?.items || []) {

					this.trackDownload(
						track,
						this.media,
						quality,
						coverBlob
					);
				
				}
			
			}
			else {

				return {
					ok: false,
					error: "invalid media type"
				};
			
			}

			return {
				ok: true
			};
		
		}
		catch(err) {

			return {
				ok: false,
				error: err.message
			};
		
		}
	
	}

	trackMeta(track, album) {

		return {
			"TITLE": track.title || "Unknown",
			"ARTIST": track.performer?.name || album?.artist?.name || "Unknown",
			"ALBUM": album?.title || "Unknown",
			"TRACKNUMBER": String(track.track_number || 1),
			"ALBUMARTIST": album?.artist?.name || "Unknown",
			"DATE": new Date(album?.release_date_original || 0)
			.getFullYear(),
			"TOTALTRACKS": String(album?.tracks_count || "")
		};
	
	}

}

new QobuzBackground();