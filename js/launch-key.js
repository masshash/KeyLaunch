window.AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.5;
masterGain.connect(audioCtx.destination);

const merger = audioCtx.createChannelMerger(2);
merger.connect(masterGain);

const splitter = audioCtx.createChannelSplitter(2);
splitter.connect(merger, 0, 0);
splitter.connect(merger, 1, 1);

function createGainNode() {
    let gainNode = audioCtx.createGain();
    gainNode.connect(splitter);
    return gainNode;
}

const keydeco = {
    select: '#222',
    
    unset: {
        leave: '#555',
        enter: '#888',
    },
    
    reset: {
        leave: '#FAAF08',
        enter: '#FFE23B'
    },
    hold: {
        leave: '#A5C05B',
        enter: '#D8F38E'
    },
    'switch': {
        leave: '#31A9B8',
        enter: '#64DCEB'
    },
    audioPlay: {
        leave: '#5EE819',
        enter: '#91FF4C'
    },
    pushedPlay: {
        leave: '#00ff00',
        enter: '#00ff00'
    },
    
    reference: {
        leave: '#CF3721',
        enter: '#FF6A54'
    },
    pushedRef: {
        leave: '#ff4500',
        enter: '#ff4500'
    }
};

const AUDIO     = Symbol('audio');
const REFERENCE = Symbol('reference');

function addWorker(content) {
    global.workers.add(content);
    return global.workers.size;
}

function deleteWorker(content) {
    global.workers.delete(content);
    return global.workers.size;
}

class LaunchKey {
    constructor(index, element) {
        this.index = index;
        this.$elem = $(element);
        this.dragging = false;
        this.enteredDrag = false;
        this.enteredDragLoading = false;
        this.selectAgain = false;
        this.dropDuringPlayback = false;
        this.layerSources = [...Array(12).keys()].map(() => ({
            contentType: null,
            content:     null,
            gainNode:    null,
            loading:     false,
            pushed:      false,
            indirect:    false,
            avoidPushedPlayColor: false
        }));
        
        $(element).on({
            mousedown:  this.E_mousedown(),
            dragstart:  this.E_dragstart(),
            dragend:    this.E_dragend(),
            dragenter:  this.E_dragenter(),
            dragleave:  this.E_dragleave(),
            dragover:   this.E_dragover(),
            drop:       this.E_drop()
        });
    }
    
    E_mousedown() {
        return $event => {
            if ($event) {
                $event.stopPropagation();
                if ($event.which != 1) return;
            }
            
            let focusedKey = global.$focusedKey;
            if (focusedKey == this && this.selectAgain == false) return;
            if (focusedKey) {
                if (focusedKey.getSource().loading) {
                    focusedKey.S_dragenterColor(false, true);
                } else {
                    focusedKey.S_normalColor(false, true);
                }
            }
            global.$focusedKey = this;
            this.S_borderColor(keydeco.select);
            
            global.infoPanel.attach(this);
            global.preFocusIndex = -1;
        }
    }
    static E_keepSelectedMousedownHandler($event) {
        global.keepSelected = true;
    }
    static E_mousedownHandler($event) {
        if (global.keepSelected) {
            global.keepSelected = false;
            return;
        }
        
        if (global.openedDialogs.size) return;
        
        let focusedKey = global.$focusedKey;
        if (focusedKey) {
            if (focusedKey.getSource().loading) {
                focusedKey.S_dragenterColor(false, true);
            } else {
                focusedKey.S_normalColor(false, true);
            }
            global.$focusedKey = null;
            
            global.infoPanel.attach();
            global.preFocusIndex = -1;
        }
    }
    
    E_dragstart() {
        return $event => {            
            global.dragging = this.dragging = true;
            this.S_opacity(0.5);
            let event = $event.originalEvent;
            event.dataTransfer.setData('text/javascript', String(this.index));
        }
    }
    
    E_dragend() {
        return $event => {
            global.dragging = this.dragging = false;
            this.S_opacity(1);
        }
    } 
    
