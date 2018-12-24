const DialogForm = {
    init() {
        this.key = null;
        
        this.$dialogForm = $('#dialog-form');
        this.$dialogForm.mousedown($event => $event.stopPropagation());
        
        this.$dformTitle = $('#dform-title');
        this.$dformTitle.mousedown(this.E_dialogTitle_mousedown);
        this.dragging = false;
        this.clickX = this.clickY = this.clickTop = this.clickLeft = 0;
        
        this.$dformContent = $('#dform-content');
        
        this.$title = $('#title');
        
        let closeBtn = $('#close-btn');
        closeBtn.on({
           mouseenter: this.E_closeBtn_mouseenter,
           mouseleave: this.E_closeBtn_mouseleave,
           mousedown:  this.E_closeBtn_mousedown,
           click:      () => this.close()
        });
        
        let dformOkBtn = $('#dform-ok-btn').click(() => this.ok());
        let dformCancelBtn = $('#dform-cancel-btn').click(() => this.close());
        let fileBtn2 = $('#file-btn2').click(() => audioFormFile.click());
        let clearBtn = $('#clear-btn').click(this.E_clearBtn_click);
        
        this.buttons = {
            'close-btn': closeBtn,
            'dform-ok-btn': dformOkBtn,
            'dform-cancel-btn': dformCancelBtn,
            'file-btn2': fileBtn2,
            'clear-btn': clearBtn
        }
        $('.dform-btn').on({
           mouseenter: this.E_dformBtns_mouseenter,
           mouseleave: this.E_dformBtns_mouseleave,
           mousedown:  this.E_dformBtns_mousedown,
        });
        
        this.$contentRadio = $('input[name="content-radio"]');
        this.$contentRadio.change(this.E_contentRadios_change);
        
        this.$audioForm = $('#audio-form');
        this.$referenceForm = $('#reference-form');
        
        let audioFormFile = $('#audio-form-file');
        audioFormFile.change(this.E_audioFormFile_change);
        
        let launchTypeRadio = $('input[name="launch-type-radio"]')
        launchTypeRadio.change(this.E_launchTypeRadio_change);
        
        let loop = $('#loop');
        loop.change($event => this.audioFormSetting.loop = $event.target.checked);
        
        this.audioForm = {
            $audioFormFilename: $('#audio-form-filename'),
            $launchTypeRadio:   launchTypeRadio,
            $loop:              loop
        };
        
        this.audioFormSetting = {
            files: null,
            type: 'reset',
            loop: false
        };
        
        this.currentLayer = 0;
        this.selectedKeyCounter = 0;
        this.overflowFixFlag = true;
        this.selectedKeySets = [...Array(12).keys()].map(() => new Set());
        
        let referenceTypeRadio = $('input[name="reference-type-radio"]');
        referenceTypeRadio.change(this.E_referenceTypeRadio_change);
        
        let layerSelecter = $('select[name="layer"]');
        layerSelecter.change(this.E_selectLayer_change);
        
        let keyCheckboxes = $('#key-checkboxes-wrapper input');
        keyCheckboxes.change(this.E_keyCheckboxes_change);
        
        this.refForm = {
            $referenceTypeRadio:   referenceTypeRadio,
            $reftypePrompt:        $('#reftype-prompt'),
            $layerSelecter:        layerSelecter,
            $layerOptions:         $('select[name="layer"] > option'),
            $keyCheckboxesWrapper: $('#key-checkboxes-wrapper'),
            $clWraps:              $('.checkbox-row > div:not(.dummy-cl-wrap)'),
            $keyCheckboxes:        keyCheckboxes,
            $checkboxesBottom:     $('#checkboxes-bottom'),
            $selectedKeyCounter:   $('#selected-key-counter')
        };
        
        this.refFormSetting = {
            type:         'multipush',
            keyIndexList: null,
            layer:        0
        };

        this.modalMousedowned = false;
        let dformModal = $('#dform-modal');
        dformModal.mousedown(this.E_dformModal_mousedown);
        this.$dformModal = dformModal;
    },
    
    open(key) {
        this.key = key;
        let keyname = key.name();
        if (key.index >= T7 && key.index <= T0) keyname = 'T' + keyname;
        this.$title.text(keyname + ' キーの設定');
        
        let source = key.getSource();
        if (source.contentType == REFERENCE) {
            this.refFormSet(source.content);
        } else {
            if (source.contentType == AUDIO) {
                this.audioFormSet(source.content);
            }
            let layerSelecter = this.refForm.$layerSelecter;
            layerSelecter[0].selectedIndex = global.currentLayer;
            layerSelecter.change();
        }
        
        this.ownCheckboxDisabled(this.currentLayer == global.currentLayer);
        
        global.openedDialogs.add(this.$dialogForm);
        
        centeringDialogPosResizeHandler();
        
        this.$dformModal.css('display', 'block');
    },
    
    ok() {
        let isAudioSettings = this.$contentRadio[0].checked;
        let setting = isAudioSettings ? this.audioFormSetting : this.refFormSetting;
        let key = this.key;
        let keySets = this.selectedKeySets;
        
        this.close();
        
        if (isAudioSettings) {
            let files = setting.files
            if (files == null) {
                let source = key.getSource();
                if (source.contentType == AUDIO) {
                    let content = source.content;
                    if (content.type != setting.type) {
                        let radioIndex = ({'reset':0,'hold':1,'switch':2})[setting.type];
                        global.infoPanel.controller.$radios[radioIndex].click();
                    }
                    if (content.loop != setting.loop) {
                        global.checkBox.$loopBtn.click();
                    }
                }
                return;
            }
            key.S_dragenterColor(true, true, true);
            key.setAudioData(files, false, setting);
        } else {
            if (setting.type != 'changeLayer') {
                let sum = 0;
                keySets.forEach((set) => sum += set.size);
                if (sum == 0) return;
                let selectedKeyIndexList = [];
                for (let layer = 0, len = keySets.length; layer < len; layer++) {
                    for (let keyIndex of keySets[layer]) {
                        selectedKeyIndexList.push([keyIndex, layer]);
                    }
                }
                selectedKeyIndexList.sort(this.compareKeyIndex);
                setting.keyIndexList = selectedKeyIndexList;
            }
            key.setReferenceContent(setting);
        }
    },
    
    close() {
        if (this.$contentRadio[1].checked) {
            this.$contentRadio[0].checked = true;
            $(this.$contentRadio[0]).change();
        }
        this.audioFormReset();
        this.refFormReset();
        this.key = null;
        
        this.$dformModal.css('display', 'none');
        
        global.openedDialogs.delete(this.$dialogForm);
    },
    
    audioFormSet(content) {
        let audioForm = this.audioForm;
        audioForm.$audioFormFilename.text(content.filename);
        
        let radioIndex = ({'reset':0,'hold':1,'switch':2})[content.type];
        if (radioIndex > 0) {
            let setRadio = audioForm.$launchTypeRadio[radioIndex];
            setRadio.checked = true;
            $(setRadio).change();
        }
        
        if (content.loop) {
            let loop = audioForm.$loop;
            loop[0].checked = true;
            loop.change();
        }
    },
    
    refFormSet(content) {
        let refContentRadio = this.$contentRadio[1];
        refContentRadio.checked = true;
        $(refContentRadio).change();
        
        let refForm = this.refForm;
        
        let radioIndex = 
            ({'multipush':0,'multistop':1,'changeLayer':2})[content.type];
        let setRadio = refForm.$referenceTypeRadio[radioIndex];
        setRadio.checked = true;
        $(setRadio).change();
        
        let keyIndexList = content.keyIndexList;
        let layerSelecter = refForm.$layerSelecter;
        if (keyIndexList) {
            let keyCount = 0;
            keyIndexList.forEach(function(keyIndex) {
                let [index, layer] = keyIndex;
                DialogForm.selectedKeySets[layer].add(index);
                keyCount++;
            });
            
            this.selectedKeySets.forEach(this.getFillOptionsFunc('#F6931F'));
            
            layerSelecter[0].selectedIndex = keyIndexList[0][1];
            layerSelecter.change();
            
            this.selectedKeyCounter = keyCount;
            refForm.$selectedKeyCounter.text(keyCount);
        } else {
            layerSelecter[0].selectedIndex = content.layer;
            layerSelecter.change();
        }
        
        let scrollable = refForm.$keyCheckboxesWrapper;
        let initScrollLeft = function() {
            scrollable.scrollLeft(1);
            if (scrollable.scrollLeft() == 0) {
                setTimeout(initScrollLeft, 17);
            } else {
                scrollable.scrollLeft(0);
            }
        }
        initScrollLeft();
    },
    
    audioFormReset() {
        this.audioFormSetting = {
            files: null,
            type: 'reset',
            loop: false
        }
        
        let resetRadio = this.audioForm.$launchTypeRadio[0];
        if (!resetRadio.checked) {
            resetRadio.checked = true;
        }
        
        let loop = this.audioForm.$loop[0];
        if (loop.checked) {
            loop.checked = false;
        }
        
        this.audioForm.$audioFormFilename.text('選択されていません');
    },
    
    refFormReset() {
        this.refFormSetting = {
            type:         'multipush',
            keyIndexList: null,
            layer:        0
        };
        
        let reftype0 = this.refForm.$referenceTypeRadio[0];
        if (!reftype0.checked) {
            reftype0.checked = true;
            $(reftype0).change();
        }
        
        this.selectedKeySets.forEach(this.getFillOptionsFunc(''));
        this.selectedKeySets = [...Array(12).keys()].map(() => new Set());
        
        this.ownCheckboxDisabled(false);
        
        this.selectedKeyCounter = 0;
        this.refForm.$selectedKeyCounter.text(0);
        
        this.overflowFixFlag = true;
    },
    
    compareKeyIndex(a, b) {
        return (100 * a[1] + a[0]) - (100 * b[1] + b[0]);
    },
    
    getFillOptionsFunc(color) {
        let options = DialogForm.refForm.$layerOptions;
        return function(set, index) {
            if (set.size) options[index].style.backgroundColor = color;
        }
    },
    
    ownCheckboxDisabled(disabled) {
        let keyIndex = this.key.index;
        let chkbox = this.refForm.$keyCheckboxes[keyIndex];
        let clWrap = this.refForm.$clWraps[keyIndex];
        
        chkbox.disabled = disabled;
        clWrap.style.opacity = disabled ? '0.5' : '1';
    },
    
    E_dialogTitle_mousedown($event) {
        if ($event.which != 1) return;
        
        let self = DialogForm;
        
        self.clickX    = $event.clientX;
        self.clickY    = $event.clientY;
        self.clickTop  = self.$dialogForm[0].offsetTop;
        self.clickLeft = self.$dialogForm[0].offsetLeft;
        
        self.dragging = true;
    },
    
    E_dialogTitleMousemoveHandler($event) {
        if (!DialogForm.dragging) return;
        
        let clientW = $(window).width()
        let clientH = $(window).height();
        let clientX = $event.clientX
        let clientY = $event.clientY;
        let marginW = clientW - clientX;
        let marginH = clientH - clientY;
        if (marginW > clientW || marginW < 1) {
            clientX = (marginW < 1) ? clientW - 1 : 0;
        }
        if (marginH > clientH || marginH < 1) {
            clientY = (marginH < 1) ? clientH - 1 : 0;
        }
        
        let self = DialogForm;
        
        let diffX = clientX - self.clickX;
        let diffY = clientY - self.clickY;
        self.$dialogForm.css('top', self.clickTop + diffY);
        self.$dialogForm.css('left', self.clickLeft + diffX);
    },
    
    E_dialogTitleMouseupHandler($event) {
        if (!DialogForm.dragging) return;
        DialogForm.dragging = false;
    },
    
    E_contentRadios_change($event) {
        let self = DialogForm;
        let [audioDispType, refDispType] =
            this.value == 'audio' ? ['block', 'none'] : ['none', 'block'];
        
        self.$audioForm.css('display', audioDispType);
        self.$referenceForm.css('display', refDispType);
        
        if (self.overflowFixFlag) {
            self.refForm.$keyCheckboxesWrapper.scrollLeft(0);
            self.overflowFixFlag = false;
        }
    },
    
    E_audioFormFile_change($event) {
        let self = DialogForm;
        let files = $event.target.files;
        
        if (files.length == 0) return;
        
        self.audioForm.$audioFormFilename.text(files[0].name);
        self.audioFormSetting.files = [files[0]];
        
        this.value = '';
    },
    
    E_launchTypeRadio_change($event) {
        DialogForm.audioFormSetting.type = this.value;
    },
    
    E_referenceTypeRadio_change($event) {
        let self = DialogForm;
        let refForm = self.refForm;
        let keySets = self.selectedKeySets;
        let text = '', displayType = 'flex';
        let value = this.value;
        
        self.refFormSetting.type = value;
        if (value == 'changeLayer') {
            displayType = 'none';
            text = '変更するレイヤーを選択';
            keySets.forEach(self.getFillOptionsFunc(''));
        } else {
            text = (value == 'multipush' ? '一括押下' : '一括停止') + 'するキーを選択';
            keySets.forEach(self.getFillOptionsFunc('#F6931F'));
        }
        
        refForm.$keyCheckboxesWrapper.css('display', displayType);
        refForm.$checkboxesBottom.css('display', displayType);
        refForm.$reftypePrompt.text(text);
    },
    
    E_selectLayer_change($event) {
        let self = DialogForm;
        
        self.refFormSetting.layer = self.currentLayer = Number(this.value);

        self.ownCheckboxDisabled(self.currentLayer == global.currentLayer);
        
        let boxes = self.refForm.$keyCheckboxes;
        for (let box of boxes) {
            box.checked = false;
        }
        
        let keySet = self.selectedKeySets[self.currentLayer];
        for (let target of keySet) {
            boxes[target].checked = true;
        }
    },
    
    E_keyCheckboxes_change($event) {
        let self = DialogForm;
        
        let keySet = self.selectedKeySets[self.currentLayer];
        let currentOption = self.refForm.$layerOptions[self.currentLayer];
        let keyCountDisp = self.refForm.$selectedKeyCounter;
        let methodName;
        
        if (this.checked) {
            methodName = 'add';
            self.selectedKeyCounter++;
            if (keySet.size == 0) {
                currentOption.style.backgroundColor = '#F6931F';
            }
        } else {
            methodName = 'delete';
            self.selectedKeyCounter--;
            if (keySet.size == 1) {
                currentOption.style.backgroundColor = '';
            }
        }
        
        keySet[methodName](Number(this.value));
        keyCountDisp.text(self.selectedKeyCounter);
    },
    
    E_dformBtns_mouseenter($event, id) {
        id = $event ? this.id : id;
        let btnStates = global.buttonStates[id];
        
        if (id == 'clear-btn') {
            btnStates.entered = true;
        }
        
        if (btnStates.downed) return;
        
        DialogForm.buttons[id]
            .removeClass('dform-btn-leave dform-btn-down')
            .addClass('dform-btn-enter');
    },
    
    E_dformBtns_mouseleave($event, id) {
        id = $event ? this.id : id;
        let btnStates = global.buttonStates[id];
        
        if (id == 'clear-btn') {
            btnStates.entered = false;
        }
        
        if (btnStates.downed) return;
        
        DialogForm.buttons[id]
            .removeClass('dform-btn-enter dform-btn-down')
            .addClass('dform-btn-leave');
    },
    
    E_dformBtns_mousedown($event) {
        if ($event.which != 1) return;
        
        let id = this.id;
        
        global.buttonStates[id].downed = true;
        DialogForm.buttons[id]
            .removeClass('dform-btn-enter')
            .addClass('dform-btn-down');
    },
    
    E_dformBtnsMouseupHandler($event, id) {
        if ($event.which != 1) return;
        
        let btnStates = global.buttonStates[id]; 
        btnStates.downed = false;
        if (id == 'clear-btn' && btnStates.entered) {
            DialogForm.E_dformBtns_mouseenter(null, 'clear-btn');
        } else {
            DialogForm.E_dformBtns_mouseleave(null, id);
        }
    },
    
    E_closeBtn_mouseenter($event) {
        if (global.buttonStates['close-btn'].downed) return;
        DialogForm.buttons['close-btn'].attr('class', 'close-btn-enter');
    },
    
    E_closeBtn_mouseleave($event) {
        if (global.buttonStates['close-btn'].downed) return;
        DialogForm.buttons['close-btn'].attr('class', 'close-btn-leave');
    },
    
    E_closeBtn_mousedown($event) {
        $event.stopPropagation();
        
        if ($event.which != 1) return;
        
        global.buttonStates['close-btn'].downed = true;
        DialogForm.buttons['close-btn'].attr('class', 'close-btn-down');
    },
    
    E_closeBtnMouseupHandler($event) {
        if ($event.which != 1) return;
        
        global.buttonStates['close-btn'].downed = false;
        DialogForm.E_closeBtn_mouseleave();
    },
    
    E_clearBtn_click($event) {
        let self = DialogForm;
        let refForm = self.refForm;
        
        self.selectedKeySets.forEach(self.getFillOptionsFunc(''));
        self.selectedKeySets = [...Array(12).keys()].map(() => new Set());
        
        let layerSelecter = refForm.$layerSelecter;
        layerSelecter[0].selectedIndex = 0;
        layerSelecter.change();
        
        self.selectedKeyCounter = 0;
        refForm.$selectedKeyCounter.text(0);
    },
    
    E_dformModal_mousedown($event) {
        if ($event.which != 1) return;
        
        let self = DialogForm;
        
        self.modalMousedowned = true;
        self.$dformTitle.css('border-color', 'lime');
        self.$dformContent.css('border-color', 'lime');
    }
}
