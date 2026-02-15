import {Util} from "./common/util.js";
import {QobuzBackground} from "./background.js";
import {QobuzOffscreen} from "./offscreen.js";
import {QobuzPopup} from "./popup.js";

switch(Util.where) {

	case "bck":
		new QobuzBackground();
		break;
	case "cnt":
		// TODO CONTENT SCRIPT CLASS
		break;
	case "pop":
		window.onload = () =>
			new QobuzPopup();
		break;
	case "off":
		new QobuzOffscreen();
		break;

}