    E_dragenter() {
        return $event => {
            let keyList = global.launchKeyList;
            let selfIndex = this.index;
            for (let i = 0; i < keyList.length; i++) {
                if (i == selfIndex) continue;
                if (keyList[i].enteredDrag) {
                    keyList[i].S_normalColor(true, true, keyList[i].isSelected());
                } else if (keyList[i].enteredDragLoading) {
                    keyList[i].enteredDragLoading = false;
                }
            }
            
            if (this.dragging) return;
            if (this.getSource().loading) {
                this.enteredDragLoading = true;
                return;
            }
            
            this.enteredDrag = true;
            this.S_dragenterColor(true, true, this.isSelected());
        };
    }
    
    E_dragleave() {
        return $event => {
            try {
                if($event.relatedTarget.nodeType == 3 ||
                    $event.target === $event.relatedTarget) return;
            } catch(error) {}

            if (this.dragging) return;
            if (this.getSource().loading) {
                this.enteredDragLoading = false;
                return;
            }
            
            this.enteredDrag = false;
            this.S_normalColor(true, true, this.isSelected());
        };
    }
    
    E_dragover() {
        return $event => {
            $event.preventDefault();
            $event.stopPropagation();
        }
    }
    
    E_drop() {
        return $event => {
            $event.preventDefault();
            
            this.enteredDrag = false;
            this.enteredDragLoading = false;
            
            if (this.dragging || this.getSource().loading) {
                return;
            }
            
            let dataTransfer = $event.originalEvent.dataTransfer;
            let selfSource = this.getSource();
            if (dataTransfer.types[0] == 'text/javascript') {
                let preContentType = selfSource.contentType;
                if (preContentType) {
                    global.infoPanel.decrementContentCount(global.currentLayer);
                    if (preContentType == AUDIO) {
                        global.infoPanel.changeMasterDataSize(
                            selfSource.content.buffer,
                            -1
                        );
                    }
                }
                
                let index = Number(dataTransfer.getData('text/javascript'));
                let other = global.launchKeyList[index];
                let otherSource = other.getSource();

                this.forceStopWork(otherSource);
                this.forceStopWork(selfSource);
                
                if ((selfSource.contentType = otherSource.contentType) == AUDIO) {
                    if (selfSource.gainNode == null) {
                        selfSource.gainNode = createGainNode();
                    }
                    selfSource.gainNode.gain.value = otherSource.gainNode.gain.value;
                }
                selfSource.content = otherSource.content;
                
                this.S_normalColor(true, false);
                this.E_mousedown()();
                this.P_allowDrag(true);
                
                other.deleteContent();
                
                return;
            }
            
            this.setAudioData(dataTransfer.files);
        };
    }
    
    forceStopWork(source) {
        let content = source.content
        if (content && content.work) {
            content.work.onended = null;
            content.work.stop();
            content.work = null;
            
            let infoPanel = global.infoPanel;
            if (content.isAttachedController) {
                infoPanel.stopProgress();
            }
            infoPanel.stopVisualizeIfNeeded(deleteWorker(content));
            infoPanel.decrementPlayCount(global.currentLayer);
        };
    }
    
    stopWork(source, dropDuringPlayback=false) {
        let content = source.content;
        if (content && content.work) {
            if (dropDuringPlayback) this.dropDuringPlayback = true;
            content.work.stop();
            return true;
        }
        return false;
    }
    
    filesCheck(files) {
        if (files.length == 0) {
            global.dialog.open('error', 'オーディオファイルを指定してください', this);
            return false;
        } else if (files.length > 1) {
            global.dialog.open('error', 'オーディオファイルを一つ指定してください', this);
            return false;
        }
        
        return true;
    }
    
    fileTypeAlert(file) {
        if (file.type.startsWith('audio')) {
            global.dialog.open(
                'error',
                '対応していないオーディオフォーマットです',
                this,
                [['ファイル', file.name]]
            );
        } else {
            global.dialog.open(
                'error',
                'オーディオファイルを指定してください',
                this,
                [['ファイル', file.name]]
            );
        }
    }
    
