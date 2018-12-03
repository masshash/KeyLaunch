const global = {
    currentLayer:     0,
    launchKeyList:    [],
    $focusedKey:      null,
    keepSelected:     false,
    dragging:         false,
    infoPanel:        null,
    checkBox:         null,
    $layers:          null,
    openedDialogs:    new Set(),
    workers:          new Set(),
    allContentsCount: 0,
    
    buttonStates: {
        'stop-btn':   { clicked: false, entered: false},
        'loop-btn':   { downed: false, entered: false},
        'file-btn1':  { downed: false },
        'file-btn2':  { downed: false },
        'close-btn':  { downed: false },
        'clear-btn':  { downed: false, entered: false },
        'dform-ok-btn':      { downed: false },
        'dform-cancel-btn':  { downed: false },
        'dialog-ok-btn':     { downed: false },
        'dialog-cancel-btn': { downed: false }
    },
};

const main = {
    relFnkeyIsActive:  false,
    pushFocusIsActive: true,
    $relFnkeyBtn:      null,
    $launcher:         null
}

const KEYDOWN = Symbol('keydown');
const KEYUP   = Symbol('keyup');

const $window = $(window);

jQuery(function ($) {
    let $layers = $('.layer');
    global.$layers = $layers;
    let $relFnkeyBtn = $('#rel-fnkey-btn');
    main.$relFnkeyBtn = $relFnkeyBtn;
    
    let $keys = $('.key');
    let $keySquares = $('.key-square');
    let $spaceKey = $('#space-key');
    let $t0Key = $('#t0-key');

    let $rows = $('.shift-row');
    let $tenKey = $('#ten-key');
    let $mainKey = $('#main-key');
    let $keyboard = $('#keyboard');
    let $launcher = $('#launcher');
    main.$launcher = $launcher;
    
    for (let i = 0; i < $keys.length; i++) {
        global.launchKeyList.push(new LaunchKey(i, $keys[i]));
    }
    
    InformationPanel.init();
    global.infoPanel = InformationPanel;
    
    CustomCheckBox.init();
    global.checkBox = CustomCheckBox;
    
    DialogForm.init();
    global.dform = DialogForm;
    
    Dialog.init();
    global.dialog = Dialog;
    
    $('#information-panel').mousedown(LaunchKey.E_keepSelectedMousedownHandler);
    $layers.mousedown(LaunchKey.E_keepSelectedMousedownHandler);
    $relFnkeyBtn.mousedown(LaunchKey.E_keepSelectedMousedownHandler);
    $(document).mousedown(LaunchKey.E_mousedownHandler);
    $(document.documentElement).mousedown(function($event) {
        if (event.clientX >= this.offsetWidth ||
            event.clientY >= this.offsetHeight) {
            LaunchKey.E_keepSelectedMousedownHandler();
        }
    });
    
    $(document).mousemove(global.dform.E_dialogTitleMousemoveHandler);
    $(document).mouseup(global.dform.E_dialogTitleMouseupHandler);
    
    $(document).mouseup(function($event) {
        let btnStates = global.buttonStates;
        
        if (btnStates['loop-btn'].downed) {
            global.checkBox.E_mouseupHandler($event);
        }
        
        if (btnStates['file-btn1'].downed) {
           global.infoPanel.E_fileBtn1MouseupHandler($event);
        }
        
        if (btnStates['close-btn'].downed) {
            global.dform.E_closeBtnMouseupHandler($event);
        }
        
        if (btnStates['file-btn2'].downed) {
            global.dform.E_dformBtnsMouseupHandler($event, 'file-btn2');
        }
        if (btnStates['clear-btn'].downed) {
            global.dform.E_dformBtnsMouseupHandler($event, 'clear-btn');
        }
        if (btnStates['dform-ok-btn'].downed) {
            global.dform.E_dformBtnsMouseupHandler($event, 'dform-ok-btn');
        }
        if (btnStates['dform-cancel-btn'].downed) {
            global.dform.E_dformBtnsMouseupHandler($event, 'dform-cancel-btn');
        }
        
        if (btnStates['dialog-ok-btn'].downed) {
            global.dialog.E_dialogBtnsMouseupHandler($event, 'dialog-ok-btn');
        }
        if (btnStates['dialog-cancel-btn'].downed) {
            global.dialog.E_dialogBtnsMouseupHandler($event, 'dialog-cancel-btn');
        }
        
        if (global.infoPanel.downedSliderIndex != -1) {
            let infoPanel = global.infoPanel;
            let sliderIndex = infoPanel.downedSliderIndex;
            infoPanel.$sliderWraps[sliderIndex].style.cursor = '';
            infoPanel.downedSliderIndex = -1;
        }
    });
    
    $(document).mouseup(modalMouseupHandler);
    
    $(document).on('dragover dragenter', function($event) {
        let event = $event.originalEvent;
        event.dataTransfer.dropEffect = "none";
        event.preventDefault();
    });
    
    $layers.click(function($event) {
        let nextLayer = Number(this.textContent) - 1;
        let preLayer = global.currentLayer
        if (nextLayer == preLayer) return;
        
        $($layers[preLayer]).removeClass(`active-layer layer${preLayer+1}`).addClass('inactive-layer');
        $($layers[nextLayer]).removeClass('inactive-layer').addClass(`active-layer layer${nextLayer+1}`);
        
        let infoPanel = global.infoPanel;
        infoPanel.master1.$layerDisps[preLayer].id = '';
        infoPanel.master1.$layerDisps[nextLayer].id = 'layer-disp' + (nextLayer + 1);
        
        global.currentLayer = nextLayer;
        for (let key of global.launchKeyList) {
            let nextSource = key.getSource(nextLayer);
            let preSource = key.getSource(preLayer);
            
            let preContent = preSource.content
            if (preSource.contentType && preContent.work) {
                if (preContent.type == 'hold' || preSource.contentType == REFERENCE) {
                    preContent.work.stop();
                }
            }
            if (preSource.pushed) {
                preSource.pushed = false;
                nextSource.pushed = true;
                if (nextSource.contentType == AUDIO) {
                    nextSource.avoidPushedPlayColor = true;
                }
            }
            
            if (nextSource.loading) {
                key.S_dragenterColor();
            } else {
                key.S_normalColor();
            }
            
            key.P_allowDrag(nextSource.contentType != null);
        }
        
        let focusedKey = global.$focusedKey
        if (focusedKey) {
            infoPanel.detach(preLayer);
            infoPanel.infoType = null;
            infoPanel.attach(focusedKey);
            focusedKey.S_borderColor(keydeco.select);
        }
    });
    
    $relFnkeyBtn.click(function($event) {
        main.relFnkeyIsActive = !main.relFnkeyIsActive;
        if (main.relFnkeyIsActive) {
            main.$relFnkeyBtn.attr('class', 'active-rel-fnkey');
            main.$relFnkeyBtn.attr('title', 'ファンクションキー押下と連動: 有効');
        } else {
            main.$relFnkeyBtn.attr('class', 'inactive-rel-fnkey');
            main.$relFnkeyBtn.attr('title', 'ファンクションキー押下と連動: 無効');
        }
    });
    
    $(document).keydown(keyEventHandlerFactory(KEYDOWN));
    $(document).keyup(keyEventHandlerFactory(KEYUP));
    
    centeringLauncherPosResizeHandler();
    $window.resize(centeringLauncherPosResizeHandler);
    $window.resize(centeringDialogPosResizeHandler);
    
    /*window.resizeKeyboard = function(keySize) {
        let innerKeySize = keySize - (3 * 2);

        let innerMargin = Math.round(keySize * 0.08);
        innerMargin = innerMargin < 2 ? 2 : innerMargin;
        if (innerMargin % 2 != 0) {
            innerMargin--;
        }
        let boxMargin = innerMargin / 2;

        let ks05 = keySize * 0.5;
        let ks025 = keySize * 0.25;
        let rowMargins = [
            Math.round(ks05 + boxMargin),
            Math.round((ks05 + boxMargin) + ks025),
            Math.round((ks05 + boxMargin + ks025) + ks05 + boxMargin)
        ];
        let rowWidth = (keySize * 10) + (innerMargin * 10);
        let tenKeyWidth = (keySize * 3) + (innerMargin * 4);

        setSize($keySquares, innerKeySize, innerKeySize);
        $keySquares.css('margin', boxMargin);
        
        setSize($spaceKey, Math.round(rowWidth / 2), innerKeySize);
        $spaceKey.css('margin', boxMargin + 'px auto');
        
        setSize($t0Key, (innerKeySize * 2) + innerMargin + (3 * 2), innerKeySize);
        $t0Key.css('margin', boxMargin);
        
        let keyFontsize = innerKeySize * 0.4;
        $keys.css('font-size', Math.round(keyFontsize));
        $keys.css('text-indent', Math.round(((keyFontsize * 1.3) - keyFontsize) / 2));
        
        $rows.width(rowWidth);
        for (let i = 1; i < 4; i++) {
            $rows[i].style.marginLeft = rowMargins[i - 1] + 'px';
        }
        
        let mainKeyWidth = rowMargins[2] + rowWidth + innerMargin;
        $mainKey.width(mainKeyWidth);
        $mainKey.css('padding', boxMargin);
        
        $tenKey.width(tenKeyWidth);
        $tenKey.css('padding', boxMargin);
        
        $keyboard.width(mainKeyWidth + tenKeyWidth);
        $launcher.width(mainKeyWidth + tenKeyWidth);
        return [$keyboard.width(), $keyboard.height()];
    };
    
    window.calcKeyboardSize = function(keySize) {
        let innerMargin = Math.round(keySize * 0.08);
        innerMargin = innerMargin < 2 ? 2 : innerMargin;
        if (innerMargin % 2 != 0) {
            innerMargin--;
        }
        let boxMargin = innerMargin / 2;
        let rowWidth = (keySize * 10) + (innerMargin * 11);
        let tenKeyWidth = (keySize * 3) + (innerMargin * 4);
        let ks05 = keySize * 0.5;
        let ks025 = keySize * 0.25;
        let mainKeyWidth = rowWidth + Math.round(ks05 + boxMargin + ks025 + ks05 + boxMargin);
        return [mainKeyWidth + tenKeyWidth, keySize * 5 + innerMargin * 6]
    };
    
    scope : {
        let pointX = null, pointY = null;
        let keyboardWith, keyboardHeight, keySize = 64, newKeySize = 64;
        $(document).on({
            mousedown($event) {
                if ($event.target.id != 'resize-knob' || $event.which != 1) return;
                $event.preventDefault();
                pointX = $event.clientX;
                pointY = $event.clientY;
                keyboardWith = $keyboard.width();
                keyboardHeight = $keyboard.height();
                document.documentElement.style.cursor = 'nw-resize';
            },
            mouseup($event) {
                if (pointX === null) return;
                keySize = newKeySize;
                pointX = pointY = null;
                document.documentElement.style.cursor = '';
            },
            mousemove($event) {
                if (pointX === null) return;
                let movedX = $event.clientX - pointX;
                let movedY = $event.clientY - pointY;
                if (movedX >= 0 == movedY >=0) {
                    let movedWith = keyboardWith + movedX;
                    let movedHeight = keyboardHeight + movedY;
                    let count = 0;
                    let acc = movedX >= 0 ? 1 : -1;
                    while (true) {
                        count += acc;
                        let [nextWidth, nextHeight] = calcKeyboardSize(keySize + count);
                        if ((acc > 0 && (nextWidth > movedWith || nextHeight > movedHeight)) ||
                            (acc < 0 && (nextWidth < movedWith || nextHeight < movedHeight))) {
                                count -= acc;
                                break;
                        }
                    }
                    let countedKeySize = keySize + count;
                    if (newKeySize == countedKeySize) return;
                    newKeySize = countedKeySize
                    resizeKeyboard(newKeySize);
                }
            }
        });
    }*/
});

