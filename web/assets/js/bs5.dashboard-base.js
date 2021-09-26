PNotify.prototype.options.styling = "fontawesome";
var loadedMonitors = {}
var tabTree = null
var pageLoadingData = {}
var pageTabLinks = $('#pageTabLinks')
var createdTabLinks = $('#createdTabLinks')
var pageTabContainer = $('#pageTabContainer')
var floatingBackButton = $('#floating-back-button')
var loadedPages = {}
var activeTabName = 'initial'
var isAppleDevice = navigator.userAgent.match(/(iPod|iPhone|iPad)/)||(navigator.userAgent.match(/(Safari)/)&&!navigator.userAgent.match('Chrome'));
var isMobile = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))
function base64ArrayBuffer(arrayBuffer) {
      var base64    = ''
      var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

      var bytes         = new Uint8Array(arrayBuffer)
      var byteLength    = bytes.byteLength
      var byteRemainder = byteLength % 3
      var mainLength    = byteLength - byteRemainder

      var a, b, c, d
      var chunk

      // Main loop deals with bytes in chunks of 3
      for (var i = 0; i < mainLength; i = i + 3) {
        // Combine the three bytes into a single integer
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

        // Use bitmasks to extract 6-bit segments from the triplet
        a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
        c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
        d = chunk & 63               // 63       = 2^6 - 1

        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
      }

      // Deal with the remaining bytes and padding
      if (byteRemainder == 1) {
        chunk = bytes[mainLength]

        a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

        // Set the 4 least significant bits to zero
        b = (chunk & 3)   << 4 // 3   = 2^2 - 1

        base64 += encodings[a] + encodings[b] + '=='
      } else if (byteRemainder == 2) {
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

        a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
        b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

        // Set the 2 least significant bits to zero
        c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

        base64 += encodings[a] + encodings[b] + encodings[c] + '='
      }

      return base64
}
function debugLog(...args){
    console.log(...args)
}
function generateId(x){
    if(!x){x=10};var t = "";var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < x; i++ )
        t += p.charAt(Math.floor(Math.random() * p.length));
    return t;
}
function dashboardOptions(r,rr,rrr){
    if(!rrr){rrr={};};if(typeof rrr === 'string'){rrr={n:rrr}};if(!rrr.n){rrr.n='ShinobiOptions_'+location.host}
    ii={o:localStorage.getItem(rrr.n)};try{ii.o=JSON.parse(ii.o)}catch(e){ii.o={}}
    if(!ii.o){ii.o={}}
    if(r&&rr&&!rrr.x){
        ii.o[r]=rr;
    }
    switch(rrr.x){
        case 0:
            delete(ii.o[r])
        break;
        case 1:
            delete(ii.o[r][rr])
        break;
    }
    localStorage.setItem(rrr.n,JSON.stringify(ii.o))
    return ii.o
}
function getLocation(d){
    var url
    if(d && d.info && d.info.URL){
        url = d.info.URL
        if(url.charAt(url.length-1) !== '/'){
            url = url+'/'
        }
    }else{
        url = libURL
    }
    return url
}
function getApiPrefix(path){
    var mainPart = getLocation() + $user.auth_token
    return path ? mainPart + '/' + path + '/' + $user.ke : mainPart
}

function formattedTime(time,twelveHourClock,utcConvert){
    var theMoment = moment(time)
    if(utcConvert)theMoment = theMoment.clone().utc()
    return theMoment.format(twelveHourClock ? 'hh:mm:ss A YYYY-MM-DD' : 'HH:mm:ss YYYY-MM-DD')
}

function durationBetweenTimes(start,end){
    var duration = moment.duration(moment(end).diff(moment(start)));
    console.log(duration)
    var hours = duration.asMinutes().toFixed(0);
    return hours
}

function formattedTimeForFilename(time,utcConvert,timeFormat){
    var theMoment = moment(time)
    if(utcConvert)theMoment = theMoment.clone().utc()
    return theMoment.format(timeFormat ? timeFormat : 'YYYY-MM-DDTHH:mm:ss')
}

function checkCorrectPathEnding(x){
    var length=x.length
    if(x.charAt(length-1)!=='/'){
        x=x+'/'
    }
    return x
}