    setAudioData(files, selectAgain=true, setting=null) {
        let selfSource = this.getSource();
        this.stopWork(selfSource, true);
        selfSource.loading = true;
        
        if (selectAgain) {
            this.selectAgain = true;
            this.E_mousedown()();
            this.selectAgain = false;
        } else {
            global.infoPanel.attach(this);
        }
        
        let decodedLayer = global.currentLayer;
        
        if (!this.filesCheck(files)) {
            this.afterDecodeAudioData(decodedLayer, false);
            return;
        }
        
        this.P_allowDrag(false);
        
        let file = files[0];
        let reader = new FileReader();
        reader.onload = event => {
            let arraybuffer = event.target.result;
            audioCtx.decodeAudioData(arraybuffer).then(buffer => {
                if (!buffer) {
                    global.dialog.open(
                        'error',
                        '空のオーディオデータです',
                        this,
                        [['ファイル', file.name]]
                    );
                    this.afterDecodeAudioData(decodedLayer, false);
                    return;
                }
                
                let source = this.getSource(decodedLayer);
                let content;
                if (source.contentType == AUDIO) {
                    content = source.content;
                    content.type = 'reset';
                    content.loop = false;
                    global.infoPanel.calcMasterDataSize(content.buffer, -1);
                } else {
                    if (source.contentType == null) {
                        global.infoPanel.incrementContentCount(decodedLayer);
                    }
                    source.contentType = AUDIO;
                    content = this.createAudioContent();
                    source.content = content;
                    
                    if (source.gainNode == null) {
                        source.gainNode = createGainNode();
                    }
                }
                source.gainNode.gain.value = 0.5;
                content.filename = file.name;
                content.buffer = buffer;
                if (setting) {
                    content.type = setting.type;
                    content.loop = setting.loop;
                }
                
                global.infoPanel.changeMasterDataSize(buffer, 1);
                
                this.afterDecodeAudioData(decodedLayer, true);
            }).catch(error => {
                this.fileTypeAlert(file);
                this.afterDecodeAudioData(decodedLayer, false);
            });
        }
        
        reader.onerror = error => {
            global.dialog.open(
                'error',
                'ファイルの読み込みに失敗しました',
                this,
                [['ファイル', file.name]]
            );
            this.afterDecodeAudioData(decodedLayer, false);
        };

        reader.readAsArrayBuffer(file);
    }
    
    afterDecodeAudioData(decodedLayer, success) {
        this.getSource(decodedLayer).loading = false;
        if (global.currentLayer == decodedLayer) {
            if (global.$focusedKey == this) {
                this.S_deco(true, false);
                global.infoPanel.attach(this);
            } else {
                this.S_deco();
            }
            
            if (success) {
                this.P_allowDrag(true);
            } else {
                this.P_allowDrag(this.getSource(decodedLayer).contentType != null);
            }
        }
    }
    
    getSource(layer=global.currentLayer) {
        return this.layerSources[layer];
    }
    
    createAudioContent() {        
        return {
            filename:   '',
            buffer:     null,
            work:       null,
            type:       'reset',
            loop:       false,
            startTime:  0,
            isAttachedController: false
        };
    }
    
    deleteContent(layer=global.currentLayer) {
        let source = this.getSource(layer);
        source.contentType = null;
        let stopFlag = this.stopWork(source);
        if (layer == global.currentLayer) {
            if (!stopFlag) {
                if (source.loading) {
                    this.S_dragenterColor(true, true, this.isSelected());
                } else {
                    this.S_normalColor(true, true, this.isSelected());
                }
            }
            this.P_allowDrag(false);
        }
        source.content = null;
    }
    
    setReferenceContent(content) {
        let source = this.getSource();
        let contentType = source.contentType;
        let infoPanel = global.infoPanel;
        
        if (contentType == null) {
            infoPanel.incrementContentCount(global.currentLayer);
        } else if (contentType == AUDIO) {
            this.forceStopWork(source);
            infoPanel.changeMasterDataSize(source.content.buffer, -1);
            infoPanel.$controller.css('display', 'none');
            infoPanel.infoType = null;
        }
        source.contentType = REFERENCE;
        source.content = content;
        source.content.work = null;
        this.S_normalColor(true, true, true);
        this.P_allowDrag(true);
        
        infoPanel.attach(this);
    }
    
    isSelected() {
        return this == global.$focusedKey;
    }
    
