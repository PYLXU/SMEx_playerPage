const observerForElement = new MutationObserver((mutationsList, observer) => {
    mutationsList.forEach((mutation) => {
        if (mutation.type === 'childList') {
            const targetElement = document.querySelector('.SimLRC');
            if (targetElement) {
                observer.disconnect();
                let debounceTimeout;
                startReplaceElement();
                const lyricsObserver = new MutationObserver((lyricsMutations) => {
                    if (debounceTimeout) clearTimeout(debounceTimeout);
                    debounceTimeout = setTimeout(() => {
                        lyricsMutations.forEach((lyricsMutation) => {
                            if (lyricsMutation.type === 'childList') {
                                startReplaceElement();
                                console.log('歌词元素发生变化，重新加载逐字歌词');
                            }
                        });
                    }, 500);
                });
                lyricsObserver.observe(targetElement, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
                window.lyricsObserver = lyricsObserver;
            }
        }
    });
});

// 初始观察器的配置
observerForElement.observe(document.body, {
    childList: true,
    subtree: true
});

function postApiArray(apiUrl, callback) {
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => callback(data))
        .catch(error => {
            console.error('API请求错误:', error);
            callback(null);
        });
}

function parseYRC(yrcStr) {
    try {
        const lines = yrcStr.split('\n').filter(line => line.trim() !== '');
        const result = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            try {
                let parsedLine;
                try {
                    // JSON
                    parsedLine = JSON.parse(line);
                } catch (jsonError) {
                    // 正则
                    const match = line.match(/^\[(\d+),(\d+)\](.*)$/);
                    if (match) {
                        const [_, start, duration, text] = match;
                        const startTime = parseInt(start, 10);
                        const durationTime = parseInt(duration, 10);
                        const words = [];
                        const wordRegex = /\((\d+),(\d+),(\d+)\)([^\(\)]*)/g;
                        let lastIndex = 0;
                        let matchWord;

                        while ((matchWord = wordRegex.exec(text)) !== null) {
                            const beforeText = text.substring(lastIndex, matchWord.index);
                            if (beforeText) {
                                beforeText.split('').forEach(char => {
                                    words.push({ tx: char });
                                });
                            }

                            const [_, t, d, __, tx] = matchWord;
                            words.push({
                                tx: tx,
                                t: parseInt(t, 10),
                                d: parseInt(d, 10)
                            });

                            lastIndex = wordRegex.lastIndex;
                        }

                        const remainingText = text.substring(lastIndex);
                        if (remainingText) {
                            remainingText.split('').forEach(char => {
                                words.push({ tx: char });
                            });
                        }

                        parsedLine = {
                            t: startTime,
                            d: durationTime,
                            c: words
                        };
                    } else {
                        console.error(`Invalid line format: ${line}`);
                        continue;
                    }
                }

                // 补全音乐信息之间间隔缺少
                if (parsedLine && typeof parsedLine === 'object') {
                    if (parsedLine.t !== undefined && parsedLine.c !== undefined) {
                        if (i < lines.length - 1) {
                            try {
                                let nextLine = lines[i + 1];
                                let nextParsed;
                                try {
                                    nextParsed = JSON.parse(nextLine);
                                } catch (e) {
                                    const nextMatch = nextLine.match(/^\[(\d+),(\d+)\]/);
                                    if (nextMatch) {
                                        nextParsed = {
                                            t: parseInt(nextMatch[1], 10)
                                        };
                                    }
                                }

                                if (nextParsed && nextParsed.t !== undefined) {
                                    parsedLine.d = nextParsed.t - parsedLine.t;
                                }
                            } catch (e) {
                                console.error(`Failed to calculate next line start time: ${e.message}`);
                            }
                        }
                        result.push(parsedLine);
                    }
                }
            } catch (error) {
                console.error(`Failed to parse line: ${line}, error: ${error.message}`);
            }
        }

        return result;
    } catch (error) {
        console.error('Failed to parse YRC:', error.message);
        return [];
    }
}