function safeJsonParse(string){
    if(string instanceof Object){
        return string
    }else{

    }
    var newObject = {}
    try{
        newObject = JSON.parse(string)
    }catch(err){

    }
    return newObject
}
function prettyPrint(string){
    return JSON.stringify(string,null,3)
}

function liveStamp(){
    var allLiveStampable = $('.livestamp')
    allLiveStampable.each(function(){
        var el = jQuery(this)
        var time = el.attr('title')
        if(!time){
            return
        };
        el.toggleClass('livestamp livestamped')
            .attr('title',formattedTime(time))
            .livestamp(time);
    })
    return allLiveStampable
}

function loadMonitorsIntoMemory(callback){
    $.get(`${getApiPrefix(`monitor`)}`,function(data){
        $.each(data,function(n,monitor){
            monitor.details = safeJsonParse(monitor.details)
            loadedMonitors[monitor.mid] = monitor
        })
        callback(data)
    })
}

function compileConnectUrl(options){
    var porty = ''
    if(options.port && options.port !== ''){
        porty = ':' + options.port
    }
    var url = options.protocol + '://' + options.host + porty
    return options.url
}

function jsonToHtmlBlock(target){
    var html = ''
    if(target instanceof Object){
        $.each(target,function(key,value){
            html += `<div>
                <b>${key}</b> : ${jsonToHtmlBlock(value)}
            </div>`
        })
    }else{
        html += `<span>${target}</span>`
    }
    return html
}

