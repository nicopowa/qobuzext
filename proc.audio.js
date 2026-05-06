import {browse, Msg, Stat} from "./common/vars.js";
import {BaseProcessor} from "./common/proc.js";

class AudioProcessor extends BaseProcessor {

	async process(dat, metadata, taskId, coverDat = null, rules = {}, opts = {}) {

		const res = await fetch(dat.url);

		if(!res.ok)
			throw new Error(`http ${res.status}`);

		const contentLength = +(res.headers.get("content-length") || 0);

		if(!contentLength) // useless ?
			throw new Error("no content");

		const reader = res.body.getReader();

		// wait for all metadata blocks
		const {
			streamInfo, audioStart
		} = await this.drainMetadata(reader);

		// replace FLAC header
		// signature + STREAMINFO + VORBIS_COMMENT + PICTURE
		let header;

		try {

			header = metadata
				? this.buildFlacHeader(
					streamInfo,
					metadata,
					coverDat
				)
				: this.buildFlacHeader(
					streamInfo,
					{},
					null
				);

		}
		catch(err) {

			console.warn(
				"metadata fail",
				err
			);

			header = this.buildFlacHeader(
				streamInfo,
				{},
				null
			);

		}

		// new header + buffered audio bytes + remaining chunks
		let downloaded = audioStart.length;
		let lastProgress = 0;

		const reportProgress = bytes => {

			const pct = Math.ceil(bytes / contentLength * 100);

			if(pct === lastProgress)
				return;

			lastProgress = pct;

			browse.runtime.sendMessage({
				type: Msg.PROGRESS,
				id: taskId,
				sts: Stat.LOAD,
				progress: pct
			});

		};

		const stream = new ReadableStream({

			start(controller) {

				controller.enqueue(header);

				if(audioStart.length)
					controller.enqueue(audioStart);

				reportProgress(downloaded);

			},

			pull(controller) {

				return reader.read()
				.then(({
					done, value
				}) => {

					if(done) {

						controller.close();

						return;

					}

					downloaded += value.length;
					reportProgress(downloaded);
					controller.enqueue(value);

				});

			},

			cancel() {

				reader.cancel("cancelled");

			}

		});

		const blob = await new Response(
			stream,
			{
				headers: {
					"Content-Type": "audio/flac"
				}
			}
		)
		.blob();

		return URL.createObjectURL(blob);

	}

	/**
	 * @param {!(ReadableStreamDefaultReader<*>|ReadableStreamBYOBReader)} reader
	 * @return {Promise<{streamInfo: !Uint8Array, audioStart: !Uint8Array}>}
	 */
	async drainMetadata(reader) {

		// loop for metadata complete
		let buf = new Uint8Array(0);

		while(true) {

			// track metadata end
			if(buf.length >= 8) {

				const view = new DataView(
					buf.buffer,
					buf.byteOffset,
					buf.byteLength
				);

				if(view.getUint32(
					0,
					false
				) !== this.FLAC_SIGNATURE)
					throw new Error("invalid flac signature");

				let pos = 4;
				let complete = false;

				while(pos + 4 <= buf.length) {

					const h = view.getUint32(
						pos,
						false
					);
					const isLast = (h & 0x80000000) !== 0;
					const blockSize = h & 0x00FFFFFF;

					// incomplete block data, please wait
					if(pos + 4 + blockSize > buf.length)
						break;

					pos += 4 + blockSize;

					if(isLast) {

						complete = true;
						break;

					}

				}

				if(complete) {

					// extract STREAMINFO first 34 bytes
					const firstHeader = view.getUint32(
						4,
						false
					);
					const firstSize = firstHeader & 0x00FFFFFF;
					const streamInfo = buf.slice(
						8,
						8 + firstSize
					);

					// preserve initial audio data
					const audioStart = buf.slice(pos);

					return {
						streamInfo, audioStart
					};

				}

			}

			// missing metadata blocks, pull next chunk
			const {
				done, value
			} = await reader.read();

			if(done)
				throw new Error("metadata fail stream ended");

			// append chunk
			const next = new Uint8Array(buf.length + value.length);

			next.set(buf);
			next.set(
				value,
				buf.length
			);

			buf = next;

		}

	}

}

export {
	AudioProcessor
};