function spawnYRCElement(yrc, audioElement) {
    const lyricsElement = document.querySelector('.SimLRC');
    if (!lyricsElement) return;

    lyricsElement.innerHTML = '';

    yrc.forEach((line, index) => {
        const lineDiv = document.createElement('div');
        if (index == 0) lineDiv.classList.add('active');
        lineDiv.setAttribute('data-stamp', line.t);
        lineDiv.setAttribute('data-duration', line.d);
        lineDiv.style.filter = 'blur(5px)';
        lineDiv.onclick = () => { audioElement.currentTime = lineDiv.dataset.stamp / 1000; };

        line.c.forEach((word, index) => {
            const wordSpan = document.createElement('span');
            wordSpan.textContent = word.tx;
            wordSpan.style.opacity = '.6';
            wordSpan.style.transition = `opacity ${word.d}ms`;
            wordSpan.setAttribute('data-stamp', word.t);
            wordSpan.setAttribute('data-duration', word.d);
            lineDiv.appendChild(wordSpan);
            if (index < line.c.length - 1) {
                lineDiv.appendChild(document.createTextNode(' '));
            }
        });

        lyricsElement.appendChild(lineDiv);
    });

    let activeDots = null;

    function updateLyrics(timestamp) {
        const lines = Array.from(lyricsElement.children);
        const TIME_TOLERANCE = 50; // 时间误差

        // 寻找活动行
        let activeLine = null;
        for (const line of lines) {
            const lineStart = parseInt(line.getAttribute('data-stamp'), 10);
            const lineDuration = parseInt(line.getAttribute('data-duration'), 10);

            if (timestamp >= lineStart - TIME_TOLERANCE && timestamp < lineStart + lineDuration + TIME_TOLERANCE) {
                activeLine = line;
                break;
            }
        }

        // 等待点：因为不好实现直接塞后面当激活占位符了（x）
        if (!activeLine && lines.every(line => !line.classList.contains('active'))) {
            if (!activeDots) {
                activeDots = document.createElement('div');
                activeDots.textContent = '...';
                activeDots.classList.add('active');
                activeDots.style.fontWeight = 'bold';
                activeDots.style.textAlign = 'center';
                lyricsElement.appendChild(activeDots);
            }
        } else if (activeDots) {
            activeDots = null;
        }

        // 更新行状态
        lines.forEach((line, index) => {
            const lineStart = parseInt(line.getAttribute('data-stamp'), 10);
            const lineDuration = parseInt(line.getAttribute('data-duration'), 10);

            if (line === activeLine) {
                line.classList.add('active');
                line.style.filter = 'none';

                const words = Array.from(line.querySelectorAll('span'));
                let currentWordFound = false;

                words.forEach((word, wordIndex) => {
                    const wordStart = parseInt(word.getAttribute('data-stamp'), 10);
                    const wordDuration = parseInt(word.getAttribute('data-duration'), 10);
                    const wordEnd = wordStart + wordDuration;

                    // 重置样式
                    word.style.opacity = '0.6';
                    word.style.textShadow = 'none';
                    word.style.transition = `opacity ${wordDuration}ms`;

                    if (timestamp >= wordStart && timestamp < wordEnd) {
                        word.style.opacity = '1';
                        currentWordFound = true;

                        // 添加阴影
                        if (wordIndex === words.length - 1) {
                            word.style.textShadow = '0 0 8px rgba(255, 255, 255, 0.8)';
                        }
                    } else if (timestamp >= wordEnd) {
                        word.style.opacity = '0.8';
                        if (wordIndex === words.length - 1) {
                            word.style.textShadow = 'none';
                        }
                    }
                });

                if (!currentWordFound) {
                    for (let i = words.length - 1; i >= 0; i--) {
                        const word = words[i];
                        const wordStart = parseInt(word.getAttribute('data-stamp'), 10);
                        if (timestamp >= wordStart) {
                            word.style.opacity = '0.8';
                            word.style.textShadow = 'none';
                            break;
                        }
                    }
                }
            } else {
                line.classList.remove('active');
                line.style.filter = 'blur(5px)';
                Array.from(line.querySelectorAll('span')).forEach(word => {
                    word.style.opacity = '0.6';
                    word.style.textShadow = 'none';
                });
            }
        });

        if (!activeLine && !activeDots) {
            activeDots = document.createElement('div');
            activeDots.textContent = '...';
            activeDots.classList.add('active');
            activeDots.style.textAlign = 'center';
            lyricsElement.appendChild(activeDots);
        }
    }

    if (audioElement) {
        audioElement.addEventListener('timeupdate', () => {
            const currentTime = audioElement.currentTime * 1000;
            updateLyrics(currentTime);
        });
    }
}



let lastHandle = 0;

async function startReplaceElement() {
    const musicId = config.getItem('currentMusic');
    const lyricsElement = document.querySelector('.SimLRC');
    if (lastHandle == musicId) return;
    lastHandle = musicId;
    if (config.getItem('ext')['ncm'] == null) {
        console.error('未安装网易云扩展但正在尝试播放网易云音乐');
        return;
    }
    const apiUrl = config.getItem('ext.ncm.apiEndpoint');
    if (apiUrl == null) {
        console.error('网易云扩展API地址未设置，无法获取歌词');
        return;
    }
    if (musicId.startsWith('ncm:')) {
        postApiArray(apiUrl + '/lyric/new?id=' + musicId.replace('ncm:', ''), (lyrics) => {
            if (lyrics.yrc == null) {
                return;
            }
            lyricsElement.innerHTML = '<div data-stamp="0" style="filter: none;" class="active"><span>正在加载逐字歌词</span></div>';
            const yrc = parseYRC(lyrics.yrc.lyric);
            console.log(yrc);
            spawnYRCElement(yrc, document.querySelector('#audio'));
        });
    }
}