function setSize(target, width, height) {
    target.width(width);
    target.height(height);
}

function centeringLauncherPosResizeHandler($event) {
    let margin = $window.height() - (202 + main.$launcher.height());
    let marginTop = margin / 2;
    if (marginTop < 0) marginTop = 0;
    main.$launcher.css('margin-top', Math.round(marginTop));
}

function modalMouseupHandler($event) {
    if ($event.which != 1) return;
    
    if (global.dform.modalMousedowned) {
        let dform = global.dform;
        dform.$dformTitle.css('border-color', '');
        dform.$dformContent.css('border-color', '');
        dform.modalMousedowned = false;
    } else if (global.dialog.modalMousedowned) {
        let dialog = global.dialog;
        dialog.close();
        dialog.modalMousedowned = false;
    }
}

function centeringDialogPosResizeHandler($event) {
    if (global.openedDialogs.size == 0) return;
    
    for (let od of global.openedDialogs) {
        let x = ($window.width() - od.width()) / 2;
        let y = ($window.height() - od.height()) / 2;
        
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        
        od.css('left', Math.round(x));
        od.css('top', Math.round(y));
    }
}

function beforeunloadHandler($event) {
    $event.preventDefault();
    $event.returnValue = '行った変更は保存されません。';
}

function keyEventHandlerFactory(keyEvent) {
    return function($event) {
        if (global.dragging || global.openedDialogs.size) return;
        let launchKeyList = global.launchKeyList;
        switch ($event.keyCode) {
            /* 1*/case 49:  launchKeyList[0].keyAction(keyEvent);  break;
            /* 2*/case 50:  launchKeyList[1].keyAction(keyEvent);  break;
            /* 3*/case 51:  launchKeyList[2].keyAction(keyEvent);  break;
            /* 4*/case 52:  launchKeyList[3].keyAction(keyEvent);  break;
            /* 5*/case 53:  launchKeyList[4].keyAction(keyEvent);  break;
            /* 6*/case 54:  launchKeyList[5].keyAction(keyEvent);  break;
            /* 7*/case 55:  launchKeyList[6].keyAction(keyEvent);  break;
            /* 8*/case 56:  launchKeyList[7].keyAction(keyEvent);  break;
            /* 9*/case 57:  launchKeyList[8].keyAction(keyEvent);  break;
            /* 0*/case 48:  launchKeyList[9].keyAction(keyEvent);  break;

            /* Q*/case 81:  launchKeyList[10].keyAction(keyEvent); break;
            /* W*/case 87:  launchKeyList[11].keyAction(keyEvent); break;
            /* E*/case 69:  launchKeyList[12].keyAction(keyEvent); break;
            /* R*/case 82:  launchKeyList[13].keyAction(keyEvent); break;
            /* T*/case 84:  launchKeyList[14].keyAction(keyEvent); break;
            /* Y*/case 89:  launchKeyList[15].keyAction(keyEvent); break;
            /* U*/case 85:  launchKeyList[16].keyAction(keyEvent); break;
            /* I*/case 73:  launchKeyList[17].keyAction(keyEvent); break;
            /* O*/case 79:  launchKeyList[18].keyAction(keyEvent); break;
            /* P*/case 80:  launchKeyList[19].keyAction(keyEvent); break;

            /* A*/case 65:  launchKeyList[20].keyAction(keyEvent); break;
            /* S*/case 83:  launchKeyList[21].keyAction(keyEvent); break;
            /* D*/case 68:  launchKeyList[22].keyAction(keyEvent); break;
            /* F*/case 70:  launchKeyList[23].keyAction(keyEvent); break;
            /* G*/case 71:  launchKeyList[24].keyAction(keyEvent); break;
            /* H*/case 72:  launchKeyList[25].keyAction(keyEvent); break;
            /* J*/case 74:  launchKeyList[26].keyAction(keyEvent); break;
            /* K*/case 75:  launchKeyList[27].keyAction(keyEvent); break;
            /* L*/case 76:  launchKeyList[28].keyAction(keyEvent); break;
            /* +*/case 187: launchKeyList[29].keyAction(keyEvent); break;

            /* Z*/case 90:  launchKeyList[30].keyAction(keyEvent); break;
            /* X*/case 88:  launchKeyList[31].keyAction(keyEvent); break;
            /* C*/case 67:  launchKeyList[32].keyAction(keyEvent); break;
            /* V*/case 86:  launchKeyList[33].keyAction(keyEvent); break;
            /* B*/case 66:  launchKeyList[34].keyAction(keyEvent); break;
            /* N*/case 78:  launchKeyList[35].keyAction(keyEvent); break;
            /* M*/case 77:  launchKeyList[36].keyAction(keyEvent); break;
            /* <*/case 188: launchKeyList[37].keyAction(keyEvent); break;
            /* >*/case 190: launchKeyList[38].keyAction(keyEvent); break;
            /* ?*/case 191: launchKeyList[39].keyAction(keyEvent); break;

            /* ■*/case 32:  launchKeyList[40].keyAction(keyEvent); break;
            
            /* /*/case 111: launchKeyList[41].keyAction(keyEvent); break;
            /* **/case 106: launchKeyList[42].keyAction(keyEvent); break;

            /*T7*/case 103: launchKeyList[43].keyAction(keyEvent); break;
            /*T8*/case 104: launchKeyList[44].keyAction(keyEvent); break;
            /*T9*/case 105: launchKeyList[45].keyAction(keyEvent); break;
            
            /*T4*/case 100: launchKeyList[46].keyAction(keyEvent); break;
            /*T5*/case 101: launchKeyList[47].keyAction(keyEvent); break;
            /*T6*/case 102: launchKeyList[48].keyAction(keyEvent); break;
            
            /*T1*/case 97:  launchKeyList[49].keyAction(keyEvent); break;
            /*T2*/case 98:  launchKeyList[50].keyAction(keyEvent); break;
            /*T3*/case 99:  launchKeyList[51].keyAction(keyEvent); break;
            
            /*T0*/case 96:  launchKeyList[52].keyAction(keyEvent); break;
            /* .*/case 110: launchKeyList[53].keyAction(keyEvent); break;
            
            /*delete*/
            case 46:
                if (keyEvent == KEYUP || global.$focusedKey == null ||
                    global.$focusedKey.getSource().contentType == null) return;
                global.infoPanel.E_deleteIcon_click();
                break;
               
            /*tab*/
            case 9: break;
            
            /*F1 - F12*/
            case 112:
            case 113:
            case 114:
            case 115:
            case 116:
            case 117:
            case 118:
            case 119:
            case 120:
            case 121:
            case 122:
            case 123:
                if (main.relFnkeyIsActive) {
                    let index = $event.keyCode - 112;
                    $(global.$layers[index]).click();
                    break;
                };

            default: return;
        }
        $event.preventDefault();
    }
}

