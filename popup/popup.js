
var fetchOptions = function (selectId, url, action, params = {})
{
	var selectEl = document.getElementById(selectId);

	return new Promise((resolve, reject) =>
	{
		chrome.storage.local.get(selectId, (stored) =>
		{
			var storedVal = stored[selectId] || 'Basic';

			fetch(url, { method: "POST", body: JSON.stringify({ "action": action, "params": params }) }).then(r => r.json()).then(data =>
			{
				data.forEach((item) =>
				{
					e = document.createElement("option");
					e.value = item;
					e.text = item;
					if (item === storedVal) e.selected = true;
					selectEl.appendChild(e);
				})
				if (action === "modelFieldNames")
				{
					e = document.createElement("option");
					e.value = "";
					e.text = "";
					selectEl.add(e);
				}

			}).then(r => resolve(r)).catch(e => console.log(e));
		});
	});
}

var saveOption = function (selectId)
{
	var selectEl = document.getElementById(selectId);
	console.log('saveOption', selectEl.value)
	return chrome.storage.local.set({ [selectId]: selectEl.value })
}

function Show_Colour_Options()
{
	chrome.storage.local.get(["ankiHighLightSavedWords", "ankiHighLightColour"], ({ ankiHighLightSavedWords, ankiHighLightColour }) =>
	{
		console.log("Stored Highlight colour : ", ankiHighLightColour)
		console.log("Stored Highlight colour toggle : ", ankiHighLightSavedWords)

		document.getElementById("ankiHighLightSavedWords").checked = ankiHighLightSavedWords;
		document.getElementById("ankiHighLightColour").value = ankiHighLightColour;
	})
}

function Set_Colour_Options()
{
	var high_check_state = document.getElementById("ankiHighLightSavedWords").checked
	var high_colour_value = document.getElementById("ankiHighLightColour").value

	console.log("Setting colour options...")
	console.log(high_check_state)
	console.log(high_colour_value)

	return chrome.storage.local.set({ ["ankiHighLightSavedWords"]: high_check_state, ["ankiHighLightColour"]: high_colour_value })
}

document.addEventListener("DOMContentLoaded", function ()
{
	var urlEl = document.getElementById('ankiConnectUrl');
	var model_Name = document.getElementById('ankiNoteNameSelected');
	var submit_button = document.getElementById('saveAnkiBtn');

	Show_Colour_Options()

	chrome.storage.local.get('ankiConnectUrl', ({ ankiConnectUrl }) =>
	{
		var url = ankiConnectUrl || 'http://localhost:8765';
		urlEl.classList.add('focused');
		urlEl.value = url;

		Promise.all([
			/* Get All Deck names and all Note Types */
			fetchOptions('ankiDeckNameSelected', url, 'deckNames'),
			fetchOptions('ankiNoteNameSelected', url, 'modelNames') /* note type */
		]).then(() =>
		{

			/* Then we get all the Field's for the selected Note type */
			/*      dont change 'modelFieldNames' - this is for ankiconnect */
			var model_Name_value = model_Name.value;
			console.log("model_Name_value = ", model_Name_value)
			fetchOptions('ankiFieldScreenshotSelected', url, 'modelFieldNames', { "modelName": model_Name_value })
			fetchOptions('ankiSubtitleSelected', url, 'modelFieldNames', { "modelName": model_Name_value })
			fetchOptions('ankiSubtitleTranslation', url, 'modelFieldNames', { "modelName": model_Name_value })
			fetchOptions('ankiWordSelected', url, 'modelFieldNames', { "modelName": model_Name_value })
			fetchOptions('ankiBasicTranslationSelected', url, 'modelFieldNames', { "modelName": model_Name_value })
			fetchOptions('ankiExampleSentencesSelected', url, 'modelFieldNames', { "modelName": model_Name_value })
			fetchOptions('ankiOtherTranslationSelected', url, 'modelFieldNames', { "modelName": model_Name_value })
			fetchOptions('ankiFieldURL', url, 'modelFieldNames', { "modelName": model_Name_value })

			chrome.storage.local.get(["ankiExampleSentenceSource"], ({ ankiExampleSentenceSource }) =>
			{
				console.log('ankiExampleSentenceSource, stored value : ', ankiExampleSentenceSource)
				document.getElementById("ankiExampleSentenceSource").value = ankiExampleSentenceSource;
			});

			model_Name.addEventListener("change", function ()
			{
				var array = ["ankiFieldScreenshotSelected",
					"ankiSubtitleSelected",
					"ankiSubtitleTranslation",
					"ankiWordSelected",
					"ankiBasicTranslationSelected",
					"ankiExampleSentencesSelected",
					"ankiOtherTranslationSelected",
					"ankiFieldURL"
				];

				array.forEach((item) =>
				{
					document.getElementById(item).length = 0;
					fetchOptions(item, url, 'modelFieldNames', { "modelName": model_Name.value });
				})
			})
			// saveAnkiBtn.classList.disabled = true;
			submit_button.addEventListener('click', (e) =>
			{
				Promise.all([
					saveOption('ankiConnectUrl'),

					saveOption('ankiDeckNameSelected'),
					saveOption('ankiNoteNameSelected'),

					saveOption('ankiFieldScreenshotSelected'),
					saveOption('ankiSubtitleSelected'),
					saveOption('ankiSubtitleTranslation'),
					saveOption('ankiWordSelected'),
					saveOption('ankiBasicTranslationSelected'),
					saveOption('ankiExampleSentencesSelected'),
					saveOption('ankiOtherTranslationSelected'),
					saveOption('ankiFieldURL'),

					saveOption('ankiExampleSentenceSource'),

					Set_Colour_Options(),
				])
					.then(() => alert(`Options saved!`))
					.catch(error => alert(`Cannot save options: ${error}`))
			});
		}).catch(error => alert(`Cannot fetch options via AnkiConnect (Check Anki is started): ${error}`))
	});
});