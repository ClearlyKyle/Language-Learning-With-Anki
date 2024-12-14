console.log("----- [background.js] LOADED");

//
// DEBUG MODE
//
const CONSOLE_LOGGING = true;
if (!CONSOLE_LOGGING)
{
    console.log = function () { };
}

//
// GLOBALS
//
let anki_url = 'http://localhost:8765';
let anki_field_data = {};
let anki_field_promises = {};
const anki_field_elements = {}; // saved elements, to reduce calls to getElementById

// These are the names of the field elements in the html, they must match!
// The elements we want to be filled with the list of field names
const anki_field_names = [
    "ankiFieldScreenshotSelected",
    "ankiSubtitleSelected",
    "ankiSubtitleTranslation",
    "ankiWordSelected",
    "ankiBasicTranslationSelected",
    "ankiExampleSentencesSelected",
    "ankiOtherTranslationSelected",
    "ankiAudioSelected",
    "ankiFieldURL"
];

// Names of other elements that dont need the field values added
const anki_id_names = [
    "ankiNoteNameSelected",
    "ankiDeckNameSelected",
    "ankiConnectUrl",
    "ankiExampleSentenceSource",
    "ankiHighLightSavedWords",
    "ankiHighLightColour",

    ...anki_field_names];

// Generate our structure for saving values with associated element id
//{
//    "ankiNoteNameSelected": value,
//    "ankiDeckNameSelected": value,
//    ...
//}
let anki_storage_values = Object.fromEntries(anki_id_names.map((key) => [key, ""]));

//
// STARTUP
//
if (document.readyState === "loading")
{
    document.addEventListener("DOMContentLoaded", () => init());
}
else
{
    init();
}

function init()
{
    for (let i = 0; i < anki_id_names.length; i++)
    {
        const element_name = anki_id_names[i];
        anki_field_elements[element_name] = document.getElementById(element_name);
    }

    const submit_element = document.getElementById('saveAnkiBtn');
    submit_element.addEventListener('click', (e) =>
    {
        for (let i = 0; i < anki_field_names.length; i++)
        {
            const element_name = anki_field_names[i];
            anki_storage_values[element_name] = anki_field_elements[element_name].value;
        }

        anki_storage_values["ankiExampleSentenceSource"] = anki_field_elements.ankiExampleSentenceSource.value;
        anki_storage_values["ankiHighLightSavedWords"] = anki_field_elements.ankiHighLightSavedWords.checked;
        anki_storage_values["ankiHighLightColour"] = anki_field_elements.ankiHighLightColour.value;

        console.log(anki_storage_values);

        chrome.storage.local.set(anki_storage_values, () =>
        {
            if (chrome.runtime.lastError)
            {
                alert("Error saving to storage:", chrome.runtime.lastError);
            }
            else
            {
                alert(`Options saved!`);
            }
        });
    });

    anki_field_promises = anki_field_names.map((field_name) =>
    {
        return () =>
        {
            return Add_Options_To_Field_Dropdown_Promise(field_name, anki_field_data, anki_storage_values[field_name]);
        };
    });

    chrome.storage.local.get(["ankiConnectUrl"], ({ ankiConnectUrl }) =>
    {
        const url_element = anki_field_elements.ankiConnectUrl;
        url_element.value = anki_url = (ankiConnectUrl || url_element.value);

        fetch(anki_url, {
            method: "POST",
            body: '{"action":"requestPermission","version":6}',
        })
            .then((res) => res.json())
            .then((data) =>
            {
                if (data.error)
                {
                    reject(data.error);
                }
                else
                {
                    Update_Selections_With_Saved_Values();
                }
            })
            .catch(error => alert(`Failed to connect to Anki ${anki_url}, make sure Anki is open and AnkiConnect is installed : ${error}`));
    });
}

//
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // //
//

function Fetch_From_Anki(body)
{
    return new Promise((resolve, reject) =>
    {
        fetch(anki_url, {
            method: 'POST',
            body: body,
        })
            .then(response => response.json())
            .then(data =>
            {
                if (data.error)
                    reject(data.error);
                resolve(data);
            })
            .catch(error => alert("Failed with body:", body));
    });
}

function Add_Options_To_Dropdown(dropdown, data)
{
    dropdown.length = 0;

    for (let i = 0; i < data.length; i++)
    {
        const option = document.createElement('option');
        option.value = option.text = data[i];
        dropdown.add(option);
    }
}

function Add_Options_To_Field_Dropdown_Promise(element_id, data, saved_value)
{
    return new Promise((resolve, reject) =>
    {
        console.log("Calling this promuse", data);
        const dropdown = anki_field_elements[element_id];

        dropdown.length = 0;

        for (let i = 0; i < data.length; i++)
        {
            const option = document.createElement('option');
            option.value = option.text = data[i];
            dropdown.add(option);
        }

        const blank = document.createElement("option");
        blank.value = blank.text = "";
        dropdown.add(blank);

        dropdown.value = saved_value;

        resolve();
    });
}

function Update_Selections_With_Saved_Values()
{
    chrome.storage.local.get(anki_id_names, res =>
    {
        anki_storage_values = res;

        anki_field_elements.ankiExampleSentenceSource.value = res.ankiExampleSentenceSource || "None";

        anki_field_elements.ankiHighLightSavedWords.checked = res.ankiHighLightSavedWords || false;
        anki_field_elements.ankiHighLightColour.value = res.ankiHighLightColour || "#ffffff";

        // Frist we need to get all deck names and note types, 
        // after we get a note type, we can then fetch for all the fields of that note type

        const deck_names_element = anki_field_elements.ankiDeckNameSelected;
        const note_names_element = anki_field_elements.ankiNoteNameSelected;

        note_names_element.addEventListener('change', Update_Field_Dropdown);

        Fetch_From_Anki('{"action":"multi","params":{"actions":[{"action":"deckNames"},{"action":"modelNames"}]}}')
            .then((data) =>
            {
                if (data.length === 2)
                {
                    const [deck_names, note_names] = data;

                    Add_Options_To_Dropdown(deck_names_element, deck_names);
                    Add_Options_To_Dropdown(note_names_element, note_names);

                    const ankiDeckNameSelected = res.ankiDeckNameSelected;
                    const ankiNoteNameSelected = res.ankiNoteNameSelected;

                    if (ankiDeckNameSelected)
                        deck_names_element.value = ankiDeckNameSelected;

                    if (ankiNoteNameSelected)
                        note_names_element.value = ankiNoteNameSelected;

                    Update_Field_Dropdown();
                }
            })
            .catch(error => console.error("Unable to get deck and model names", error));
    });
}

function Update_Field_Dropdown()
{
    const note_names_element = anki_field_elements.ankiNoteNameSelected;

    Fetch_From_Anki(`{"action": "modelFieldNames","params":{"modelName":"${note_names_element.value}"}}`)
        .then((data) =>
        {
            // NOTE : if we switch to another note type that has the same named field, they will not be reset
            if (data.length)
            {
                anki_field_data = data;
                Promise.all(anki_field_promises.map((func) => func()));
            }
        })
        .catch(error => console.error("Unable to model fields", error));
}
