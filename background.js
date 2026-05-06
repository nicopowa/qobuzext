import {browse, DEBUG} from "./common/vars.js";
import {Backstage} from "./common/back.js";
import {Util} from "./common/util.js";

class ExtBck extends Backstage {

	constructor() {

		super();

		this.apiPath = "/api.json/0.2";
		this.apiBase = "https://www.qobuz.com" + this.apiPath;

		this.dat = {
			heads: false,
			bundl: ""
		};

		this.heads(this.apiBase + "/*");

		this.bundler = this.bundle.bind(this);
		this.bundling();
	
	}

	/**
	 * @override
	 */
	async liftoff() {

		await super.liftoff();
	
	}

	/**
	 * @override
	 */
	preqsup(evt) {

		super.preqsup(evt);
	
	}

	/**
	 * @override
	 */
	headsup(evt) {

		//if(DEBUG) console.log("api", evt.url.replace(this.apiBase, ""));

		const appId = Util.headerValue(
			evt.requestHeaders,
			"X-App-Id"
		);

		const userToken = Util.headerValue(
			evt.requestHeaders,
			"X-User-Auth-Token"
		);

		if(appId && userToken) {

			if(!this.dat.heads) {

				if(DEBUG)
					console.log("auth data");
			
				this.store.app = appId;
				this.store.tkn = userToken;
				this.dat.heads = true;

				if(this.dat.bundl) {

					if(DEBUG)
						console.log("bundle get");

					this.bundled();
				
				}
			
			}

		}

	}

	bundling() {

		if(DEBUG)
			console.log("bundling");

		browse.webRequest.onCompleted.addListener(
			this.bundler,
			{
				urls: [this.urlHost + "*/bundle.js"],
				types: ["script"]
			}
		);
	
	}

	async bundle(res) {

		//if(DEBUG) console.log("bundle", res);

		browse.webRequest.onCompleted.removeListener(this.bundler);

		this.dat.bundl = res.url;

		if(this.dat.heads) {

			await this.bundled();

		}
		else {

			if(DEBUG)
				console.log("bundle hold");
		
		}

	}

