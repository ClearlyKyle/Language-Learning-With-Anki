# Language-Learning-With-Anki

Adds option to send a subtitle to Anki using Ankiconnect

## Setup

1) You must install [AnkiConnect](https://ankiweb.net/shared/info/2055492159) plugin.
2) Yuo must leave the Anki desktop application open in order to connect to it.
3) Install unpacked extension.
4) Setup the URL (default is `http://localhost:8765`), deck and model

## Usage

Click a word to bring up the definition popup.
Clicking the Anki button will send the current word and definition straight to Anki.

![bubble-screenshot](https://raw.githubusercontent.com/ClearlyKyle/Language-Learning-With-Anki/master/popup.PNG)

## Usage

Exported data fields:

 1) `(Screenshot)` - an image of video taken at time when button is pressed
 2) `(Subtitle)` - the current subtitle visible on screen
 3) `(Word)` - selected word
 4) `(Basic)` Translation - the transaltion of the selected word
 5) `(Other)` Translation - the extra translations of the word, formatted in HTML
 6) `(URL)` - URL of current video with the current timestamp

Settings allow you to choose which fields are filled with what data. A blank options means that data is skipped

![options-screenshot](https://raw.githubusercontent.com/ClearlyKyle/Language-Learning-With-Anki/master/settings.PNG)
