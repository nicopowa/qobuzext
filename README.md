# QobuzExt

Qobuz downloader web extension  

Based on [qobuz-dl](https://github.com/vitiko98/qobuz-dl)  
Rewritten from scratch in vanilla Javascript and turned into a simple web extension.  

Looking for [TidalExt](https://github.com/nicopowa/tidalext) ?  

## Informations

- First testing version
- Chromium based browsers only
- Active subscription required

## How to install

- Download or clone repository
- Open Extensions tab
- Enable "Developer mode"
- Click "Load unpacked"
- Select extension directory
- Click toolbar extensions icon
- Pin extension

## How to use

- Open [Web Player](https://play.qobuz.com)
- Connect account
- Navigate to album or release page
- Click extension icon

## How it works

- Extension is "passive"
- Inject code into website
- Intercept fetch requests
- Track incoming data
- Parse specific responses
- Wait for download order
- Load files one by one
- Inject metadata & cover
- Downloads processed file

## Work in progress

- Refresh page if no data is showing
- Check extensions page for errors
- Press Alt+Q to reload extension

## Permissions

- [storage](https://developer.chrome.com/docs/extensions/reference/api/storage) : save settings
- [downloads](https://developer.chrome.com/docs/extensions/reference/api/downloads) : download files
- [webRequest](https://developer.chrome.com/docs/extensions/reference/api/webRequest) : watch network
- [offscreen](https://developer.chrome.com/docs/extensions/reference/api/offscreen) : process audio

## Disclaimer

❌ Not affiliated with Qobuz  
⚠️ No liability for any damage or issues  
🚫 No responsibility for how this software is used  
💥 Use at your own risks  
🎶 Good vibes 〜ヽ(⌐￭_￭)ノ♪♬  