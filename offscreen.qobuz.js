import {BaseOffscreenProcessor} from "./common/off.js"
import {FlacProcessor} from "./common/proc.flac.js"

class QobuzOffscreenProcessor extends BaseOffscreenProcessor {

	constructor() {

		super();

		this.flacProcessor = new FlacProcessor();
	
	}

	async process(dat, metadata, messageId, cover) {

		return await this.flacProcessor.process(
			dat,
			metadata,
			messageId,
			cover
		);
	
	}

}

new QobuzOffscreenProcessor();