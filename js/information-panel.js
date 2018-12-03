const InformationPanel = {
    init() {
        /***************************************************
        *   common
        ***************************************************/
        this.key = null;
        
        this.infoType = '$unfocus';
        
        let sliders = $('.slider');
        sliders.slider({
            range: "min",
            value: 50,
            min: 0,
            max: 100,
        });
        sliders.on({
            'slide': this.E_slider_slide,
            'mousedown': this.E_slider_mousedown
        });
        this.$sliders = sliders;
        this.$volumes = $('.volume');
        this.$sliderWraps = $('.slider-wrap');
        this.downedSliderIndex = -1;
        
        $('.stop-btn').on({
            click:      this.E_stopBtn_click,
            mouseenter: this.E_stopBtn_mouseenter,
            mouseleave: this.E_stopBtn_mouseleave
        });
        this.$stopSquares = $('.stop-square');
        
        $('.tool-icon').on({
            mouseenter: this.E_toolIcons_mouseenter,
            mouseleave: this.E_toolIcons_mouseleave
        });
        $('.setting-icon').click(this.E_settingIcon_click);
        $('.delete-icon').click(this.E_deleteIcon_click);
        
        
        /***************************************************
        *   master1
        ***************************************************/
        let layerDisps = $('.layer-disp');
        layerDisps.click(this.E_layerDisps_click);
        
        this.LayerContentCounts  = Array(12).fill(0);
        this.LayerPlayCounts = Array(12).fill(0);
        this.master1 = {
            $layerDisps: layerDisps,
            $playMarks: $('.play-mark'),
            $counterLefts: $('.counter-left'),
            $counterRights: $('.counter-right')
        };
        
        
        /***************************************************
        *   master2
        ***************************************************/
        let $visualizer = $('#visualizer');
        let visualizer  = $visualizer[0].getContext('2d');
        visualizer.width = $visualizer.width();
        
        visualizer.init = () => {
            visualizer.clearRect(0, 0, visualizer.width, 26);
            visualizer.fillStyle = "#111";
            for (let i = 0; i < 19; i++) {
                visualizer.fillRect(i * 11 + 10, 0, 1, 26);
            }
            visualizer.fillRect(0, 12, visualizer.width, 2);
            visualizer.fillStyle = "rgb(94, 232, 25)";
        };
        visualizer.init();
        
        let colorWeights = [], r = 94, g = 232;
        for (let i = 0; i < 20; i++) {
            r = Math.min(255, r + i * 4), g -= i;
            colorWeights.push([r, g]);
        }

        visualizer.drowVisualBlock = (preLength, length, direction) => {
            let y = (direction == 'left') ? 0 : 14;
            let offset, end
            if (length > preLength) {
                offset = preLength, end = length;
                for (let i = offset; i < end; i++) {
                    let [r, g] = colorWeights[i];
                    visualizer.fillStyle = `rgb(${r}, ${g}, 25)`;  
                    visualizer.fillRect(i * 11, y, 10, 12);
                }
            } else {
                offset = length, end = preLength;
                for (let i = offset; i < end; i++) {
                    visualizer.clearRect(i * 11, y, 10, 12);
                }
            }
        };
        
        let masterDeleteIcon = $('#master-delete-icon');
        masterDeleteIcon.entered = false;
        masterDeleteIcon._disabled = true;
        masterDeleteIcon.__defineGetter__('disabled', function() {
            return this._disabled;
        });
        masterDeleteIcon.__defineSetter__('disabled', function(val) {
            if (this._disabled == val) return;
            if (val) {
                this.children().attr('class', 'tool-icon-disabled');
            } else {
                let type = this.entered ? 'enter' : 'leave';
                this.children().attr('class', `tool-icon-${type}`);
            }
            this._disabled = val;
        });
        masterDeleteIcon.on({
            mouseenter: this.E_masterDeleteIcon_mouseenter,
            mouseleave: this.E_masterDeleteIcon_mouseleave
        });
        
        
        this.visualizeID = -1;
        this.audioDataSize = 0;
        this.master2 = {
            visualizer:            visualizer,
            $masterContentCounter: $('#master-content-counter'),
            $masterDataSize:       $('#master-data-size'),
            $masterDeleteIcon:     masterDeleteIcon
        };
        
        /***************************************************
        *   unfocus
        ***************************************************/
        this.$unfocus = $('#unfocus');
        
        
        /***************************************************
        *   unset
        ***************************************************/
        let fileBtn1 = $('#file-btn1');
        fileBtn1.on({
           mouseenter: this.E_fileBtn1_mouseenter,
           mouseleave: this.E_fileBtn1_mouseleave,
           mousedown:  this.E_fileBtn1_mousedown,
           click:      this.E_fileBtn1_click
        });
        
        let unsetFile = $('#unset-file');
        unsetFile.change(this.E_unsetFile_change);
        
        this.$unset = $('#unset');
        this.unset = {
            $unsetKeyTag: $('#unset-key-tag'),
            $fileBtn1:   fileBtn1,
            $unsetFile:    unsetFile
        };
        
        
        /***************************************************
        *   controller
        ***************************************************/
        let progressBar = $('#progress-bar')[0].getContext('2d');
        progressBar.fillStyle = "#666";

        let radios = $('.radio');
        radios.checkboxradio({ icon: false });
        radios.change(this.E_radios_change);
        $("#type-radio").controlgroup();
        
        this.progressID = -1;
        this.$controller = $('#controller');
        this.controller = {
            $ctrlKeyTag:   $('#ctrl-key-tag'),
            $filenameLine: $('#filename-line'),
            progressBar:   progressBar,
            $progressTime: $('#progress-time'),
            $totalTime:    $('#total-time'),
            $radios:       radios,
        };
        
        
        /***************************************************
        *   reference-detail
        ***************************************************/
        this.$referenceDetail = $('#reference-detail');
        this.referenceDetail = {
            $referShowKey:         $('#refer-key-tag'),
            $referTypeDisp:        $('#refer-type-disp'),
            $referSequenceContent: $('#refer-sequence-content')
        };
        
        
        /***************************************************
        *   load-anim
        ***************************************************/
        this.$loadAnim = $('#load-anim');
    },
    
    attach(key) {
        this.detach();
        
        if (!key) {
            this.showUnfocus();
            return;
        }
        
        this.key = key;
        let source = key.getSource();
        
        if (source.loading) {
            this.showLoadAnim();
            return;
        }
        
        switch (source.contentType) {
            case AUDIO:
                global.checkBox.setContent(source.content);
                this.showController(key);
                break;
            case REFERENCE:
                this.showReferenceDetail(key);
                break;
            default:
                this.showUnset(key);
        }
    },
    
    detach() {
        this[this.infoType].css('display', 'none');
        if (this.infoType == '$controller') {
            this.key.getSource().content.isAttachedController = false;
            if (this.progressID != -1) {
                this.stopProgress();
            }
        }
    },
    
    showUnfocus() {
        this.$unfocus.css('display', 'block');
        this.infoType = '$unfocus';
    },
    
    showLoadAnim() {
        this.$loadAnim.css('display', 'flex');
        this.infoType = '$loadAnim';
    },
    
    showUnset(key) {
        this.unset.$unsetKeyTag.text(key.name());
        this.$unset.css('display', 'flex');
        this.infoType = '$unset';
    },
    
    showController(key) {
        let source = key.getSource();
        let content = source.content;
        let ctrl = this.controller;
        
        ctrl.$ctrlKeyTag.text(key.name());
        
        ctrl.$filenameLine.text(content.filename);
        ctrl.$filenameLine.attr('title', content.filename);
        
        ctrl.$totalTime.text(this.getFormattedTime(content.buffer.duration));
        
        let radioIndex = ({'reset':0,'hold':1,'switch':2})[content.type];
        ctrl.$radios[radioIndex].checked = true;
        ctrl.$radios.checkboxradio('refresh');
        
        global.checkBox.check(content.loop);
        
        let volume = Math.round(source.gainNode.gain.value * 100);
        $(this.$sliders[1]).slider('value', volume);
        this.$volumes[1].textContent = volume;
        
        this.$controller.css('display', 'flex');
        this.infoType = '$controller';
        
        content.isAttachedController = true;
        if (content.work) this.startProgress(content);
    },
    
    showReferenceDetail(key) {
        let content = key.getSource().content;
        let refDetail = this.referenceDetail;
        
        refDetail.$referShowKey.text(key.name());
        
        let refText;
        switch (content.type) {
            case 'multipush':   refText = '一括 押下'; break;
            case 'multistop':   refText = '一括 停止'; break;
            case 'changeLayer': refText = 'レイヤー変更'; break;
        }
        refDetail.$referTypeDisp.text(refText);
        
        refDetail.$referSequenceContent[0].innerHTML = this.createReferSequenceHTML(content);
        
        this.$referenceDetail.css('display', 'flex');
        this.infoType = '$referenceDetail';
    },
    
    createReferSequenceHTML(content) {
        let keyIndexList = [], fastLayer, head = '', pad = '';
        
        if (content.type == 'changeLayer') {
            fastLayer = content.layer + 1;
            head = '-> '
        } else {
            keyIndexList = content.keyIndexList;
            fastLayer = keyIndexList[0][1] + 1;
            pad = ': ';
        }
        
        let html = head + `<span class="ref-layer${fastLayer}">Layer ${fastLayer}</span>` + pad;
        
        let preLayer = fastLayer;
        for (let i = 0, len = keyIndexList.length; i < len; i++) {
            let [keyIndex, layer] = keyIndexList[i];

            if (preLayer != (++layer)) {
                html += `<span class="ref-layer${layer} ref-layer-margin">Layer ${layer}</span>: `;
                preLayer = layer;
            } else if (i) {
                html += ', ';
            }
            
            let keyname = global.launchKeyList[keyIndex].name();
            if (keyIndex >= 43 && keyIndex <= 52) keyname = 'T' + keyname;
            html += keyname;
        }
        
        return html;
    },
    
    getFormattedTime(seconds) {
        let secBuf = Math.floor(seconds);
        let sec = secBuf % 60;
        secBuf -= sec;
        let min = (secBuf / 60) % 60;
        let hor = ((secBuf / 60) - min) / 60;
        
        let time = hor ? (String(hor) + ':') : '';
        time += (hor ? ('0' + min).slice(-2) : min) + ':';
        time += ('0' + sec).slice(-2);
        
        return time;
    },
    
    startProgress(content) {
        let startTime = content.startTime;
        let duration = content.buffer.duration;
        let progressBar = this.controller.progressBar;
        let progressTime = this.controller.$progressTime;
        let preErapse = 0;
        let preSec = 0;
        
        let calcProgress = () => {
            let sec = (audioCtx.currentTime - startTime) % duration;
            let elapse = Math.round((sec) / duration * 200);
            let diffElaple = elapse - preErapse;
            if (diffElaple) {
                if (elapse < preErapse) {
                    progressBar.clearRect(0, 0, preErapse, 11);
                    preErapse = 0;
                    diffElaple = elapse;
                }
                progressBar.fillRect(preErapse, 0, diffElaple, 11);
                preErapse = elapse;
            }
            
            sec = Math.floor(sec);
            if (sec != preSec) {
                progressTime.text(this.getFormattedTime(sec));
                preSec = sec;
            }
            
            this.progressID = requestAnimationFrame(calcProgress);
        };
        
        this.progressID = requestAnimationFrame(calcProgress);
    },
    
    stopProgress() {
        cancelAnimationFrame(this.progressID);
        this.progressID = -1;
        
        let ctrl = this.controller
        ctrl.progressBar.clearRect(0, 0, 200, 11);
        ctrl.$progressTime.text('0:00');
    },
    
    startVisualizeIfNeeded(nworkers) {
        if (nworkers != 1 || this.visualizeID != -1) return;
        
        let visualizer = this.master2.visualizer;
        let preLengthL = 0;
        let preLengthR = 0;
        
        let analyserL = audioCtx.createAnalyser();
        let analyserR = audioCtx.createAnalyser();
        const FFTSIZE = 2048;
        analyserL.fftSize = analyserR.fftSize = FFTSIZE;
        splitter.connect(analyserL, 0);
        splitter.connect(analyserR, 1);
        
        let calcVisualizeVisual = () => {
            let timesL = new Uint8Array(FFTSIZE);
            let timesR = new Uint8Array(FFTSIZE);
            analyserL.getByteTimeDomainData(timesL);
            analyserR.getByteTimeDomainData(timesR);
            
            let maxL = 0;
            let maxR = 0;
            for (let i = 0; i < FFTSIZE; i++) {
                maxL = Math.max(maxL, timesL[i]);
                maxR = Math.max(maxR, timesR[i]);
            }
            
            let lengthL = Math.ceil((Math.abs(maxL - 128) / 128) * 20);
            let lengthR = Math.ceil((Math.abs(maxR - 128) / 128) * 20);
            if (preLengthL != lengthL) {
                visualizer.drowVisualBlock(preLengthL, lengthL, 'left');
                preLengthL = lengthL;
            }
            if (preLengthR != lengthR) {
                visualizer.drowVisualBlock(preLengthR, lengthR, 'right');
                preLengthR = lengthR;
            }
            
            this.visualizeID = requestAnimationFrame(calcVisualizeVisual);
        }
        
        this.visualizeID = requestAnimationFrame(calcVisualizeVisual);
    },
    
    stopVisualizeIfNeeded(nworkers) {
        if (nworkers > 0) return;
        
        cancelAnimationFrame(this.visualizeID);
        this.visualizeID = -1;
        
        this.master2.visualizer.init();
    },
    
    incrementContentCount(layer) {
        let master1 = this.master1;
        let contentCount = this.LayerContentCounts[layer];
        contentCount++;
        if (contentCount == 1) {
            $(master1.$layerDisps[layer])
                .removeClass('empty-layer-disp')
                .addClass('contained-layer-disp');
            master1.$playMarks[layer].style.color = '#FF0000';
        }
        this.LayerContentCounts[layer] = contentCount;
        master1.$counterRights[layer].textContent = contentCount;
        
        let master2 = this.master2;
        let allContentsCount = ++global.allContentsCount;
        master2.$masterContentCounter.text(allContentsCount + ' / 648');
        if (allContentsCount == 1) {
            master2.$masterDeleteIcon.disabled = false;
            window.addEventListener('beforeunload', beforeunloadHandler);
        }

        let dialog = global.dialog;
        if (global.openedDialogs.has(dialog.$dialog) &&
            dialog.type == 'delete') {
            dialog.$deleteContentNumber.text(global.allContentsCount);
        }
    },
    
    decrementContentCount(layer) {
        let master1 = this.master1;
        let contentCount = this.LayerContentCounts[layer];
        contentCount--;
        if (contentCount == 0) {
            $(master1.$layerDisps[layer])
                .removeClass('contained-layer-disp')
                .addClass('empty-layer-disp');
            master1.$playMarks[layer].style.color = '';
        }
        this.LayerContentCounts[layer] = contentCount;
        master1.$counterRights[layer].textContent = contentCount;
        
        let master2 = this.master2;
        let allContentsCount = --global.allContentsCount;
        master2.$masterContentCounter.text(allContentsCount + ' / 648');
        if (allContentsCount == 0) {
            master2.$masterDeleteIcon.disabled = true;
            window.removeEventListener('beforeunload', beforeunloadHandler);
        }
    },
    
    incrementPlayCount(layer) {
        let master1 = this.master1;
        let playCount = this.LayerPlayCounts[layer];
        playCount++;
        if (playCount == 1) {
            master1.$playMarks[layer].innerHTML = '&#9654;';
            master1.$playMarks[layer].style.color = '#5EE819';
        }
        this.LayerPlayCounts[layer] = playCount;
        master1.$counterLefts[layer].textContent = playCount;
    },
    
    decrementPlayCount(layer) {
        let master1 = this.master1;
        let playCount = this.LayerPlayCounts[layer];
        playCount--;
        if (playCount == 0) {
            master1.$playMarks[layer].innerHTML = '&#9632;';
            if (this.LayerContentCounts[layer] > 0) {
                master1.$playMarks[layer].style.color = '#FF0000';
            }
        }
        this.LayerPlayCounts[layer] = playCount;
        master1.$counterLefts[layer].textContent = playCount;
    },
    
    calcMasterDataSize(buffer, sign) {
        let channels = buffer.numberOfChannels;
        let totalLength = 0;
        for (let channel = 0; channel < channels; channel++) {
            totalLength += buffer.getChannelData(channel).length;
        }
        return (this.audioDataSize += totalLength * 4 * sign);
    },
    
    changeMasterDataSize(buffer, sign) {
        let byteLength = this.calcMasterDataSize(buffer, sign);
        let unitIndex = 0;
        while(byteLength >= 1024) {
            byteLength /= 1024;
            unitIndex++;
        }
        
        let byteStr = String(byteLength);
        if (byteStr.length < 3 && byteStr != '0') {
            byteStr += '.' + '0'.repeat(3 - byteStr.length);
        } else {
            if (byteStr.indexOf('.') != -1) {
                let res = '', numCount = 0;
                for (let i = 0; i < byteStr.length; i++) {
                    res += byteStr[i];
                    if (byteStr[i] != '.') {
                        numCount++;
                        if (numCount == 3) break;
                    }
                }
                if (numCount < 3) res += '0';
                byteStr = res;
            }
        }
        
        if (unitIndex > 3) unitIndex = 3;
        byteStr += ' ' + ['B', 'KB', 'MB', 'GB'][unitIndex];
        this.master2.$masterDataSize.text(byteStr);
    },
    
    deleteKeyContent(key, layer) {
        let source = key.getSource(layer);
        let content = source.content;
        
        if (source.contentType == AUDIO) {
            this.changeMasterDataSize(content.buffer, -1);
            content.buffer = null;
        }
        key.deleteContent(layer);
        
        this.decrementContentCount(layer);
    },
    
    E_layerDisps_click($event) {
        let index = $(this).data('index');
        $(global.$layers[index]).click();
    },
    
    E_toolIcons_mouseenter($event) {
        $(this.firstElementChild).attr('class', 'tool-icon-enter');
    },
    
    E_toolIcons_mouseleave($event) {
        $(this.firstElementChild).attr('class', 'tool-icon-leave');
    },
    
    E_masterDeleteIcon_mouseenter($event) {
        let deleteIcon =
            InformationPanel.master2.$masterDeleteIcon;
        deleteIcon.entered = true;
        if (deleteIcon.disabled) return;
        
        deleteIcon.children().attr('class', 'tool-icon-enter');
    },
    
    E_masterDeleteIcon_mouseleave($event) {
        let deleteIcon =
            InformationPanel.master2.$masterDeleteIcon;
        deleteIcon.entered = false;
        if (deleteIcon.disabled) return;
        
        deleteIcon.children().attr('class', 'tool-icon-leave');
    },
    
    E_settingIcon_click($event) {
        if ($event.which != 1) return;
        
        global.dform.open(InformationPanel.key);
    },
    
    E_deleteIcon_click($event) {
        if ($event && $event.which != 1) return;
        
        if (this.id == 'master-delete-icon') {
            if (!InformationPanel.master2.$masterDeleteIcon.disabled) {
                global.dialog.open('delete');
            }
            return;
        }
        
        let self = InformationPanel;
        let key = self.key;
        
        self.detach();
        if (key.getSource().loading) {
            self.showLoadAnim();
        } else {
            self.showUnset(key);
        }
        self.deleteKeyContent(key, global.currentLayer);
    },
    
    E_stopBtn_mouseenter($event) {
        let btnStates = global.buttonStates['stop-btn'];
        btnStates.entered = true;
        if (btnStates.clicked) return;
        
        let targetIndex = (this.id == 'master-stop-btn') ? 0 : 1;
        let target = $(InformationPanel.$stopSquares[targetIndex]);
        target.removeClass('stop-square-leave')
              .addClass('stop-square-enter');
    },
    
    E_stopBtn_mouseleave($event) {
        let btnStates = global.buttonStates['stop-btn'];
        btnStates.entered = false;
        if (btnStates.clicked) return;

        let targetIndex = (this.id == 'master-stop-btn') ? 0 : 1;
        let target = $(InformationPanel.$stopSquares[targetIndex]);
        target.removeClass('stop-square-enter')
              .addClass('stop-square-leave');
    },
    
    E_stopBtn_click($event) {
        if ($event.which != 1) return;
        
        let btnStates = global.buttonStates['stop-btn'];
        
        if (btnStates.clicked) return;
        btnStates.clicked = true;
        
        let targetIndex = (this.id == 'master-stop-btn') ? 0 : 1;
        let target = $(InformationPanel.$stopSquares[targetIndex]);
        
        if (targetIndex) {
            let content = InformationPanel.key.getSource().content;
            if (content.work) {
                content.work.stop();
            }
        } else {
            for (let worker of global.workers) {
                worker.work && worker.work.stop();
            }
        }
        
        target.removeClass('stop-square-enter stop-square-leave')
              .addClass('stop-square-click1');
        
        setTimeout(function() {
            target.removeClass('stop-square-click1')
                  .addClass('stop-square-click2');
            
            setTimeout(function() {
                let addingClass = btnStates.entered ?
                    'stop-square-enter' : 'stop-square-leave';
                target.removeClass('stop-square-click2')
                      .addClass(addingClass);
                btnStates.clicked = false;
            }, 100);
        }, 50);
    },
    
    E_fileBtn1_mouseenter($event) {
        if (global.buttonStates['file-btn1'].downed) return;
        InformationPanel.unset.$fileBtn1.attr('class', 'file-btn1-enter');
    },
    
    E_fileBtn1_mouseleave($event) {
        if (global.buttonStates['file-btn1'].downed) return;
        InformationPanel.unset.$fileBtn1.attr('class', 'file-btn1-leave');
    },
    
    E_fileBtn1_mousedown($event) {
        if ($event.which != 1) return;
        
        global.buttonStates['file-btn1'].downed = true;
        InformationPanel.unset.$fileBtn1.attr('class', 'file-btn1-down');
    },
    
    E_fileBtn1MouseupHandler($event) {
        if ($event.which != 1) return;
        
        global.buttonStates['file-btn1'].downed = false;
        InformationPanel.E_fileBtn1_mouseleave();
    },
    
    E_fileBtn1_click($event) {
        InformationPanel.unset.$unsetFile.click();
    },
    
    E_unsetFile_change($event) {
        let key = InformationPanel.key;
        let files = $event.target.files;
        
        if (files.length == 0) return;
        
        key.S_dragenterColor(true, true, true);
        key.setAudioData([files[0]], false);
        
        this.value = '';
    },
    
    E_radios_change($event) {
        let key = InformationPanel.key;
        let source = key.getSource();
        let content = source.content;
        
        if (this.value == 'hold' && content.work && !source.pushed) {
            content.work.stop();
        }
        
        content.type = this.value;
        key.S_normalColor(true, true, true);
    },
    
    E_slider_slide($event, $ui) {
        let self = InformationPanel;
        let targetIndex = (this.id == 'master-volume-slider') ? 0 : 1;
        let gainNode = targetIndex ? self.key.getSource().gainNode : masterGain;
        
        gainNode.gain.value = $ui.value / 100;
        self.$volumes[targetIndex].textContent = $ui.value;
    },
    
    E_slider_mousedown($event) {
        let sliderIndex = $(this).data('slider-index');
        InformationPanel.$sliderWraps[sliderIndex].style.cursor = 'pointer';
        InformationPanel.downedSliderIndex = sliderIndex;
    }
}