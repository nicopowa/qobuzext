import {browse, DEBUG, Type} from "./common/vars.js";
import {Backstage} from "./common/back.js";
import {MD5} from "./md5.js";

class QobuzBackground extends Backstage {

	constructor() {

		super();

		this.urlBase = "https://play.qobuz.com/";
		this.apiBase = "https://www.qobuz.com/api.json/0.2/";
		this.quality = "6";

		this.dat = {
			...this.dat,
			heads: false,
			appId: "",
			token: "",
			secret: ""
		};

		this.heads(this.apiBase + "*");

		this.bundler = this.bundle.bind(this);
		this.bundling();

		this.watch({
			// single track qobuz.com main domain
			"/album/get": this.handleAlbum,
			"/artist/page": this.handleArtist,
			"/artist/getReleases": this.handleReleases,
			"/label/get": this.handleLabel,
			"/playlist/get?": this.handlePlaylist,
			"/track/getList": this.handleTracklist
			// search results page
		});
	
	}

	async liftoff() {

		await super.liftoff();

		const secret = await this.getSetting("secret");

		if(secret) {

			if(DEBUG)
				console.log("recall secret");

			this.dat.secret = secret;
			this.dat.auth = true;
		
		}
	
	}

	heading(evt) {

		//if(DEBUG) console.log("api", evt.url.replace(this.apiBase, ""));

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

		//if(DEBUG) console.log("bundle");

		browse.webRequest.onCompleted.removeListener(this.bundler);

		let bundleCode = await (await fetch(
			res.url,
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

			this.dat.auth = false;

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

				const getFile = ["track", "getFileUrl"];

				const reqs = {
					// format_id: "5", // mp3 ?
					format_id: this.quality,
					intent: "stream",
					// track_id: "5966783" // dummy
					track_id: vibes[[Math.floor(Math.random() * vibes.length)]]
				};

				const strs = getFile.join("") + Object.entries(reqs)
				.map(([k, v]) =>
					k + v)
				.join("");

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
					console.log("found secret");

				this.dat.secret = secret;

				await browse.storage.local.set({
					secret: secret
				});

				this.dat.auth = true;

				this.ready();

				// was continue;
				break;
			
			}
			catch(err) {

				// silent
				if(DEBUG)
					console.log(
						"invalid secret",
						secret
					);
			
			}
		
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
			`${this.apiBase}${endpoint}${query}`,
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

	sameTab(tab, dat) {

		const cur = this.medias.get(tab.id) || {
			extype: Type.VOID,
			id: 0
		};

		if(cur.extype === dat.extype && cur.id === dat.id)
			return cur;

		return null;
	
	}

	handleAlbum(tab, dat) {

		dat = {
			...dat,
			tracks: dat?.tracks?.items || [],
			extype: Type.ALBUM
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

		const cur = this.mediaTab(tab);

		if(cur.extype === Type.ARTIST) {

			cur.releases.push(...dat.items.filter(releasing =>
				!cur.releases.some(release =>
					release.id === releasing.id)));

			cur.hasMore = dat.has_more;

			if(DEBUG)
				console.log(
					tab.id,
					cur.extype,
					cur
				);

			this.syncPopup();

		}
		else {

			console.warn("WHO DAT ?");
		
		}
	
	}

	handleArtist(tab, dat) {

		dat = {
			...dat,
			extype: Type.ARTIST
		};

		const releasesTypes = ["album", "live", "compilation", "epSingle", "other"];

		const releasesKeeps = dat.releases.filter(releaseSection =>
			releasesTypes.includes(releaseSection.type))
		.flatMap(releaseSection =>
			releaseSection.items.filter(release =>
				release.rights?.streamable)); // || release.streamable

		dat.releases = releasesKeeps;

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

		dat = {
			...dat,
			extype: Type.LABEL
		};

		const cur = this.sameTab(
			tab,
			dat
		);

		if(cur) {

			// use limit, offset, total ?
			dat.albums.items.unshift(...cur.albums.items.filter(album =>
				!dat.albums.items.some(versus =>
					versus.id === album.id)));
		
		}

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

	handlePlaylist(tab, dat) {

		dat = {
			...dat,
			tracks: dat?.tracks?.items || [],
			extype: Type.LIST
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

	handleTracklist(tab, dat) {

		const media = this.mediaTab(tab);

		if(media.extype === Type.LIST) {

			for(const newTrack of dat.tracks.items)
				if(!media.tracks.find(hasTrack =>
					hasTrack.id === newTrack.id))
					media.tracks.push(newTrack);

			if(DEBUG)
				console.log(
					"tracklist",
					media
				);

			this.mediaHint();

			this.syncPopup();

		}

	}

	async getRelease(releaseId) {

		//if(DEBUG) console.log("get release", releaseId);

		// was try/catch

		const releaseData = await this.request(
			"album/get",
			{
				album_id: releaseId,
				offset: 0,
				limit: 250 // was 50
			}
		);

		//console.log(releaseData);

		return {
			...releaseData,
			tracks: releaseData?.tracks?.items || []
		};

	}

	trackList(media) {

		return (media?.tracks || [])
		.filter(track =>
			track.streamable);
	
	}

	playlistInfos(list) {

		return {
			listName: list.name,
			tracks: list.tracks_count
		};
		
	}

	getTrackInfos(track) {

		return {
			title: this.trackTitle(track),
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

	getCoverUrl(media) {

		return (media?.image || media?.album?.image)?.large;

	}

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

		if(rules && rules.list) {

			const listName = this.sanitize(rules.listName);

			const trackIndex = rules.indx.toString()
			.padStart(
				rules.tracks.toString().length,
				"0"
			);

			filePath = `${listName}/${trackIndex}. ${artistName} - ${trackTitle}`;

		}

		const fileExt = ".flac";

		return `Qobuz/${filePath}${fileExt}`;

	}

	getMetaData(track, album) {

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

			...(track.isrc ? {
				"ISRC": track.isrc
			} : {}),

			...(album.upc ? {
				"UPC": album.upc
			} : {}),

			// URL

			...(track.audio_info?.replaygain_track_gain ? {
				"REPLAYGAIN_TRACK_GAIN": track.audio_info.replaygain_track_gain + " dB"
			} : {}),

			...(track.audio_info?.replaygain_track_peak ? {
				"REPLAYGAIN_TRACK_PEAK": String(track.audio_info.replaygain_track_peak)
			} : {})

		};
	
	}

}

//new QobuzBackground();

export {
	QobuzBackground
};
