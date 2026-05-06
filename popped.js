import {DEBUG} from "./common/vars.js";
import {Util} from "./common/util.js";

const Root = "https://play.qobuz.com";

const Cfgx = {};

const Optx = {
	"quality": {
		vals: [6, 7, 27]
	},
	"art_size": {
		disp: ["230", "600"],
		vals: [230, 600], // 50 ? o_0'
		defs: 1
	}
};

const Datx = {
	tkn: "token",
	app: "app_id",
	secret: "secret"
};

const Types = {
	VOID: "void",
	USER: "user",
	HOME: "home",
	TRACK: "track",
	ALBUM: "album",
	ARTIST: "artist",
	ARTIST_RELEASES: "artist_releases",
	LABEL: "label",
	PLAYLIST: "playlist",
	PLAYLIST_TRACKS: "playlist_tracks",
	PLAYLISTS: "playlists",
	MIX: "mix", // not used
	FAV_ALBUMS: "fav_albums",
	FAV_TRACKS: "fav_tracks",
	FAV_ARTISTS: "fav_artists"
};

const Typex = [
	Types.USER
];

const Help = {
	cover: (itm, siz = 230) => {

		if(itm.extype === Types.PLAYLIST)
			return itm.image.rectangle;

		return `https://static.qobuz.com/images/covers/${itm.id.slice(-4)
		.split(/(\w\w)/)
		.filter(Boolean)
		.reverse()
		.join("/")}/${itm.id}_${siz}.jpg`;
	
	}
};

const Jacks = {
	[Types.HOME]: {
		nnm: "home",
		hit: "/discover/index"
	},
	[Types.ALBUM]: {
		nnm: "album",
		hit: "/album/get"
	},
	[Types.ARTIST]: {
		nnm: "artist",
		hit: "/artist/page"
	},
	[Types.ARTIST_RELEASES]: {
		nnm: "releases",
		hit: "/artist/getReleases"
	},
	[Types.LABEL]: {
		nnm: "label",
		hit: "/label/get"
	},
	[Types.PLAYLIST]: {
		nnm: "playlist",
		hit: "/playlist/get\\?playlist_id"
	},
	[Types.PLAYLIST_TRACKS]: {
		nnm: "tracklist",
		hit: "/track/getList"
	},
	[Types.PLAYLISTS]: {
		nnm: "playlists",
		hit: "/discover/playlists"
	},
	[Types.USER]: {
		nnm: "user",
		hit: "/user/login"
	},
	// shortcut Favorites\\?type={type}
	[Types.FAV_TRACKS]: {
		nnm: "fav tracks",
		hit: "/favorite/getUserFavorites\\?type=tracks"
	},
	[Types.FAV_ALBUMS]: {
		nnm: "fav albums",
		hit: "/favorite/getUserFavorites\\?type=albums"
	},
	[Types.FAV_ARTISTS]: {
		nnm: "fav artists",
		hit: "/favorite/getUserFavorites\\?type=artists"
	}
	// search results
};

