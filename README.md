# Language Learning With Anki

## Langauge Reactor to Anki

Adds an option to create Anki flash cards with the Language Reactor chrome extension

Language Reactor can be found here:
> https://chrome.google.com/webstore/detail/language-reactor/hoombieeljmmljlkjmnheibnpciblicm


## Setup

1) Must install the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) plugin.
2) Must leave the Anki desktop application open in order for Ankiconnect to connect to it.
3) Install the unpacked `Language-Learning-With-Anki` extension.
4) Setup the URL (default is `http://localhost:8765`), deck and model values, making sure the top field of your note type has a [valid field](#empty-note-error) value.

## Usage

Click a word to bring up the definition popup.
Clicking the Anki button will send the current word and definition straight to Anki.
The "RC" option, will remove the colour from the selected word

If the highlight word option is turned on then all words sent to Anki will be saved and highlighted, with this setting turned off, words will not be saved so will not be highlighted if turned back on. 

When using the audio field, the extension will replay the subtitle again to collect the audio. Let the video play and wait for the success popup before doing anything else, interupting the playblack may cause a half finished audio track. Subsequent cards made with the same subtitle, will not need to recreate the audio.

![bubble-screenshot](https://raw.githubusercontent.com/ClearlyKyle/Language-Learning-With-Anki/master/screenshots/popup.PNG)

## Settings

Exported data fields:

 1) `Screenshot` - an image of video taken at time when button is pressed
 2) `Subtitle` - the current subtitle visible on screen
 3) `Subtitle Translation` - this is the translated subtitle when using the 'Show machine translation' option
 4) `Word` - selected word in the subtitle
 5) `Basic Translation` - the transaltion of the selected word
 6) `Example Sentences` - examaples bellow the definitons in the popup, either from current video or Tatoeba
 7) `Example Source`  - Tatoeba or Current video
 8) `Other Translation` - the extra translations of the word, formatted in HTML
 9) `Audio` - audio for the current subtitle (limited to 16s)
 9) `URL` - URL of current video with the current timestamp
 10) `Highlight` - toggle wether to highlight words exported to Anki in the choosen colour

Settings allow you to choose which fields are filled with what data. A blank options means that data is skipped

![options-screenshot](https://raw.githubusercontent.com/ClearlyKyle/Language-Learning-With-Anki/master/screenshots/settings.png)

## Poissible Errors

- `Acess to fetch at 'http://localhost:8765' from origin 'https://www.netflix.com' has been blocked by CORS policy`

You need to make sure Netflix and Youtube are add to the "webCorsOriginList" in your AnkiConnect config. To do this, go to:

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

Make sure the field at position 1 in your Anki note type (Tools > Manage Note Types) is set to a value in the extentions settings page, if not, then you will get this error. See [also](https://github.com/ClearlyKyle/Language-Learning-With-Anki/issues/7#issuecomment-2510020695)