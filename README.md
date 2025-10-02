# Language Learning With Anki

## Langauge Reactor to Anki

Adds an option to create Anki flash cards with the Language Reactor chrome extension

Language Reactor can be found here:
> https://chrome.google.com/webstore/detail/language-reactor/hoombieeljmmljlkjmnheibnpciblicm


## Setup

1) Must install the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) plugin.
2) Download the extension source code: 
    - Blue "code" button then "Download Zip".
    - Unzip the download, to have a folder called "Language-Learning-With-Anki-master", this is the extension source code.
3) Install the unpacked `Language-Learning-With-Anki` extension.
    - Open a new chrome tab and go to : <chrome://extensions/>
    - In the top right, toggle ON the "Developer mode".
    - Click "Load Unpacked" and navigate to where the "Language-Learning-With-Anki-master" folder is, and choose that folder.
4) Setup the URL (default is `http://localhost:8765`), deck and model values, making sure the top field of your note type has a [valid field](#empty-note-error) value.
5) You **must** leave the Anki desktop application open in order for the extension to communicate with Ankiconnect.

## Usage

Click a word to bring up the definition popup. Clicking the Anki button will gather the relevant data and send it to Anki. To change what data is collected, click the extension icon to show the settings page.

The "RC" option will remove the currently selected word from the list of saved words (can be viewed in the settings page). Everytime a word is clicked and sent to Anki it is saved in a list of words, this is to be used for highlighting purposes. Words can be removed in the settings and with the use of the "RC" button.

Regardless of whether the highlighting words option is turned on or off, words used to create cards will be saved in the words list within the settings page.

When using the audio field, the extension will replay the subtitle again to collect the audio. Let the video play and wait for the success popup before doing anything else, interrupting the playback may cause a half finished audio track. Subsequent cards made with the same subtitle will not require the audio to be re-record. If an issue occurs with the audio and you wish to re-record it for the current subtitle, use the "RA" button to remove the saved audio file and try making the card again.

The ai field will be filled with whatever Ai mode you have currently selected (Explain, Examples, Grammar).

![bubble-screenshot](screenshots/fields.png)

## Settings

Exported data fields:

 1) `Screenshot` - an image of video taken at time when button is pressed
 2) `Subtitle` - the current subtitle visible on screen
 3) `Subtitle Translation` - this is the translated subtitle when using the 'Show machine translation' option
 4) `Word` - selected word in the subtitle
 5) `Basic Translation` - the translation of the selected word
 6) `Example Sentences` - examples below the definitions in the popup, either from the current video or Tatoeba
 7) `Example Source`  - Tatoeba or Current video
 8) `Other Translation` - the extra translations of the word, formatted in HTML
 9) `Base Form` - "dictionary" form of the word, without declensions
 10) `Ai` - save the text output from the Ai assistant
 11) `Audio` - audio for the current subtitle (limited to 16s)
 12) `URL` - URL of current video with the current timestamp
 13) `Highlight` - toggle whether to highlight words exported to Anki in the chosen colour
 14) `Pause on Saved` - auto pause the subtitle if it contains a word you have made an Anki card for

Settings allow you to choose which fields are filled with what data. A `<blank>` options means that data is skipped

![options-screenshot](/screenshots/settings.png)
![options-screenshot](/screenshots/words.PNG)

## Possible Errors

- `Access to fetch at 'http://localhost:8765' from origin 'https://www.netflix.com' has been blocked by CORS policy`

You need to make sure Netflix and Youtube are added to the "webCorsOriginList" in your AnkiConnect config. To do this, go to:

`Anki > tools > Add-ons > AnkiConnect > config`

Example of "webCorsOriginList"
```json
    "webCorsOriginList": [
        "http://localhost",
        "https://www.netflix.com",
        "https://www.youtube.com"
    ]
```

- `cannot create note because it is empty`<a id="empty-note-error"></a>

Make sure the field at position 1 in your Anki note type (Tools > Manage Note Types) is set to a value in the extensions settings page, if not, then you will get this error. See [also](https://github.com/ClearlyKyle/Language-Learning-With-Anki/issues/7#issuecomment-2510020695)