const Parse = {
	[Types.USER]: (dat, cur, bck) => {

		const subs = dat.user.subscription;

		bck.store.user = {
			yes: dat.user.store_features.streaming,
			typ: subs.offer,
			end: new Date(subs.end_date)
			.getTime(),
			cnc: subs.is_canceled,
			extype: Types.USER
		};

		return {
			extype: Types.USER
		};

	},
	[Types.HOME]: dat => {

		const sections = Object.entries({
			[Types.ALBUM]: ["albumOfTheWeek", "idealDiscography", "mostStreamed", "newReleases", "pressAwards", "qobuzissims", "recentReleases"],
			[Types.PLAYLIST]: ["playlists"]
		});

		const parsed = Object.values(dat.containers)
		.map(
			container => {

				const contained = sections.find(([typ, ids]) =>
					ids.includes(container.id));

				if(contained)
					return Util.typed(
						container.data.items,
						contained[0]
					);

				return null;
			
			}
		)
		.filter(Boolean)
		.flat();

		return {
			lst: parsed,
			extype: Types.HOME
		};
	
	},
	[Types.TRACK]: dat => {

	},
	[Types.ALBUM]: dat => {

		return {
			...dat,
			lst: Util.typed(
				dat?.tracks?.items || [],
				Types.TRACK
			),
			count: dat.tracks_count,
			extype: Types.ALBUM
		};

	},
	[Types.ARTIST]: dat => {

		return {
			...dat,
			lst: Util.typed(
				dat.releases.filter(releaseSection =>
					["album", "live", "compilation", "epSingle", "other"]
					.includes(releaseSection.type))
				.flatMap(releaseSection =>
					releaseSection.items),
				Types.ALBUM
			),
			// no count, has_more flag only
			extype: Types.ARTIST
		};

	},
	[Types.ARTIST_RELEASES]: (dat, cur) => {

		if(cur.extype === Types.ARTIST) {

			// what type ? 
			// album live compilation epSingle other
			// detect page filter ?

			return {
				...cur,
				// filter navigate from artist page to releases page
				lst: Util.typed(
					[
						...cur.lst,
						...dat.items.filter(released =>
							!cur.lst.some(release =>
								release.id === released.id))
					],
					Types.ALBUM
				),
				has_more: dat.has_more
			};

		}

		// refreshed discography page, detect main artist (code in TidalExt)
		console.log("who dat ?");

		return null;

	},
	[Types.LABEL]: (dat, cur) => {

		const doom = cur.extype === Types.LABEL;

		return {
			...(doom ? cur : dat),
			lst: Util.typed(
				[
					...(doom ? cur.lst : []),
					...dat.albums.items
				],
				Types.ALBUM
			),
			count: dat.albums_count,
			extype: Types.LABEL
		};

	},
	[Types.PLAYLIST]: dat => {

		return {
			...dat,
			lst: Util.typed(
				dat?.tracks?.items || [],
				Types.TRACK
			),
			count: dat.tracks_count,
			extype: Types.PLAYLIST
		};

	},
	[Types.PLAYLIST_TRACKS]: (dat, cur) => {

		if(dat.tracks.items.length === 1) {

			if(DEBUG)
				console.log("ignore playing track");

			return null;
		
		}

		if(cur.extype === Types.PLAYLIST) {

			return {
				...cur,
				lst: Util.typed(
					Util.uniqid([
						...cur.lst,
						...dat.tracks.items
					]),
					Types.TRACK
				)
			};
		
		}
		else {

			console.log("tracks first");
		
		}

		return null;

	},
	[Types.PLAYLISTS]: (dat, cur) => {

		const doom = cur.extype === Types.PLAYLISTS;

		return {
			...(doom ? cur : dat),
			lst: Util.typed(
				[
					...(doom ? cur.lst : []),
					...dat.items
					//.filter(playlist => !cur.lst.some(listed => playlist.id === listed.id))
				],
				Types.PLAYLIST
			),
			has_more: dat.has_more,
			// no count
			extype: Types.PLAYLISTS
		};

	},
	// same
	[Types.FAV_TRACKS]: (dat, cur) => {

		const doom = cur.extype === Types.FAV_TRACKS;

		return {
			...(doom ? cur : dat),
			id: dat.user.id,
			lst: Util.typed(
				[
					...(doom ? cur.lst : []),
					...dat.tracks.items
				],
				Types.TRACK
			),
			count: dat.tracks.total,
			extype: Types.FAV_TRACKS
		};

	},
	// same
	[Types.FAV_ALBUMS]: (dat, cur) => {

		const doom = cur.extype === Types.FAV_ALBUMS;

		return {
			...(doom ? cur : dat),
			id: dat.user.id,
			lst: Util.typed(
				[
					...(doom ? cur.lst : []),
					...dat.albums.items
				],
				Types.ALBUM
			),
			count: dat.albums.total,
			extype: Types.FAV_ALBUMS
		};

	},
	// how to get banned 101
	[Types.FAV_ARTISTS]: dat => {

	}
};