function fullScreenInit(target){
    if (target.requestFullscreen) {
      target.requestFullscreen();
    } else if (target.mozRequestFullScreen) {
      target.mozRequestFullScreen();
    } else if (target.webkitRequestFullscreen) {
      target.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
}

function openTab(theTab,loadData,backAction,haltTrigger,type){
    loadData = loadData ? loadData : {}
    var allTabs = $('.page-tab');
    allTabs.hide().removeClass('tab-active');
    $(`#tab-${theTab}`).show().addClass('tab-active');
    pageLoadingData = Object.assign(loadData,{});
    if(!haltTrigger){
        tabTree = {
            name: theTab,
            loadData: loadData,
            back: tabTree,
        }
        $('body').trigger(`tab-open-${theTab}`);
    }
    if(tabTree && tabTree.back){
        floatingBackButton.show()
    }else{
        floatingBackButton.hide()
    }
    pageTabLinks.find(`.side-menu-link`).removeClass('page-link-active active')
    pageTabLinks.find('ul').hide();
    pageTabLinks.find(`.side-menu-link[page-open="${theTab}"]`).addClass('page-link-active active').parents('li').find('ul').show();
    onTabAway(activeTabName)
    activeTabName = `${theTab}`;
    if(!loadedPages[theTab]){
        loadedPages[theTab] = {
            name: theTab,
            loadData: loadData,
            type: type || 'other'
        }
        onTabOpen(activeTabName)
    }else{
        onTabReopen(activeTabName)
    }
    // mobile-only, close menu on page change
    $('#sidebarMenu').removeClass('show');
}

function goBackOneTab(){
    if(tabTree.backAction)tabTree.backAction()
    tabTree = tabTree.back
    if(tabTree){
        if($(`#tab-${tabTree.name}`).length === 0)goBackOneTab();
        openTab(tabTree.name,tabTree.loadData,tabTree.backAction,true)
    }
}

function goBackHome(){
    if(tabTree.back){
        goBackOneTab()
        goBackHome()
    }else{
        pageTabLinks.find(`.side-menu-link`).removeClass('page-link-active active');
        pageTabLinks.find(`.side-menu-link.go-home`).addClass('page-link-active active');
    }
}

function createNewTab(tabName,tabLabel,baseHtml,loadData,backAction,type){
    var theTab = $(`#tab-${tabName}`)
    var existAlready = true
    if(theTab.length === 0){
        var tabIcon = 'file-o'
        switch(type){
            case'videoPlayer':
                tabIcon = 'play-circle'
            break;
            case'livePlayer':
                tabIcon = 'eye'
            break;
            case'videosList':
                tabIcon = 'film'
            break;
        }
        existAlready = false
        pageTabContainer.append(baseHtml)
        createdTabLinks.append(buildTabHtml(tabName,tabLabel,tabIcon))
        theTab = $(`#tab-${tabName}`)
    }
    openTab(tabName,loadData,backAction,null,type)
    return {
        existAlready: existAlready,
        theTab: theTab,
    }
}

function deleteTab(tabId){
    $(`[page-open="${tabId}"]`).remove()
    $(`#tab-${tabId}`).remove()
    onTabClose(tabId)
    delete(loadedPages[tabId])
}

var addedOnTabAway = {}
function addOnTabAway(tabId,action){
    addedOnTabAway[tabId] = action
}

function onTabAway(tabId){
    var loadedTab = loadedPages[tabId]
    if(!loadedTab)return
    var type = loadedTab.type
    console.log(`onTabAway`,tabId,type)
    switch(type){
        case'videoPlayer':
            pauseVideoPlayer(tabId)
        break;
        case'livePlayer':
        break;
    }
    if(addedOnTabAway[tabId])addedOnTabAway[tabId](loadedTab)
}

var addedOnTabReopen = {}
function addOnTabReopen(tabId,action){
    addedOnTabReopen[tabId] = action
}

function onTabReopen(tabId){
    var loadedTab = loadedPages[tabId]
    if(!loadedTab)return
    var type = loadedTab.type
    console.log(`onTabReopen`,tabId,type)
    switch(type){
        case'videoPlayer':
            resumeVideoPlayer(tabId)
        break;
        case'livePlayer':
        break;
    }
    if(addedOnTabReopen[tabId])addedOnTabReopen[tabId](loadedTab)
}

var addedOnTabOpen = {}
function addOnTabOpen(tabId,action){
    addedOnTabOpen[tabId] = action
}

function onTabOpen(tabId){
    var loadedTab = loadedPages[tabId]
    if(!loadedTab)return
    var type = loadedTab.type
    if(addedOnTabOpen[tabId])addedOnTabOpen[tabId](loadedTab)
}


var addedOnTabClose = {}
function addOnTabClose(tabId,action){
    addedOnTabClose[tabId] = action
}

function onTabClose(tabId){
    var loadedTab = loadedPages[tabId]
    if(!loadedTab)return
    var type = loadedTab.type
    console.log(`onTabClose`,tabId,type)
    switch(type){
        case'videoPlayer':
            closeVideoPlayer(tabId)
        break;
        case'livePlayer':
            closeLivePlayer(tabId)
        break;
    }
    if(addedOnTabClose[tabId])addedOnTabClose[tabId](loadedTab)
}

// function saveTabStates(){
//     localStorage.setItem(`Shinobi-Tab-States-${location.origin}`,JSON.stringify(loadedPages))
// }
//
// function loadTabStates(){
//     var tabStates = JSON.parse(localStorage.getItem(`Shinobi-Tab-States-${location.origin}`)) || {}
//     $.each(tabStates,function(tabId,data){
//
//     })
// }

function getDetailValues(parentForm){
    var theList = {}
    var allDetailFieldsInThisForm = parentForm.find('[detail]')
    allDetailFieldsInThisForm.each(function(n,v){
        var el = $(v)
        var detailParam = el.attr('detail')
        var theValue = el.val()
        theList[detailParam] = theValue
    })
    return theList
}

function onDetailFieldChange(_this){
    var parentForm = $(_this).parents('form');
    parentForm.find('[name="details"]').val(JSON.stringify(getDetailValues(parentForm)));
}

function onSelectorChange(_this,parent){
    var el = $(_this)
    var theParam = el.attr('selector')
    var theValue = el.val()
    var theSelected = el.find('option:selected').text()
    parent.find(`.${theParam}_input`).hide()
    parent.find(`.${theParam}_${theValue}`).show()
    parent.find(`.${theParam}_text`).text(theSelected)
}

function createOptionHtml(options){
    return `<option ${options.selected ? 'selected' : ''} value="${options.value}">${options.label}</option>`
}

function createOptionListHtml(list){
    var html = ``
    $.each(list,function(n,options){
        html += createOptionHtml(options)
    })
    return html
}

function copyToClipboard(str){
  const el = document.createElement('textarea');
  el.value = str;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
};

function diffObject(obj1, obj2) {
    if (!obj2 || Object.prototype.toString.call(obj2) !== '[object Object]') {
        return obj1;
    }
    var diffs = {};
    var key;
    var arraysMatch = function (arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        for (var i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) return false;
        }
        return true;

    };

    var compare = function (item1, item2, key) {
        var type1 = Object.prototype.toString.call(item1);
        var type2 = Object.prototype.toString.call(item2);
        if (type2 === '[object Undefined]') {
            // diffs[key] = null;
            return;
        }
        if (item2 && type1 !== type2) {
            diffs[key] = item2;
            return;
        }
        if (type1 === '[object Object]') {
            var objDiff = diffObject(item1, item2);
            if (objDiff && Object.keys(objDiff).length > 0) {
                diffs[key] = objDiff;
            }
            return;
        }
        if (type1 === '[object Array]') {
            if (item2 && !arraysMatch(item1, item2)) {
                diffs[key] = item2;
            }
            return;
        }
        if (type1 === '[object Function]') {
            if (item2 && item1.toString() !== item2.toString()) {
                diffs[key] = item2;
            }
        } else {
            if (item2 && item1 !== item2) {
                diffs[key] = item2;
            }
        }
    };
    for (key in obj1) {
        if (obj1.hasOwnProperty(key)) {
            compare(obj1[key], obj2[key], key);
        }
    }
    for (key in obj2) {
        if (obj2.hasOwnProperty(key)) {
            if (obj2[key] && !obj1[key] && obj1[key] !== obj2[key] ) {
                diffs[key] = obj2[key];
            }
        }
    }
    return diffs;
}