    name() {
        return this.$elem.text();
    }
    
    P_allowDrag(allow) {
        this.$elem.prop('draggable', allow);
    }
    
    S_opacity(opacity) {
        this.$elem.css('opacity', opacity);
    }
    
    S_backgroundColor(color) {
        this.$elem.css('background-color', color);
    }
    
    S_borderColor(color) {
        this.$elem.css('border-color', color);
    }
    
    S_changeBackColor(color, back=true, border=true, selected=false) {
        if (back) this.S_backgroundColor(color);
        if (border) {
            if (selected) {
                this.S_borderColor(keydeco.select);
            } else {
                this.S_borderColor(color);
            }
        }
    }
    
    S_changeKeydecoColor(diff, back=true, border=true, selected=false) {
        let source = this.getSource();
        let decotype;
        switch (source.contentType) {
            case AUDIO:
                decotype = source.content.type;
                if (source.content.work) {
                    if (source.avoidPushedPlayColor) {
                        decotype = 'audioPlay';
                        source.avoidPushedPlayColor = false;
                    } else if (source.pushed || source.indirect) {
                        decotype = 'pushedPlay';
                    } else {
                        decotype = 'audioPlay';
                    }
                }
                break;
            case REFERENCE:
                decotype = 'reference';
                if (source.content.work) decotype = 'pushedRef';
                break;
            default:
                decotype = 'unset';
        }
        this.S_changeBackColor(keydeco[decotype][diff], back, border, selected);
    }
    
    S_normalColor(back=true, border=true, selected=false) {
        this.S_changeKeydecoColor('leave', back, border, selected);
    }
    
    S_dragenterColor(back=true, border=true, selected=false) {
        this.S_changeKeydecoColor('enter', back, border, selected);
    }
    
    S_deco(back=true, border=true, selected=false) {
        if (this.enteredDrag || this.enteredDragLoading) {
            this.S_dragenterColor(back, border, selected);
        } else {
            this.S_normalColor(back, border, selected);
        }
    }
    
    createSound(buffer) {
        let work = audioCtx.createBufferSource();
        work.buffer = buffer;
        return work;
    }
    
    keyAction(eventType, layer=global.currentLayer, isDirect=true) {
        let source = this.getSource(layer);
        source.indirect = !isDirect;
        
        if (eventType == KEYDOWN && isDirect) {
            if (source.pushed) return;
            source.pushed = true;
            if (main.pushFocusIsActive) {
                this.E_mousedown()();
            }
        } else if (eventType == KEYUP) {
            source.pushed = false;
        }
        
        if (source.loading) return;
        
        if (source.contentType == null) return;
        this['T_' + source.content.type](eventType, source, layer);
    }
    
    play(content, gainNode, layer) {
        let work = this.createSound(content.buffer);
        
        work.onended = () => {
            content.work = null;
            
            let infoPanel = global.infoPanel;
            if (content.isAttachedController) {
                infoPanel.stopProgress();
            }
            infoPanel.stopVisualizeIfNeeded(deleteWorker(content));
            infoPanel.decrementPlayCount(layer);
            
            if (layer == global.currentLayer) {
                if (this.dropDuringPlayback) {
                    this.S_dragenterColor(true, true, this.isSelected());
                    this.dropDuringPlayback = false;
                } else {
                    this.S_deco(true, true, this.isSelected());
                }
            }
        };
        
        work.loop = content.loop;
        work.connect(gainNode);
        content.work = work;
        
        work.start();
        
        content.startTime = audioCtx.currentTime;
        if (content.isAttachedController) {
            global.infoPanel.startProgress(content);
        }
        global.infoPanel.startVisualizeIfNeeded(addWorker(content));
        
        if (layer == global.currentLayer) {
            this.S_deco(true, true, this.isSelected());
        }
    }
    
    T_reset(eventType, source, layer) {
        if (eventType == KEYDOWN) {
            let content = source.content
            if (content.work) {
                content.work.onended = null;
                content.work.stop();
                if (content.isAttachedController) {
                    global.infoPanel.stopProgress();
                }
            } else {
                global.infoPanel.incrementPlayCount(layer);
            }
            
            this.play(content, source.gainNode, layer);
        } else if (eventType == KEYUP) {
            if (layer == global.currentLayer) {
                this.S_deco(true, true, this.isSelected());
            }
        }
    }
    
