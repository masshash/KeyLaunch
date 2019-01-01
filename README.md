# KeyLaunch #
[https://masshash.github.io/KeyLaunch](https://masshash.github.io/KeyLaunch)

KeyLaunch は Web ベースのキーボードオーディオランチャーです。キーボードの任意のキーにオーディオを関連付けて、起動や停止をコントロールできます。オーディオはローカル上にあるオーディオファイル（.mp3 や .wav、.flack など）から選択し、Web アプリを通してブラウザにロードします。読み込んだオーディオは関連付けられたキーを押下することで起動や停止などの操作ができます。また起動と停止には即応性があり、楽器のようなライブ感のある操作を実現しています。

54キー × 12レイヤー（12個の仮想キーボード）で計648個のキーに設定を割り当てられます。

各キーはオーディオを起動する以外にも、1つのキーから他のキーを一括起動（または一括停止）させたり、レイヤーを変更したりできます。

## 対応ブラウザ ##
Web アプリ内で動作する JavaScript コードには ES6 の構文と Web Audio API が使用されています。よって Internet Explorer 及びその他の比較的古いブラウザでは動作しません。Chrome、Firefox、Safari、Edge などのモダンなブラウザを使用してください。対応ブラウザの詳細については下記ページで確認できます。

*ES6 の対応状況*  
- [https://kangax.github.io/compat-table/es6/](https://kangax.github.io/compat-table/es6/)

*Web Audio Api の対応状況*
- [https://caniuse.com/#feat=audio-api](https://caniuse.com/#feat=audio-api)

KeyLaunch では物理キーボードの使用を前提としているため、スマートフォン及びタブレット上のブラウザからの利用は想定していません。

## KeyLaunch で扱えるオーディオファイル ##
MP3、WAV、AAC、FLACKや[その他](https://developer.mozilla.org/en-US/docs/Web/HTML/Supported_media_formats)のフォーマットが扱えます。なお、ブラウザごとに対応しているフォーマットは異なります。

## To do ##
- KeyLaunch の詳細や使い方などを説明したドキュメントを作成。
- オンラインとローカルのストレージに設定データを保存できるようにする。
- インターフェースを改善する。
