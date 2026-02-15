import {browse} from "./common/vars.js";
import {BaseProcessor} from "./common/proc.js";

class FlacProcessor extends BaseProcessor {

	async process(dat, metadata, taskId, coverDat = null) {

		// if(DEBUG) console.log("process", taskId);

		dat.url = [dat.url].flat();

		const response = await fetch(dat.url);

		if(!response.ok)
			throw new Error(`http ${response.status}`);

		const contentLength = +(response.headers.get("content-length") || 0);

		if(!contentLength)
			throw new Error("no content");

		let position = 0;
		let progress = 0;
		let data = new Uint8Array(contentLength);

		const reader = response.body.getReader();

		const processChunk = ({
			done, value
		}) => {

			if(done) {

				// download complete

				return;

			}

			data.set(
				value,
				position
			);

			position += value.length;

			const progressing = Math.ceil(position / contentLength * 100);

			if(progressing !== progress) {

				browse.runtime.sendMessage({
					type: "progress",
					task: taskId,
					progress: progressing
				});
					
			}

			progress = progressing;

			return reader.read()
			.then(processChunk);

		};

		await reader.read()
		.then(processChunk);

		// useless ?
		reader.releaseLock();

		if(metadata) {

			try {

				data = this.injectMetadata(
					data,
					metadata,
					coverDat
				);
			
			}
			catch(err) {

				console.warn(
					"metadata inject fail",
					err
				);
			
			}
		
		}

		const blob = URL.createObjectURL(new Blob(
			[data],
			{
				type: "audio/flac"
			}
		));

		data = null;

		return blob;

	}

}

export {
	FlacProcessor
};