// popup header
const Heads = {
	[Types.HOME]: dat => {

		const releases = dat.lst.filter(itm =>
			itm.extype === Types.ALBUM);
		const playlists = dat.lst.filter(itm =>
			itm.extype === Types.PLAYLIST);

		return [
			"Discover",
			[
				Util.counts(
					releases.length,
					"release"
				),
				Util.counts(
					playlists.length,
					"playlist"
				)
			],
			[
				Util.counts(
					Util.sumup(
						releases,
						"track_count"
					)
					+ Util.sumup(
						playlists,
						"tracks_count"
					),
					"track"
				),
				Util.times(dat.lst)
			],
			false
		];
		
	},
	[Types.ALBUM]: dat => {

		return [
			`${dat.title}${dat.version ? ` (${dat.version})` : ""}`,
			[
				dat.artist.name,
				new Date(dat.release_date_original)
				.getFullYear(),
				dat.label?.name
			],
			[
				dat.product_type,
				Util.counts(
					dat.lst.length,
					"track"
				),
				Util.times(dat.lst),
				`${dat.maximum_bit_depth}/${Math.floor(dat.maximum_sampling_rate)}`
			],
			dat.streamable
		];
		
	},
	[Types.ARTIST]: dat => {

		return [
			`${dat.name.display}`,
			[
				`${dat.lst.length} releases`,
				Util.counting(
					dat.lst,
					"tracks_count",
					"track"
				),
				Util.times(dat.lst)
			],
			Util.doom(dat.has_more),
			true
		];
		
	},
	// same
	[Types.LABEL]: dat => {

		const len = dat.lst.length;
		const cnt = dat.count;

		return [
			`${dat.name}`,
			[
				Util.counts(
					len,
					"release",
					cnt
				),
				Util.counting(
					dat.lst,
					"tracks_count",
					"track"
				),
				Util.times(dat.lst)
			],
			Util.doom(len < cnt), // dat.has_more ?
			true
		];
		
	},
	// same
	[Types.PLAYLIST]: dat => {

		const len = dat.lst.length;
		const cnt = dat.count;

		return [
			`${dat.name}`,
			[
				Util.counts(
					len,
					"track",
					cnt
				),
				Util.times(dat.lst)
			],
			Util.doom(len < cnt),
			true
		];
		
	},
	// same
	[Types.PLAYLISTS]: dat => {

		return [
			["Playlists", "Coming soon"],
			[
				Util.counts(
					dat.lst.length,
					"playlist"
				),
				Util.counting(
					dat.lst,
					"tracks_count",
					"track"
				),
				Util.times(dat.lst)
			],
			Util.doom(dat.has_more),
			false
		];
		
	},
	// same
	[Types.FAV_ALBUMS]: dat => {

		const len = dat.lst.length;
		const cnt = dat.count;

		return [
			
			"Collection • Releases",
			[
				Util.counts(
					len,
					"release",
					cnt
				),
				Util.counting(
					dat.lst,
					"tracks_count",
					"track"
				),
				Util.times(dat.lst)
			],
			Util.doom(len < cnt), // dat.has_more ?
			true
		];
		
	},
	// same
	[Types.FAV_TRACKS]: dat => {

		const len = dat.lst.length;
		const cnt = dat.count;

		return [
			
			"Collection • Tracks",
			[
				Util.counts(
					len,
					"track",
					cnt
				),
				Util.times(dat.lst)
			],
			Util.doom(len < cnt), // dat.has_more ?
			true
		];
		
	},
	// hello rate limiter
	[Types.FAV_ARTISTS]: dat => {

		return [

		];
		
	}

};

const Items = {
	[Types.TRACK]: (dat, idx, par) =>
		[
			dat,
			`${dat.title}${dat.version ? ` (${dat.version})` : ""}`,
			`${(dat.performer || dat.composer)?.name}`,
			Util.timed(dat.duration),
			dat.streamable,
			[Types.ALBUM, Types.PLAYLIST].includes(par.extype) ? idx : -1
		],
	[Types.ALBUM]: dat =>
		[
			dat,
			`${dat.title}${dat.version ? ` (${dat.version})` : ""}`,
			[
				dat.artist?.name?.display || dat?.artist?.name || dat?.artists?.[0].name,
				new Date(dat?.dates?.original || dat.release_date_original)
				.getFullYear(),
				dat.label?.name
			],
			[
				dat.release_type,
				Util.counts(
					dat.tracks_count || dat.track_count, // wtf homepage
					"track"
				),
				Util.timed(dat.duration),
				`${dat?.audio_info?.maximum_bit_depth || dat.maximum_bit_depth}/${Math.floor(dat?.audio_info?.maximum_sampling_rate || dat.maximum_sampling_rate)}`,
				`${dat.genre?.name.toLowerCase()}`
			],
			dat?.rights?.streamable || dat.streamable
		],
	[Types.PLAYLIST]: dat =>
		[
			dat,
			dat.name,
			dat.genres.map(genre =>
				genre.name)
			.join(", "),
			[
				"playlist",
				Util.counts(
					dat.tracks_count,
					"track"
				),
				Util.timed(dat.duration)
			],
			false // coming soon
		]
};

const Urls = {
	[Types.ALBUM]: "/album/{id}",
	[Types.PLAYLIST]: "/playlist/{id}"
};

export {
	Root,
	Cfgx,
	Optx,
	Datx,
	Types,
	Typex,
	Help,
	Jacks,
	Parse,
	Heads,
	Items,
	Urls
};
		