const CustomCheckBox = {
    init() {
        this.content = null;
        this.checked = false;
        
        this.$loopBtn = $('#loop-btn').on({
            mouseenter: this.E_mouseenter,
            mouseleave: this.E_mouseleave,
            mousedown:  this.E_mousedown,
            click:      this.E_click
        });
        this.$selectBox = $('#select-box');
    },
    
    setContent(content) {
        this.content = content;
    },
    
    fill(loop) {
        let color = loop ? '#F6931F' : '#FFF';
        this.$selectBox.css('background-color', color);
    },
    
    check(loop) {
        this.checked = loop;
        this.fill(loop);
    },
    
    E_mouseenter($event) {
        let btnStates = global.buttonStates['loop-btn'];
        btnStates.entered = true;
        if (btnStates.downed) return;
        
        CustomCheckBox.$selectBox.attr('class', 'select-box-enter');
    },
    
    E_mouseleave($event) {
        let btnStates = global.buttonStates['loop-btn'];
        btnStates.entered = false;
        if (btnStates.downed) return;

        CustomCheckBox.$selectBox.attr('class', 'select-box-leave');
    },
    
    E_mousedown($event) {
        $event.stopPropagation();
        
        if ($event.which != 1) return;
        
        global.buttonStates['loop-btn'].downed = true;
        CustomCheckBox.$selectBox.attr('class', 'select-box-down');
    },
    
    E_mouseupHandler($event) {
        if ($event.which != 1) return;
        
        let btnStates = global.buttonStates['loop-btn'];
        btnStates.downed = false;
        if (btnStates.entered) {
            CustomCheckBox.E_mouseenter();
        } else {
            CustomCheckBox.E_mouseleave();
        }
    },
    
    E_click($event) {
        let self = CustomCheckBox;
        
        self.checked = !self.checked
        self.fill(self.checked);
        
        let content = self.content;
        content.loop = self.checked;
        if (content.work) {
            content.work.loop = self.checked;
        }
    }
};