function getAllSectionsFromDefinition(definitionsBase){
    var sections = {}
    var addSection = function(section,parentName){
        sections[section.name] = {
            name: section.name,
            id: section.id,
            color: section.color,
            parentName: parentName
        }
        if(section.info){
            $.each(section.info,function(m,block){
                if(block.isFormGroupGroup === true){
                    addSection(block,section.name)
                }
            })
        }
        if(section.blocks){
            $.each(section.blocks,function(m,block){
                addSection(block)
            })
        }
    }
    $.each(definitionsBase.blocks,function(n,section){
        addSection(section)
    })
    return sections
}

function buildSubMenuItems(listOfItems){
    var html = ''
    $.each(listOfItems,function(n,item){
        if(item)html += `<li><a class="text-white ${item.class || ''}" ${item.attributes || ''}><span class="${item.hasParent ? 'ml-3' : ''} dot dot-${item.color || 'blue'} mr-2"></span>${item.label}</a></li>`
    })
    return html
}

function drawSubMenuItems(linkTarget,definitionsBase){
    var list = $(`#side-menu-link-${linkTarget}  ul`)
    window[`sectionList-${linkTarget}`] = window[`sectionList-${linkTarget}`] || getAllSectionsFromDefinition(definitionsBase)
    var sectionSubLinks = Object.values(window[`sectionList-${linkTarget}`]).map(function(item){
        var sectionId = item.id
        if(!sectionId)return null
        var sectionElement = document.getElementById(`${sectionId}`)
        if(sectionElement && $(sectionElement).is(":hidden"))return null;
        var parentName = item.parentName
        var completeLabel = `${item.name}`
        return {
            attributes: `href="#${sectionId}" scrollToParent="#tab-${linkTarget}"`,
            class: `scrollTo`,
            color: item.color,
            hasParent: !!parentName,
            label: completeLabel,
        }
    })
    var html = buildSubMenuItems(sectionSubLinks)
    list.html(html)
}

function getMonitorIdFromElement(_this){
    var monitorId
    var thisEl = $(_this)
    var monitorId = thisEl.attr('data-mid')
    if(!monitorId){
        var el = thisEl.parents('[data-mid]')
        monitorId = el.attr('data-mid')
    }
    return monitorId
}

function permissionCheck(toCheck,monitorId){
    var details = $user.details
    if(details.sub && details.allmonitors === '0'){
        var chosenValue = details[toCheck]
        if(details[toCheck] instanceof Array && chosenValue.indexOf(monitorId) > -1){
            return true
        }else if(chosenValue === '1'){
            return true
        }
    }else{
        return true
    }
    return false
}

