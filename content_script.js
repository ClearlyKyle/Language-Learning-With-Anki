(function ()
{
	/* This runs on all "youtube.com/watch" web pages */
	console.log("----- [content_script.js] LOADED");

	function SendMessageToBackGround(text)
	{
		// send sucess message to background
		chrome.runtime.sendMessage({
			message: text
		});
	}

	/* YOUTUBE */
	if (window.location.href.includes("youtube.com/watch"))
	{
		console.log("Adding button to youtube video")
		SendMessageToBackGround("[MAIN] Adding button to youtube video")

		// we loop until the element 'lln-full-dict' is available 
		var check_dict_wrap_exists = setInterval(function ()
		{
			// 1st : lln-full-dict-wrap    is loaded with no elements
			// 2nd : lln-full-dict         is loaded the first time a word is clicked to translate

			SendMessageToBackGround("[MAIN] looking for 'lln-full-dict'")

			//document.querySelector('.lln-full-dict-wrap')
			//document.querySelector('lln-full-dict')

			//if (document.getElementsByClassName('lln-full-dict').length)
			if (document.getElementsByClassName('lln-full-dict').length)
			//if (document.getElementsByClassName('lln-full-dict-wrap').length)
			{
				clearInterval(check_dict_wrap_exists);
				//var wait_for_first_click = setInterval(function ()
				//{
				//	console.log("waiting for first click...")
				//	SendMessageToBackGround("waiting for first click...")
				//	if (document.querySelector('.lln-full-dict') != null)
				//	{
				//		SendMessageToBackGround("Handeling first click of subtitles...")
				//		AddAnkiButtonToPopupDictionary()
				//		clearInterval(wait_for_first_click);
				//	}
				//}, 100);

				SendMessageToBackGround("[MAIN] 'lln-full-dict-wrap' has been found! Start Observer")
				AddAnkiButtonToPopupDictionary()

				var dictionary_observer = new MutationObserver(function (mutations)
				{
					for (let mutation of mutations)
					{
						console.log(mutation)
						if (mutation.removedNodes.length === 2)
						{
							SendMessageToBackGround("[MutationObserver] Adding ANKI option")
							AddAnkiButtonToPopupDictionary()
							return
						}
					}
				});

				// keep your eyes open for the next time we see the dictionary open
				//dictionary_observer.observe(document.querySelector('.lln-full-dict'), { attributes: true, childList: true });
				dictionary_observer.observe(document.getElementsByClassName('lln-full-dict-wrap')[0], { attributes: true, childList: true });
				SendMessageToBackGround("'lln-full-dict' Observer has been set!")



				//var  = new MutationObserver(function (mutations)
				//{
				//	for (let mutation of mutations)
				//	{
				//		if (mutation.removedNodes.length === 2)
				//		{
				//			SendMessageToBackGround("[MutationObserver] Adding ANKI option")
				//			AddAnkiButtonToPopupDictionary()
				//			return
				//		}
				//	}
				//});
				//observer.observe(document.getElementsByClassName('lln-full-dict-wrap')[0], { attributes: true, childList: true });

				//AddFunctionsToSideBarSubs();


				// work around to get first instance of dictionary poping up
				//if (document.getElementsByClassName('anki-btn')[0] == null)
				//	AddAnkiButtonToPopupDictionary()

			}
		}, 100); // check every 100ms 
	}

	function AddAnkiButtonToPopupDictionary()
	{
		let btn_location = document.getElementsByClassName('lln-external-dicts-container')[0];

		/* create Anki Button */
		let anki_div = document.createElement("div");
		anki_div.className = "anki-btn lln-external-dict-btn tippy";
		anki_div.innerHTML = "Anki";
		anki_div.setAttribute("data-tippy-content", "Send to Anki");

		// HANDLE SIDE BAR DICT
		if (document.querySelector('.lln-full-dict.right') != null)
			anki_div.onclick = Handle_Side_Bar_Dictionary;
		// HANDLE SUBTITLE DICT
		else if (document.querySelector('.lln-full-dict') != null)
			anki_div.onclick = Handle_Subtitle_Dictionary;

		btn_location.appendChild(anki_div)

		SendMessageToBackGround("Boom! Button has been added!")
	}

	function Handle_Side_Bar_Dictionary()
	{
		SendMessageToBackGround("[Handle_Subtitle_Dictionary] Side Bar Dictionary has been clicked...")
		return;
		// We want to save the word for the current subtitle in the sidebar, so first we need to 
		//	set that subtitle as "active"

		// if there is no current "active", then we cannot remove the "active"
		if (document.querySelector('.lln-vertical-view-sub.lln-with-play-btn.active') != null)
			document.getElementsByClassName("lln-vertical-view-sub lln-with-play-btn active")[0].classList.remove("active")

		// Add "active" to the current "anki-active"
		SendMessageToBackGround("[HandleSideBar] adding 'active' to 'anki-active'")
		document.getElementsByClassName("anki-active")[0].classList.add("active");

		// Click the "active" subtitle
		//	this should jump the video to where the subtitle is being said
		SendMessageToBackGround("[HandleSideBar] clicking the subtitle")
		document.querySelector(".lln-vertical-view-sub.lln-with-play-btn.anki-active").click();


		const video_element = document.getElementsByClassName('html5-main-video')[0];
		video_element.pause();

		var checkExist = setTimeout(function ()
		{
			//your code to be executed after X ms
			SendMessageToBackGround("[HandleSideBar] pause the video!")

			if (video_element.readyState === 4)
			{
				// The user agent is actively trying to download data.
				SendMessageToBackGround("[HandleSideBar] Time to make a flashcard)))")
				LLW_sendtoAnki(Side_Bar_Dictionary_GetData());
				clearInterval(checkExist);
			}
			else
			{
				SendMessageToBackGround("[HandleSideBar] Video ready state = " + video_element.readyState)
			}

		}, 250);
	}

	function Handle_Subtitle_Dictionary()
	{
		SendMessageToBackGround("[Handle_Subtitle_Dictionary] Subtitle Dictionary has been clicked...")
		return;
		// dic shown when word in righ subtitle screen is clicked
		//    "lln-full-dict right"
		if (document.querySelector('.lln-full-dict.right') != null)
		{
			// We have the side bar dictionary open

			SendMessageToBackGround("SIDE BAR DICTIONARY")
			AddFunctionsToSideBarSubs();
		}
		else if (document.querySelector('.lln-full-dict') != null)
		{
			// We have the subtitle bar dictionary open
			SendMessageToBackGround("SUBTITLE DICTIONARY")
			LLW_sendtoAnki(SubtitleDictionaryGetData());
		}
	}

	function Side_Bar_Dictionary_GetData()
	{
		console.log("")
		console.log("")
		console.log("LLW_sendtoAnki -> Sending to ANKI")
		SendMessageToBackGround("[LLW_sendtoAnki] Sending to Anki...")

		var canvas = document.createElement('canvas');
		var video = document.querySelector('video');
		var ctx = canvas.getContext('2d');

		// Change the size here
		canvas.width = 640;
		canvas.height = 360;

		ctx.drawImage(video, 0, 0, 640, 360);

		var dataURL = canvas.toDataURL("image/png");
		dataURL = dataURL.replace(/^data:image\/(png|jpg);base64,/, "")

		/* making time stamped url */
		var videoId = document.querySelectorAll('[itemprop="videoId"]')[0].content;
		var current_time = document.querySelector(".video-stream").currentTime.toFixed();
		var youtube_share_url = "https://youtu.be/" + videoId + "?t=" + current_time; /* example: https://youtu.be/RksaXQ4C1TA?t=123 */

		/* make the file name unique to avoid duplicates */
		const imageFilename = 'Youtube2Anki_' + canvas.width + 'x' + canvas.height + '_' + videoId + '_' + Math.random().toString(36).substring(7) + '.png';

		/* Getting translation of the word selected */
		// make sure the translation language is set to english
		if (document.getElementsByClassName('lln-dict-contextual').length)
		{
			var word = document.getElementsByClassName('lln-dict-contextual')[0].children[1].innerText;
			var translation_text = document.getElementsByClassName('lln-dict-contextual')[0].innerText; // ex: '3k\nвпечатлениях\nimpressions'
			var translation_text_without_most_common_number = translation_text.split("\n").slice(1);// removing the 3k, 2k, 4k, from the translation
			//var translation = translation_text_without_most_common_number.join('\n').replace(/(?:\r\n|\r|\n)/g, '<br>'); // replace line brea '\n' with <br> tag
			var translation = translation_text_without_most_common_number.join('<br>'); // replace line brea '\n' with <br> tag
		} else
		{
			var word = ""
			var translation = ""
		}
		if (document.getElementsByClassName('lln-dict-section-full').length)
		{
			//var extra_definitions = document.getElementsByClassName('lln-dict-section-full')[0].innerText.replace(/(?:\r\n|\r|\n)/g, '<br>');
			var extra_definitions = document.getElementsByClassName('lln-dict-section-full')[0].innerHTML;
		}


		console.log("Video URL (and time stamp) =", youtube_share_url)

		// make selected word bold in the subtitles
		var subtitle = document.getElementsByClassName('lln-subs')[0].innerText.replace(word, "<b>" + word + "</b>");

		//var notify_div = document.createElement('div')
		//notify_div.id = "notify"
		//document.body.append(notify_div)

		var fields = {
			[ankiFieldScreenshotSelected]: '<img src="' + imageFilename + '" />',
			[ankiSubtitleSelected]: subtitle,
			[ankiWordSelected]: word,
			[ankiBasicTranslationSelected]: translation,
			[ankiOtherTranslationSelected]: extra_definitions,
			[ankiFieldURL]: '<a href="' + youtube_share_url + '">Video Link</a>'
		};

		return fields;
	}

	function SubtitleDictionaryGetData()
	{
		console.log("")
		console.log("")
		console.log("LLW_sendtoAnki -> Sending to ANKI")
		SendMessageToBackGround("[LLW_sendtoAnki] Sending to Anki...")

		var canvas = document.createElement('canvas');
		var video = document.querySelector('video');
		var ctx = canvas.getContext('2d');

		// Change the size here
		canvas.width = 640;
		canvas.height = 360;

		ctx.drawImage(video, 0, 0, 640, 360);

		var dataURL = canvas.toDataURL("image/png");
		dataURL = dataURL.replace(/^data:image\/(png|jpg);base64,/, "")

		/* making time stamped url */
		var videoId = document.querySelectorAll('[itemprop="videoId"]')[0].content;
		var current_time = document.querySelector(".video-stream").currentTime.toFixed();
		var youtube_share_url = "https://youtu.be/" + videoId + "?t=" + current_time; /* example: https://youtu.be/RksaXQ4C1TA?t=123 */

		/* make the file name unique to avoid duplicates */
		const imageFilename = 'Youtube2Anki_' + canvas.width + 'x' + canvas.height + '_' + videoId + '_' + Math.random().toString(36).substring(7) + '.png';

		/* Getting translation of the word selected */
		// make sure the translation language is set to english
		if (document.getElementsByClassName('lln-dict-contextual').length)
		{
			var word = document.getElementsByClassName('lln-dict-contextual')[0].children[1].innerText;
			var translation_text = document.getElementsByClassName('lln-dict-contextual')[0].innerText; // ex: '3k\nвпечатлениях\nimpressions'
			var translation_text_without_most_common_number = translation_text.split("\n").slice(1);// removing the 3k, 2k, 4k, from the translation
			//var translation = translation_text_without_most_common_number.join('\n').replace(/(?:\r\n|\r|\n)/g, '<br>'); // replace line brea '\n' with <br> tag
			var translation = translation_text_without_most_common_number.join('<br>'); // replace line brea '\n' with <br> tag
		} else
		{
			var word = ""
			var translation = ""
		}
		if (document.getElementsByClassName('lln-dict-section-full').length)
		{
			//var extra_definitions = document.getElementsByClassName('lln-dict-section-full')[0].innerText.replace(/(?:\r\n|\r|\n)/g, '<br>');
			var extra_definitions = document.getElementsByClassName('lln-dict-section-full')[0].innerHTML;
		}


		console.log("Video URL (and time stamp) =", youtube_share_url)

		// make selected word bold in the subtitles
		var subtitle = document.getElementsByClassName('lln-subs')[0].innerText.replace(word, "<b>" + word + "</b>");

		//var notify_div = document.createElement('div')
		//notify_div.id = "notify"
		//document.body.append(notify_div)

		var fields = {
			[ankiFieldScreenshotSelected]: '<img src="' + imageFilename + '" />',
			[ankiSubtitleSelected]: subtitle,
			[ankiWordSelected]: word,
			[ankiBasicTranslationSelected]: translation,
			[ankiOtherTranslationSelected]: extra_definitions,
			[ankiFieldURL]: '<a href="' + youtube_share_url + '">Video Link</a>'
		};

		return fields;
	}

	function AddFunctionsToSideBarSubs()
	{
		// We have the side bar dictionary open
		// Jump video to where subtitle is, then pause it before making flashcard

		SendMessageToBackGround("[AddFunctionsToSideBarSubs] Adding all 'onclick' events...")
		var all_subs = document.getElementById('lln-vertical-view-subs').children; //returns a HTMLCollection

		for (var i = 0; i < all_subs.length; i++)
		{ // iterate over it
			all_subs[i].onclick = function (event)
			{   // attach event listener individually
				console.log("CLICKED")
				console.log(event.target)
				console.log(event.target.parentNode)

				let currentElement = event.target
				let index_id = 0;
				// loop for current active 
				while (currentElement.parentNode != null)
				{
					// Remove active tag
					// Set new active tag
					// Click active tag
					if (currentElement.classList.contains("active"))
					{
						break;
					}

					currentElement = currentElement.parentNode;
					console.log("Current Element..")
					console.log(currentElement)
					if (currentElement.hasAttribute("data-index"))
					{
						// Current "data-index" of the element with the word we have just clicked on
						console.log(currentElement.getAttribute("data-index"));
						index_id = currentElement.getAttribute("data-index");

						// First, we need to set this element to "anki-active"
						// If nothing has an "anki-active" tag, then we cannot remove it to move it to another element
						if (document.querySelector(".anki-active") != null)
							document.getElementsByClassName("anki-active")[0].classList.remove("anki-active")

						// Set current "data-index" as the "anki-active"
						document.querySelector("[data-index=\"" + index_id + "\"]").classList.add("anki-active")


						//if (document.querySelector(".lln-vertical-view-sub lln-with-play-btn active") == null)
						//	document.querySelector("[data-index=\"" + index_id + "\"]").classList.add("active")

						//document.querySelector("[data-index=\"" + index_id + "\"]").classList.add("anki-active")

						console.log("Current Anki Selected Sub")
						console.log(document.querySelector("[data-index=\"" + index_id + "\"]"))
						console.log(document.querySelector(".anki-active"))
						break;
						//document.getElementsByClassName("lln-vertical-view-sub lln-with-play-btn anki-active")[0].classList.remove("anki-active")
					}
				}
				//setTimeout(function ()
				//{
				//	//your code to be executed after X ms
				//	document.getElementsByClassName('html5-main-video')[0].pause();
				//	//LLW_sendtoAnki();
				//}, 100);
			}
		}
	}

	/* ----------------------------------------------------------------------------------------------------------- */
	function LLW_sendtoAnki(fields)
	{
		console.log("[LLW_sendtoAnki] Sending to Anki...")
		SendMessageToBackGround("[LLW_sendtoAnki] Sending to Anki...")

		chrome.storage.local.get(
			['ankiDeckNameSelected', 'ankiNoteNameSelected', 'ankiFieldScreenshotSelected', 'ankiSubtitleSelected',
				'ankiWordSelected', "ankiBasicTranslationSelected", "ankiOtherTranslationSelected", "ankiFieldURL", "ankiConnectUrl"],
			({ ankiDeckNameSelected, ankiNoteNameSelected, ankiFieldScreenshotSelected, ankiSubtitleSelected,
				ankiWordSelected, ankiBasicTranslationSelected, ankiOtherTranslationSelected, ankiFieldURL, ankiConnectUrl }) =>
			{
				url = ankiConnectUrl || 'http://localhost:8765';
				model = ankiNoteNameSelected || 'Basic';
				deck = ankiDeckNameSelected || 'Default';

				console.log(
					{
						ankiDeckNameSelected, ankiNoteNameSelected, ankiFieldScreenshotSelected, ankiSubtitleSelected,
						ankiWordSelected, ankiBasicTranslationSelected, ankiOtherTranslationSelected, ankiFieldURL, ankiConnectUrl
					}
				)

				console.log("Image File Name: ", imageFilename)
				console.log("Deck Name: ", model)
				console.log("Model Name: ", deck)

				//var fields = {
				//	[ankiFieldScreenshotSelected]: '<img src="' + imageFilename + '" />',
				//	[ankiSubtitleSelected]: subtitle,
				//	[ankiWordSelected]: word,
				//	[ankiBasicTranslationSelected]: translation,
				//	[ankiOtherTranslationSelected]: extra_definitions,
				//	[ankiFieldURL]: '<a href="' + youtube_share_url + '">Video Link</a>'
				//};

				var body = {
					"action": "multi",
					"params": {
						"actions": [
							{
								"action": "storeMediaFile",
								"params": {
									"filename": imageFilename,
									"data": dataURL
								}
							},
							{
								"action": "addNote",
								"params": {
									"note": {
										"modelName": model,
										"deckName": deck,
										"fields": fields,
										"tags": ["LLW_to_Anki"]
									}
								}
							}
						]
					}
				};

				var permission_data = {
					"action": "requestPermission",
					"version": 6,
				};

				fetch(url, {
					method: "POST",
					body: JSON.stringify(permission_data),
				})
					.then((res) => res.json())
					.then((data) =>
					{
						console.log(data);
						fetch(url, {
							method: "POST",
							body: JSON.stringify(body),
						})
							.then((res) => res.json())
							.then((data) =>
							{
								console.log("Fetch Return:")
								console.log(data)
								if (data.result === null)
								{
									// https://jsfiddle.net/2qasgcfd/3/
									// https://github.com/apvarun/toastify-js
									ShowErrorMessage("Error! " + error);
									return
								}
								else
								{
									/* show sucess message */
									ShowSucessMessage("Sucessfully added to ANKI");
								}
							})
							.catch((error) =>
							{
								/* show error message */
								ShowErrorMessage("Error! " + error);
							})
					}).catch((error) =>
					{
						/* show error message */
						ShowErrorMessage("Error! " + error);
					});
				console.log("Send to ANKI complete!");
				SendMessageToBackGround("[LLW_sendtoAnki] Send to ANKI complete!");
			}
		);
	}

	function ShowSucessMessage(message)
	{
		// SUCESS
		Toastify({
			text: message,
			duration: 3000,
			style: {
				background: "light blue",
			}
		}).showToast();
		//console.log(message);
		SendMessageToBackGround(message);
	}
	function ShowErrorMessage(message)
	{
		Toastify({
			text: message,
			duration: 3000,
			style: {
				background: "red",
			}
		}).showToast();
		//console.log(message);
		SendMessageToBackGround(message);
	}
})();

