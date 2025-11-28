import {browse, DEBUG} from "./common/vars.js";
import {Backstage} from "./common/back.js";
import {MD5} from "./md5.js";

class QobuzBackground extends Backstage {

	constructor() {

		super();

		this.urlBase = "https://play.qobuz.com/";
		this.quality = "6";

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

				if(DEBUG)
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

		browse.webRequest.onCompleted.addListener(
			this.bundler,
			{
				urls: [this.urlBase + "*/bundle.js"]
			}
		);
	
	}

	async bundle(res) {

		// if(DEBUG) console.log("bundle");

		browse.webRequest.onCompleted.removeListener(this.bundler);

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

		bundleCode = "";

		if(!secrets.size) {

			this.icon.back("#ce2626");

			if(DEBUG)
				console.error("no secrets");

			this.dat.auth = false;

			return;
		
		}

		const unix = Math.floor(Date.now() / 1000);

		const getFile = ["track", "getFileUrl"];

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

		const reqs = {
			// format_id: "5", // mp3 ?
			format_id: this.quality,
			intent: "stream",
			// track_id: "5966783" // todo randomize
			track_id: vibes[[Math.floor(Math.random() * vibes.length)]]
		};

		const strs = getFile.join("") + Object.entries(reqs)
		.map(([k, v]) =>
			k + v)
		.join("");

		for(const secret of secrets) {

			try {

				const sig = MD5.hash(`${strs}${unix}${secret}`);

				await this.request(
					getFile.join("/"),
					{
						request_sig: sig,
						request_ts: unix,
						...reqs
					}
				);

				if(DEBUG)
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

			this.handleError({
				error: "secret fail"
			});

		}

		this.bundling();

	}

	async request(endpoint, params = {}) {

		const query = Object.keys(params).length
			? "?" + new URLSearchParams(params) : "";
		
		const res = await fetch(
			// keep www
			`https://www.qobuz.com/api.json/0.2/${endpoint}${query}`,
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

	handleAlbum(tab, dat) {

		dat = {
			...dat,
			extype: "album"
		};

		this.medias.set(
			tab.id,
			dat
		);

		if(DEBUG)
			console.log(
				tab.id,
				dat.extype,
				dat
			);

		this.mediaHint();

		this.syncPopup();

	}

	handleReleases(tab, dat) {

		dat = {
			...dat,
			extype: "releases"
		};

		this.medias.set(
			tab.id,
			dat
		);

		if(DEBUG)
			console.log(
				tab.id,
				dat.extype,
				dat
			);

		this.syncPopup();
	
	}

	handleArtist(tab, dat) {

		dat = {
			...dat,
			extype: "artist"
		};

		this.medias.set(
			tab.id,
			dat
		);

		if(DEBUG)
			console.log(
				tab.id,
				dat.extype,
				dat
			);

		this.mediaHint();

		this.syncPopup();

	}

	handleLabel(tab, dat) {

	}

	handlePlaylist(tab, dat) {

		dat = {
			...dat,
			extype: "playlist"
		};

		this.medias.set(
			tab.id,
			dat
		);

		if(DEBUG)
			console.log(
				tab.id,
				dat.extype,
				dat
			);

	}

	handleTracklist(tab, dat) {

		if(this.media?.extype === "playlist") {

			this.media.tracks = dat.tracks;

			if(DEBUG)
				console.log(
					"tracklist",
					this.media
				);

		}

		this.syncPopup();

	}

	async getReleaseInfos(releaseId) {

		if(DEBUG)
			console.log(
				"get release infos",
				releaseId
			);

		const releaseInfos = await this.request(
			"album/get",
			{
				album_id: releaseId,
				offset: 0,
				limit: 50
			}
		);

		//console.log(releaseInfos);

		return releaseInfos;

	}

	trackList(tabId, media) {

		//if(!this.medias.has(tabId)) return [];

		return ((media || this.medias.get(tabId))?.tracks?.items || [])
		.filter(track =>
			track.streamable);
	
	}

	getTrackInfos(track, album) {

		return {
			title: this.trackTitle(track),
			album: this.albumTitle(album),
			artist: (track.performer || track.composer).name
		};
	
	}

	async getTrackUrl(track, quality) {

		super.getTrackUrl(
			track.id,
			quality
		);

		const unix = Math.floor(Date.now() / 1000);
		const sig = MD5.hash(`trackgetFileUrlformat_id${quality}intentstreamtrack_id${track.id}${unix}${this.dat.secret}`);

		return await this.request(
			"track/getFileUrl",
			{
				request_ts: unix,
				request_sig: sig,
				track_id: track.id,
				format_id: quality,
				intent: "stream"
			}
		);
	
	}

	getCoverUrl(tabId, media) {

		//return (media.album || this.medias.get(tabId))?.image?.large;
		return (media.image || media?.album.image || this.medias.get(tabId).image)?.large;

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

		// https://wiki.hydrogenaudio.org/index.php?title=Tag_Mapping
		// https://datatracker.ietf.org/doc/html/rfc5215
		// https://wiki.xiph.org/VorbisComment
		
		return {

			"TITLE": this.trackTitle(track),
			...(track.version && {
				"VERSION": track.version
			}),
			"ARTIST": track.performer?.name || album?.artist?.name || "Unknown",

			"ALBUM": this.albumTitle(album),
			"ALBUMARTIST": album?.artist?.name || "Unknown",

			...(track.copyright && {
				"COPYRIGHT": track.copyright
			}),

			...(album.genre && {
				"GENRE": album.genre.name
			}),

			"DATE": new Date(album?.release_date_original || 0)
			.getFullYear(),

			"TRACKNUMBER": String(track.track_number || 1),
			"TOTALTRACKS": String(album?.tracks_count || ""),

			...(track.isrc && {
				"ISRC": track.isrc
			}),

			...(album.upc && {
				"UPC": album.upc
			}),

			// URL

			...(track.audio_info?.replaygain_track_gain && {
				"REPLAYGAIN_TRACK_GAIN": track.audio_info.replaygain_track_gain + " dB"
			}),

			...(track.audio_info?.replaygain_track_peak && {
				"REPLAYGAIN_TRACK_PEAK": String(track.audio_info.replaygain_track_peak)
			})

		};
	
	}

}

new QobuzBackground();