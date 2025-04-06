
var style = `
.playerContainer {
    margin: 20px max(calc(50vw - 700px), 110px);
}

#playPage {
    background: black;
}

.controls,.hideLyrics.hideList .controls {
    width: calc(100vw* 0.4);
    margin: auto 0 15% 0;
}

.controls #album {
    width: calc(100vw* 0.20);
}

.controls .infoBar {
    margin: 30px 0 10px 0;
}

.controls .musicInfo b {
    font-size: 3.0em;
    white-space: break-spaces;
}

.controls .musicInfo div {
    margin-top: 20px;
}

.lyrics , .list {
    left: calc(100vw* 0.45);
    width: calc(100vw* 0.4);
    height: calc(100% - 60px);
}

.controls .buttons {
    position: fixed;
    bottom: -10px;
    left: -8%;
    width: 100vw;
    display: none;
}

.darkPlayer #playPage .SimProgress {
    position: fixed;
    bottom: 60px;
    left: -65px;
    width: 100vw;
}

.bottom > .center > #ExPlayerMenuBtn{
    display: none;
} 

.bottom > .center > #ExPlayerLyricsBtn{
    display: none;
}

.playerShown > .bottom {
    bottom: 0;
    background: transparent;
    z-index: 100;
    color: var(--SimAPTheme);
}

.playerShown > .bottom > .info {
    display: none;
}

.playerShown .SimProgress>div>div {
    background: var(--SimAPTheme) !important;
}

.playerShown .SimProgress:not(.readOnly)::after {
    background: var(--SimAPTheme) !important;
}

.playerShown > .bottom > .center > #ExPlayerMenuBtn{
    display: block;
} 

.playerShown > .bottom > .center > #ExPlayerLyricsBtn{
    display: block;
} 

.controls .progressControl {
    display: none;
}

.controls .infoBar i {
    display: none;
}

#background {
    display: none;
}
`;

let backgroundRule = document.createElement('style');
backgroundRule.id = 'ExPlayerPageBg';
document.head.appendChild(backgroundRule);

let albumObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.attributeName === 'src') {
            let albumSrc = document.querySelector('.controls #album')?.src;
            if (albumSrc) {
                backgroundRule.textContent = `
                                    #playPage::before {
                                        content: '';
                                        position: absolute;
                                        top: 0;
                                        left: 0;
                                        width: 100%;
                                        height: 100%;
                                        background: url(${albumSrc}) center/cover;
                                        filter: blur(70px) brightness(0.4);
                                        z-index: -1;
                                    }
                                `;
            }
        }
    });
});

if (config.getItem("ext.playerPage.isEffect") == true && config.getItem("darkPlayer") == false) {
    alert("请在设置中启用播放页深色模式以继续使用「播放页面」插件！");
    config.setItem("ext.playerPage.isEffect", false);
}

function loadStyles() {
    let styles = "";
    if (config.getItem("ext.playerPage.isEffect") == true) {
        if (config.getItem("ext.playerPage.isEffect") == true && config.getItem("darkPlayer") == false) {
            alert("请在设置中启用播放页深色模式以继续使用「播放页面」插件！");
            config.setItem("ext.playerPage.isEffect", false);
        }
        styles = style;
        let albumElement = document.querySelector('.controls #album');
        if (albumElement) {
            albumObserver.observe(albumElement, { attributes: true });
        }

        let lyricsBtn = document.createElement('div');
        lyricsBtn.onclick = () => SimAPControls.toggleLyrics();
        lyricsBtn.style.position = 'fixed';
        lyricsBtn.style.left = '55px';
        lyricsBtn.className = 'large';
        lyricsBtn.id = 'ExPlayerLyricsBtn';
        let icon2 = document.createElement('i');
        icon2.innerHTML = '';
        lyricsBtn.appendChild(icon2);

        document.querySelector('.bottom > .center')?.insertAdjacentElement('afterbegin', lyricsBtn);

        let menuBtn = document.createElement('div');
        menuBtn.onclick = () => PlayerController.showPlayerMenu();
        menuBtn.style.position = 'fixed';
        menuBtn.style.left = '15px';
        menuBtn.className = 'large';
        menuBtn.id = 'ExPlayerMenuBtn';
        let icon = document.createElement('i');
        icon.innerHTML = '';
        menuBtn.appendChild(icon);

        document.querySelector('.bottom > .center')?.insertAdjacentElement('afterbegin', menuBtn);

        includeStyleElement(styles, "ExPlayerPage");
    } else {
        albumObserver.disconnect();
        document.getElementById("ExPlayerPage")?.remove();
        document.querySelector('#ExPlayerMenuBtn')?.remove();
        document.querySelector('#ExPlayerLyricsBtn')?.remove();
    }

}

SettingsPage.data.push(
    { type: "title", text: "[第三方扩展] 播放页面" },
    { type: "boolean", text: "启用修改的播放页面", description: "开启后将更改播放页面使其更加美观", configItem: "ext.playerPage.isEffect" },
);
config.listenChange("ext.playerPage.isEffect", () => loadStyles());

loadStyles();