function drawMonitorListToSelector(jqTarget,selectFirst){
    var html = ''
    $.each(loadedMonitors,function(n,v){
        html += createOptionHtml({
            value: v.mid,
            label: v.name + ` (${v.mid})`,
        })
    })
    jqTarget.html(html)
    if(selectFirst){
        jqTarget
        .find('option')
        .first()
        .prop('selected',true)
        .parent()
        .change()
    }
}
var logWriterFloodTimeout = null
var logWriterFloodCounter = 0
var logWriterFloodLock = null
function buildLogRow(v){
    var html = ''
    html += `<div class="card shadow-lg mb-3 px-0 btn-default search-row">
        <div class="card-header">
            <small class="text-white">${v.info && v.info.type ? v.info.type : v.mid}</small>
        </div>
        <div class="card-body">
            <div>${jsonToHtmlBlock(v.info.msg)}</div>
        </div>
        <div class="card-footer">
            <small class="text-muted">${formattedTime(v.time)}</small>
        </div>
    </div>`
    return html
}
function logWriterDraw(id,data){
    if(logWriterFloodLock)return debugLog('logWriterFloodLock : Log was dropped');
    var elementTags = '#global-log-stream,'+id+'.monitor_item .logs:visible,'+id+'#tab-monitorSettings:visible .logs'
    if(logWriterFloodTimeout){
        ++logWriterFloodCounter
    }
    if(logWriterFloodCounter > 10){
        window.logWriterFloodLock = setTimeout(function(){
            delete(logWriterFloodLock)
        },10000)
    }
    clearTimeout(logWriterFloodTimeout)
    logWriterFloodTimeout = setTimeout(function(){
        delete(logWriterFloodTimeout)
        logWriterFloodCounter = 0
    },2000)
    if(!data.time)data.time = formattedTime();
    var html = buildLogRow({
        ke: data.ke,
        mid: data.mid,
        info: data.log,
        time: data.time,
    })
    $(elementTags).prepend(html).each(function(n,v){
        var el = $(v);
        if(el.find('.log-item').length > 10){
            v.find('.log-item:last').remove()
        }
    })
}

function setSwitchUIState(systemSwitch,toggleState){
    var el = $(`[shinobi-switch="${systemSwitch}"]`)
    var onClass = el.attr('on-class')
    var offClass = el.attr('off-class')
    var childTarget = el.attr('ui-change-target')
    if(childTarget)el = el.find(childTarget)
    if(onClass || offClass){
        if(toggleState === 1){
            if(onClass)el.addClass(onClass)
            if(offClass)el.removeClass(offClass)
        }else{
            if(onClass)el.removeClass(onClass)
            if(offClass)el.addClass(offClass)
        }
    }
}
var dashboardSwitchCallbacks = {}
function dashboardSwitch(systemSwitch){
    var theSwitches = dashboardOptions().switches
    if(!theSwitches){
        theSwitches={}
    }
    if(!theSwitches[systemSwitch]){
        theSwitches[systemSwitch]=0
    }
    if(theSwitches[systemSwitch]===1){
        theSwitches[systemSwitch]=0
    }else{
        theSwitches[systemSwitch]=1
    }
    dashboardOptions('switches',theSwitches)
    var afterAction = dashboardSwitchCallbacks[systemSwitch]
    if(afterAction)afterAction(theSwitches[systemSwitch])
    setSwitchUIState(systemSwitch,theSwitches[systemSwitch])
}

function downloadJSON(jsonData,filename){
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonData,null,3));
    $('#temp').html('<a></a>')
        .find('a')
        .attr('href',dataStr)
        .attr('download',filename)
        [0].click()
}