const Dialog = {
    init() {
        this.type = null;
        
        this.$dialog = $('#dialog');
        this.$dialog.on({
            mousedown: $event => $event.stopPropagation(),
            mouseup:   $event => {
                this.modalMousedowned = false;
            }
        });
        
        this.$dialogCaption = $('#dialog-caption');
        
        this.$deleteDialogElements = $('.delete-dialog-element');
        this.$deleteContentNumber = $('#delete-content-number');
        
        this.$errorDialogElements = $('.error-dialog-element');
        this.$errorDetails = $(this.$errorDialogElements[1]);
        
        let dialogBtns = $('.dialog-btn').on({
            mouseenter: this.E_dialogBtns_mouseenter,
            mouseleave: this.E_dialogBtns_mouseleave,
            mousedown:  this.E_dialogBtns_mousedown,
            click:      this.E_dialogBtns_click
        });
        this.buttons = {
            'dialog-ok-btn':     $(dialogBtns[0]),
            'dialog-cancel-btn': $(dialogBtns[1])
        }
        
        this.modalMousedowned = false;
        this.$dialogModal = $('#dialog-modal');
        this.$dialogModal.mousedown(() => this.modalMousedowned = true);
    },
    
    open(type, caption, key, mappingList) {
        if (global.openedDialogs.has(this.$dialog)) {
            this.clear();
        } else {
            global.openedDialogs.add(this.$dialog);
        }
        switch (type) {
            case 'delete': this.openDeleteDialog(); break;
            case 'error':
                this.openErrorDialog(caption, key, mappingList);
                break;
        }
        centeringDialogPosResizeHandler();
        this.$dialogModal.css('display', 'block');
        this.getDialogHeight();
    },
    
    getDialogHeight() {
        if (this.$dialog.height() == 0) {
            setTimeout(this.getDialogHeight, 17);
        } else {
            centeringDialogPosResizeHandler();
        }
    },
    
    close() {
        this.$dialogModal.css('display', 'none');
        this.clear();
        global.openedDialogs.delete(this.$dialog);
    },
    
    clear() {
        switch (this.type) {
            case 'delete':
                this.$deleteDialogElements.css('display', 'none');
                break;
            case 'error':
                this.$errorDialogElements.css('display', 'none');
                this.$errorDetails.empty();
                break;
        }
        this.type = null;
    },
    
    openDeleteDialog() {
        this.type = 'delete';
        this.$dialogCaption.text('全てのコンテンツを削除しますか？');
        this.$deleteContentNumber.text(global.allContentsCount);
        this.$deleteDialogElements.css('display', 'block');
    },
    
    openErrorDialog(caption, key, details) {
        this.type = 'error';
        this.$dialogCaption.text(caption);
        
        let errorDetails = this.$errorDetails;
        let keyName = key.name();
        let layer = global.currentLayer + 1;
        
        $(`<p><span>該当キー:　</span>${keyName} キー（Layer ${layer}）</p>`)
            .appendTo(errorDetails);

        let len = (details && details.length) || 0;
        for (let i = 0; i < len; i++) {
            let detail = details[i];
            $(`<p><span>${detail[0]}:　</span>${detail[1]}</p>`)
                .css('margin-top', '5px')
                .appendTo(errorDetails);
        }
        
        this.$errorDialogElements.css('display', 'block');
    },
    
    deleteAllContent() {
        let infoPanel = global.infoPanel;
        
        switch (infoPanel.infoType) {
            case '$controller':
            case '$referenceDetail':
                infoPanel.detach();
                if (infoPanel.key.getSource().loading) {
                    infoPanel.showLoadAnim();
                } else {
                    infoPanel.showUnset(infoPanel.key);
                }
        }
        
        let contentCount = global.allContentsCount;
        for (let key of global.launchKeyList) {
            for (let i = 0; i < 12; i++) {
                if (key.getSource(i).contentType) {
                    infoPanel.deleteKeyContent(key, i);
                }
            }
        }
    },
    
    E_dialogBtns_mouseenter($event, id) {
        id = $event ? this.id : id;
        let btnStates = global.buttonStates[id];
        if (btnStates.downed) return;
        
        Dialog.buttons[id]
            .removeClass('dialog-btn-leave dialog-btn-down')
            .addClass('dialog-btn-enter');
    },
    
    E_dialogBtns_mouseleave($event, id) {
        id = $event ? this.id : id;
        let btnStates = global.buttonStates[id];
        if (btnStates.downed) return;
        
        Dialog.buttons[id]
            .removeClass('dialog-btn-enter dialog-btn-down')
            .addClass('dialog-btn-leave');
    },
    
    E_dialogBtns_mousedown($event) {
        if ($event.which != 1) return;
        
        let id = this.id;
        
        global.buttonStates[id].downed = true;
        Dialog.buttons[id]
            .removeClass('dialog-btn-enter')
            .addClass('dialog-btn-down');
    },
    
    E_dialogBtnsMouseupHandler($event, id) {
        if ($event.which != 1) return;
        
        let btnStates = global.buttonStates[id]; 
        btnStates.downed = false;
        Dialog.E_dialogBtns_mouseleave(null, id);
    },
    
    E_dialogBtns_click($event) {
        if (Dialog.type == 'delete' &&
            this.id == 'dialog-ok-btn') {
            Dialog.deleteAllContent();
        }
        
        Dialog.close();
    }
};
