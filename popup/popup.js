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

// These are the names of the field elements in the html, they must match!
// The elements we want to be filled with the list of field names
let g_ankiFields = {
    ankiFieldScreenshotSelected: '',
    ankiSubtitleSelected: '',
    ankiSubtitleTranslation: '',
    ankiWordSelected: '',
    ankiBasicTranslationSelected: '',
    ankiExampleSentencesSelected: '',
    ankiOtherTranslationSelected: '',
    ankiFieldURL: '',
};
const g_anki_field_keys = Object.keys(g_ankiFields);
let g_anki_field_elements = {}; // NOTE : Is it really worth it to pre-fetch all elements? 

const g_fields_in_storage = [
    "ankiHighLightSavedWords",

    "ankiConnectUrl",
    "ankiDeckNameSelected",
    "ankiNoteNameSelected",

    "ankiExampleSentenceSource",
    "ankiHighLightColour",

    ...g_anki_field_keys,
];

// Using strings for the body of our fetch, saves calling: JSON.stringify(body)
const g_deck_and_model_body = '{"action":"multi","params":{"actions":[{"action":"deckNames"},{"action":"modelNames"}]}}';
const g_permission_data = '{"action":"requestPermission","version":6}';

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
    for (let i = 0; i < g_anki_field_keys.length; i++)
    {
        g_anki_field_elements[g_anki_field_keys[i]] = document.getElementById(g_anki_field_keys[i]);
    }

    const submit_element = document.getElementById('saveAnkiBtn');
    submit_element.addEventListener('click', (e) =>
    {
        let save_data = {};
        
        // Why 1? skip over "ankiHighLightSavedWords" check box, as its handled bellow ;)
        for (let index = 1; index < g_fields_in_storage.length; index++)
        {
            const field_name = g_fields_in_storage[index];
            const value = document.getElementById(field_name).value;

            console.log(`${index} - ${field_name} = ${value}`);

            save_data[field_name] = value;
        }

        save_data.ankiHighLightSavedWords = document.getElementById('ankiHighLightSavedWords').checked;

        console.log("Updating saved data", save_data);

        chrome.storage.local.set(save_data, () =>
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

    chrome.storage.local.get(["ankiConnectUrl"], ({ ankiConnectUrl }) =>
    {
        const url_element = document.getElementById('ankiConnectUrl');
        url_element.value = anki_url = (ankiConnectUrl || url_element.value);

        fetch(anki_url, {
            method: "POST",
            body: g_permission_data,
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
                else
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

function Add_Options_To_Field_Dropdown(element_id, data, saved_value)
{
    const dropdown = g_anki_field_elements[element_id];

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
}

function Update_Selections_With_Saved_Values()
{
    chrome.storage.local.get(g_fields_in_storage, res =>
    {
        for (const key in g_ankiFields)
        {
            if (key in res)
            {
                g_ankiFields[key] = res[key];
            }
        }

        document.getElementById("ankiConnectUrl").value = res.ankiConnectUrl || 'http://localhost:8765';

        document.getElementById("ankiExampleSentenceSource").value = res.ankiExampleSentenceSource || "None";

        document.getElementById("ankiHighLightSavedWords").checked = res.ankiHighLightSavedWords;
        document.getElementById("ankiHighLightColour").value = res.ankiHighLightColour;

        // Frist we need to get all deck names and note types, 
        // after we get a note type, we can then fetch for all the fields of that note type

        const deck_names_element = document.getElementById("ankiDeckNameSelected");
        const note_names_element = document.getElementById("ankiNoteNameSelected");

        note_names_element.addEventListener('change', Update_Field_Dropdown);

        Fetch_From_Anki(g_deck_and_model_body)
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
    const note_names_element = document.getElementById("ankiNoteNameSelected");

    const note_field_body = `{"action": "modelFieldNames","params":{"modelName":"${note_names_element.value}"}}`;

    Fetch_From_Anki(note_field_body)
        .then((data) =>
        {
            // NOTE : if we switch to another note type that has the same named field, they will not be reset
            if (data.length)
            {
                const field_data = data;
                const field_names = g_anki_field_keys;

                for (let i = 0; i < field_names.length; i++)
                {
                    const field_name = field_names[i];
                    console.log(`Dropdown ${field_name}, with set value ${g_ankiFields[field_name]}`);
                    Add_Options_To_Field_Dropdown(field_name, field_data, g_ankiFields[field_name]);
                }
            }
        })
        .catch(error => console.error("Unable to model fields", error));
}