function drawIndicatorBar(item){
    var html = `<div id="indicator-${item.name}" class="mb-2">
        <div class="d-flex flex-row text-white mb-1">
            <div class="pr-2">
                <i class="fa fa-${item.icon}"></i>
            </div>
            <div class="flex-grow-1">
                <small>${item.label}</small>
            </div>
            <div>
                <small class="indicator-percent">0%</small>
            </div>
        </div>
        <div>
            <div class="progress">
                <div class="progress-bar progress-bar-warning" role="progressbar" style="width: 0%;"></div>
            </div>
        </div>
    </div>`
    $('.disk-indicator-bars').append(html)
}
function setInterfaceCounts(monitors){
    var data = monitors || Object.values(loadedMonitors)
    var activeCameraCount = data.filter((monitor) => {
        var monCode = parseInt(monitor.code)
        return monCode === 9 || monCode === 2 || monCode === 3
    }).length
    $('.activeCameraCount').text(activeCameraCount)
    $('.cameraCount').text(data.length)
}
// on page load
var readyFunctions = []
function onDashboardReady(theAction){
    readyFunctions.push(theAction)
}
function onDashboardReadyExecute(theAction){
    $.each(readyFunctions,function(n,theAction){
        theAction()
    })
}
$(document).ready(function(){
    loadMonitorsIntoMemory(function(data){
        setInterfaceCounts(data)
        openTab('initial')
        onDashboardReadyExecute()
    })
    $('body')
    // .on('tab-away',function(){
    //
    // })
    // .on('tab-close',function(){
    //
    // })
    .on('click','.pop-image',function(){
        var imageSrc = $(this).attr('src')
        $('body').append(`<div class="popped-image"><img src="${imageSrc}"></div>`)
    })
    .on('click','.popped-image',function(){
        $(this).remove()
    })
    .on('click','.popped-image img',function(e){
        e.stopPropagation()
        return false;
    })
    .on('click','.go-home',goBackHome)
    .on('click','.go-back',goBackOneTab)
    .on('click','.delete-tab',function(e){
        e.preventDefault()
        e.stopPropagation()
        var tabName = $(this).parents(`[page-open]`).attr(`page-open`)
        if(activeTabName === tabName){
            goBackOneTab()
        }
        deleteTab(tabName)
        return false;
    })
    .on('click','[page-open]',function(){
        var el = $(this)
        var pageChoice = el.attr('page-open')
        var pageOptions = JSON.parse(el.attr('page-options') || '{}')
        if(tabTree.name === pageChoice)return;
        openTab(pageChoice,pageOptions)
    })
    .on('click','[class_toggle]',function(){
        var el = $(this)
        var targetElement = el.attr('data-target')
        var classToToggle = el.attr('class_toggle')
        var iconClassesToToggle = el.attr('icon-toggle').split(' ')
        var iconTarget = el.attr('icon-child')
        var iconTargetElement = el.find(el.attr('icon-child'))
        var togglPosition = $(targetElement).hasClass(classToToggle) ? 0 : 1
        var classToggles = dashboardOptions().class_toggle || {}
        classToggles[targetElement] = [classToToggle,togglPosition,iconClassesToToggle,iconTarget];
        dashboardOptions('class_toggle',classToggles)
        $(targetElement).toggleClass(classToToggle)
        iconTargetElement
            .removeClass(iconClassesToToggle[togglPosition === 1 ? 0 : 1])
            .addClass(iconClassesToToggle[togglPosition])
    })
    .on('keyup','.search-parent .search-controller',function(){
        var _this = this;
        var parent = $(this).parents('.search-parent')
        $.each(parent.find(".search-body .search-row"), function() {
            if($(this).text().toLowerCase().indexOf($(_this).val().toLowerCase()) === -1)
               $(this).hide();
            else
               $(this).show();
        });
    })
    .on('click','.logout',function(e){
        $.get(getApiPrefix() + '/logout/'+user.ke+'/'+user.uid,function(data){
            localStorage.removeItem('ShinobiLogin_'+location.host);
            location.href = location.href;
        })
    })
    // only binded on load
    $('.form-section-header:not(.no-toggle-header)').click(function(e){
        var parent = $(this).parent('.form-group-group')
        var boxWrapper = parent.attr('id')
        parent.toggleClass('hide-box-wrapper')
        var hideBoxWrapper = parent.hasClass('hide-box-wrapper')
        boxWrappersHidden[boxWrapper] = hideBoxWrapper
        dashboardOptions('boxWrappersHidden',boxWrappersHidden)
    })
    $('[data-bs-target="#sidebarMenu"]').click(function(e){
        resizeMonitorIcons()
    })
    if(!isMobile){
        var clicked = false, clickX, oldClickX;
        var htmlBody = $('html')
        pageTabLinks.on({
            'mousemove': function(e) {
                clicked && updateScrollPos(e);
            },
            'mousedown': function(e) {
                e.preventDefault();
                clicked = true;
                oldClickX = clickX + 0;
                clickX = e.pageX;
            },
            'mouseup': function(e) {
                if(oldClickX !== clickX){
                    e.preventDefault()
                }
                clicked = false;
                htmlBody.css('cursor', 'auto');
            }
        });

        var updateScrollPos = function(e) {
            htmlBody.css('cursor', 'grabbing');
            pageTabLinks.scrollLeft(pageTabLinks.scrollLeft() + (clickX - e.pageX));
        }
    }

})