	async bundled() {

		const bndurl = this.dat.bundl;

		this.dat.bundl = "";

		let bundleCode = await (await fetch(
			bndurl,
			{
				cache: "no-store"
			}
		)).text();

		let secrets = [];
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

					if(/^[a-f0-9]{32}$/.test(decoded)) {

						secrets.push(decoded);
					
					}
				
				}
				catch(err) {} // silent
			
			}
		
		}

		bundleCode = "";

		if(!secrets.length) {

			this.icon.back("#ce2626");

			if(DEBUG)
				console.error("no secrets");

			return;
		
		}

		const vibes = [
			"300659650", // Lui Mafuta - Colour Fields
			"64511322", // Luomo - The Right Wing
			"12555922", // Ice Cube - You Know How We Do it
			"154179542", // L'Entourloop - Fi Di Yut
			"777565", // Bob Marley - War / No More Trouble
			"100845277", // Nina Simone - Work Song
			"69987976", // Jacques Brel - Les Bourgeois
			"90528592", // Luis Mariano - C'est Magnifique
			"8824465" // Narciso Yepes - Recuerdos De La Alhambra
		];

		// always last ?
		secrets = Array.from(new Set(secrets))
		.reverse();

		for(const secret of secrets) {

			try {

				const unix = Math.floor(Date.now() / 1000);

				// keep empty string -> leading slash
				const getFile = ["", "track", "getFileUrl"];

				//const getFile = ["", "file", "url"]; // web player uses this one

				const reqs = {
					//"format_id": "5", // mp3 ?
					//"track_id": "5966783" // dummy
					"format_id": "6",
					"intent": "stream",
					"track_id": vibes[Math.floor(Math.random() * vibes.length)]
				};

				const strs = getFile.join("") + Object.entries(reqs)
				.map(([k, v]) =>
					k + v)
				.join("");

				const sig = MD5.hash(`${strs}${unix}${secret}`);

				await this.request(
					getFile.join("/"),
					{
						"request_sig": sig,
						"request_ts": unix,
						...reqs
					}
				);

				if(DEBUG)
					console.log("found secret");

				this.store.secret = secret;

				this.ready();

				break;
			
			}
			catch(err) {

				if(DEBUG)
					console.log(
						"invalid secret",
						secret
					);

				//console.log(err);
			
			}
		
		}

		if(!this.store.secret) {

			this.icon.back("#ce2626");

			this.handleError({
				error: "secret fail"
			});

		}
	
	}

	async request(endpoint, params = {}) {

		const query = Object.keys(params).length
			? "?" + new URLSearchParams(params) : "";

		const reqUrl = `${this.apiBase}${endpoint}${query}`;
		
		const res = await fetch(
			reqUrl,
			{
				headers: {
					"Content-Type": "application/json",
					...(this.dat.heads ? {
						"X-User-Auth-Token": this.store.tkn,
						"X-App-Id": this.store.app
					} : {})
				}
			}
		);

		if(!res.ok)
			throw new Error(`http ${res.status} ${reqUrl} : ${res.statusText}`);
		
		const dat = await res.json();

		return dat;
	
	}

	/**
	 * @override
	 */
	handleStore(msg) {

		super.handleStore(msg);

		if(msg.data["localuser"]) {

			if(DEBUG)
				console.log(
					"localuser",
					JSON.parse(msg.data["localuser"])
				);
		
		}
	
	}

	/**
	 * @override
	 */
	async getRelease(releaseId) {

		const releaseData = await this.request(
			"/album/get",
			{
				"album_id": releaseId,
				"offset": 0,
				"limit": 250 // was 50
			}
		);

		// testing
		//const releaseBrainz = await this.musicBrainz(releaseData.upc);
		//console.log(releaseBrainz);

		return {
			...releaseData,
			lst: releaseData?.tracks?.items || []
		};

	}

	/**
	 * @override
	 * @return {Array<QobuzTrack>}
	 */
	trackList(media) {

		return (media?.lst || [])
		.filter(track =>
			track.streamable);
	
	}

	/**
	 * @override
	 */
	trackRules(track) {
		
		return {};
	
	}

	/**
	 * @override
	 */
	listRules(media) {

		return {
			title: media.name,
			count: media.count
		};
		
	}

	/**
	 * @override
	 */
	getTrackInfos(track) {

		return {
			title: this.trackTitle(track),
			artist: (track.performer || track.composer).name
		};
	
	}

	/**
	 * @override
	 */
	async getTrackUrl(task) {

		const trid = task.track.id;
		const qual = task.quality;
		const unix = Math.floor(Date.now() / 1000);
		const sig = MD5.hash(`trackgetFileUrlformat_id${qual}intentstreamtrack_id${trid}${unix}${this.store.secret}`);

		return await this.request(
			"/track/getFileUrl",
			{
				"request_ts": unix,
				"request_sig": sig,
				"track_id": trid,
				"format_id": qual,
				"intent": "stream"
			}
		);
	
	}

	/**
	 * @override
	 */
	getFilePath(track, album, rules) {

		// album?.artists.length === 0
		// album?.subtitle.toLowerCase() === "various artists"
		const variousArtists = album.artist?.name.toLowerCase()
		.startsWith("various");

		const artistName = this.sanitize(variousArtists ? "Various Artists" : album?.artist?.name || album?.composer?.name);
		const albumTitle = this.sanitize(this.albumTitle(album));

		const albumYear = new Date(album.release_date_original || 0)
		.getFullYear();

		const albumPart = album.media_count > 1 && track.media_number || 0; // media_count

		const trackNum = String(track.track_number || 1)
		.padStart(
			2,
			"0"
		);

		const trackTitle = this.sanitize(`${variousArtists ? track?.performer.name + " - " : ""}${this.trackTitle(track)}`);

		let filePath = `${artistName}/${albumTitle} (${albumYear})/${albumPart ? `CD${albumPart}/` : ""}${trackNum}. ${trackTitle}`;

		if(rules.list) {

			const listName = this.sanitize(rules.title);

			const trackIndex = rules.indx ? rules.indx.toString()
			.padStart(
				rules.count.toString().length,
				"0"
			) + ". " : "";

			filePath = `${listName}/${trackIndex}${artistName} - ${trackTitle}`;

		}

		return `Qobuz/${filePath}.flac`;

	}

	/**
	 * @override
	 */
	getMetaData(track, album, brain = {}) {

		// https://wiki.hydrogenaudio.org/index.php?title=Tag_Mapping
		// https://datatracker.ietf.org/doc/html/rfc5215
		// https://wiki.xiph.org/VorbisComment
		
		return {

			"TITLE": this.trackTitle(track),
			...(track.version ? {
				"VERSION": track.version
			} : {}),
			
			"ARTIST": track.performer?.name || album?.artist?.name || "Unknown",

			"ALBUM": this.albumTitle(album),
			"ALBUMARTIST": album?.artist?.name || "Unknown",

			...(track.composer ? {
				"COMPOSER": track?.composer?.name
			} : {}),

			...(track.copyright ? {
				"COPYRIGHT": track.copyright
			} : {}),

			...(album.genre ? {
				"GENRE": album.genre.name
			} : {}),

			...(album?.release_date_original ? {
				"DATE": new Date(album.release_date_original)
				.getFullYear(),
				"ORIGINALDATE": album.release_date_original
			} : {}),

			"TRACKNUMBER": String(track.track_number || 1),
			"TOTALTRACKS": String(album?.tracks_count || 1),

			"DISCNUMBER": String(track?.media_number || 1),
			"DISCTOTAL": String(album?.media_count || 1),

			...(track.isrc ? {
				"ISRC": track.isrc
			} : {}),

			...(album.upc ? {
				"UPC": album.upc
			} : {}),

			"URL": album.url,

			...(track.audio_info?.replaygain_track_gain ? {
				"REPLAYGAIN_TRACK_GAIN": track.audio_info.replaygain_track_gain + " dB"
			} : {}),

			...(track.audio_info?.replaygain_track_peak ? {
				"REPLAYGAIN_TRACK_PEAK": String(track.audio_info.replaygain_track_peak)
			} : {})

			// REPLAYGAIN_ALBUM_GAIN

		};
	
	}

}

class MD5 {

	static hash(s) {

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

export {
	ExtBck
};
