import {BaseOffscreenProcessor} from "./common/off.js";
import {FlacProcessor} from "./proc.flac.js";

class QobuzOffscreenProcessor extends BaseOffscreenProcessor {

	constructor() {

		super();

		this.flacProcessor = new FlacProcessor();
	
	}

	async process(dat, metadata, messageId, cover) {

		// if(DEBUG) console.log("process", taskId);

		return await this.flacProcessor.process(
			dat,
			metadata,
			messageId,
			cover
		);
	
	}

}

new QobuzOffscreenProcessor();