    T_hold(eventType, source, layer) {
        let content = source.content
        if (eventType == KEYDOWN && !content.work) {
            global.infoPanel.incrementPlayCount(layer);
            this.play(content, source.gainNode, layer);
        } else if (eventType == KEYUP) {
            if (content.work) {
                content.work.stop();
            }
        }
    }
    
    T_switch(eventType, source, layer) {
        if (eventType == KEYDOWN) {
            let content = source.content
            if (content.work) {
                content.work.stop();
                return;
            } else {
                global.infoPanel.incrementPlayCount(layer);
            }

            this.play(content, source.gainNode, layer);
        } else if (eventType == KEYUP) {
            if (layer == global.currentLayer) {
                this.S_deco(true, true, this.isSelected());
            }
        }
    }
    
    T_multipush(eventType, source, layer) {
        if (eventType == KEYDOWN) {
            let content = source.content;
            content.work = {
                stop: () => {
                    this.T_multipush(KEYUP, source, layer);
                }
            }
            
            let launchKeyList = global.launchKeyList;
            let lastChangeLayer = null;
            for (let [index, selectedlayer] of content.keyIndexList) {
                let target = launchKeyList[index].getSource(selectedlayer);
                if (target.contentType == REFERENCE) {
                    switch (target.content.type) {
                        case 'changeLayer':
                            lastChangeLayer = [index, selectedlayer];
                            continue;
                    }
                }
                launchKeyList[index].keyAction(KEYDOWN, selectedlayer, false);
            }
            if (lastChangeLayer) {
                let [index, selectedlayer] = lastChangeLayer;
                launchKeyList[index].keyAction(KEYDOWN, selectedlayer, false);
            }
            
            if (layer == global.currentLayer) {
                this.S_deco(true, true, this.isSelected());
            }
        } else if(eventType == KEYUP) {
            let content = source.content;
            content.work = null;

            let launchKeyList = global.launchKeyList;
            for (let [index, selectedlayer] of content.keyIndexList) {
                launchKeyList[index].keyAction(KEYUP, selectedlayer);
            }
            
            if (layer == global.currentLayer) {
                if (this.dropDuringPlayback) {
                    this.S_dragenterColor(true, true, this.isSelected());
                    this.dropDuringPlayback = false;
                } else {
                    this.S_deco(true, true, this.isSelected());
                }
            }
        }
    }
    
    T_multistop(eventType, source, layer) {
        if (eventType == KEYDOWN) {
            let content = source.content;
            content.work = {
                stop: () => {
                    this.T_multistop(KEYUP, source, layer);
                }
            }
            
            let launchKeyList = global.launchKeyList;
            for (let [index, selectedlayer] of content.keyIndexList) {
                let source = launchKeyList[index].getSource(selectedlayer);
                this.stopWork(source);
            }
            
            if (layer == global.currentLayer) {
                this.S_deco(true, true, this.isSelected());
            }
        } else if (eventType == KEYUP) {
            source.content.work = null;
            if (layer == global.currentLayer) {
                if (this.dropDuringPlayback) {
                    this.S_dragenterColor(true, true, this.isSelected());
                    this.dropDuringPlayback = false;
                } else {
                    this.S_deco(true, true, this.isSelected());
                }
            }
        }
    }
    
    T_changeLayer(eventType, source, layer) {
        if (eventType == KEYDOWN) {
            let content = source.content;
            content.work = {
                stop: () => {
                    this.T_changeLayer(KEYUP, source, layer);
                }
            }
            
            $(global.$layers[content.layer]).click();

            if (layer == global.currentLayer) {               
                this.S_deco(true, true, this.isSelected());
            }
        } else if (eventType == KEYUP) {
            source.content.work = null;
            if (layer == global.currentLayer) {
                if (this.dropDuringPlayback) {
                    this.S_dragenterColor(true, true, this.isSelected());
                    this.dropDuringPlayback = false;
                } else {
                    this.S_deco(true, true, this.isSelected());
                }
            }
        }
    }
}
