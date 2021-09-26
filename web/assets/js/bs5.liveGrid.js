var loadedLiveGrids = {}
var monitorPops = {}
var liveGridElements = {}
var runningJpegStreams = {}
var liveGrid = $('#monitors_live')
var liveGridOpenCountElements = $('.liveGridOpenCount')
var liveGridOpenCount = 0
function setLiveGridOpenCount(addOrRemove){
    liveGridOpenCount += addOrRemove
    liveGridOpenCountElements.text(liveGridOpenCount)
}
function getLiveGridData(){
    return liveGrid.data('gridstack')
}
function getMonitorsPerRow(){
    var x
    switch(dashboardOptions().montage){
        case'1':
            x = '12'
        break;
        case'2':
            x = '6'
        break;
        case'3':
            x = '4'
        break;
        case'4':
            x = '3'
        break;
        case'5':
            x = '5'
        break;
        case'6':
            x = '2'
        break;
       default://3
            x = '4'
        break;
    }
    return x
}
function saveLiveGridBlockPositions() {
    var monitors = {}
    liveGrid.find(" .monitor_item").each(function(n,v){
        var el = $(v)
        var item = {}
        item.ke = el.attr('data-ke')
        item.mid = el.attr('data-mid')
        item.x = el.attr('data-gs-x')
        item.y = el.attr('data-gs-y')
        item.height = el.attr('data-gs-height')
        item.width = el.attr('data-gs-width')
        monitors[item.ke+''+item.mid] = item
    })
    $user.details.monitorOrder = monitors;
    mainSocket.f({f:'monitorOrder',monitorOrder:monitors})
}
function buildStreamElementHtml(streamType){
    var html = ''
    if(window.jpegModeOn === true){
        html = '<img class="stream-element">';
    }else{
        switch(streamType){
            case'hls':case'flv':case'mp4':
                html = `<video class="stream-element" playsinline muted autoplay></video>`;
            break;
            case'mjpeg':
                html = '<iframe class="stream-element"></iframe>';
            break;
            case'jpeg':
                html = '<img class="stream-element">';
            break;
            default://base64//h265
                html = '<canvas class="stream-element"></canvas>';
            break;
        }
    }
    return html
}
function resetMonitorCanvas(monitorId,initiateAfter,subStreamChannel){
    var monitor = loadedMonitors[monitorId]
    var details = monitor.details
    var streamType = subStreamChannel ? details.substream ? details.substream.output.stream_type : 'hls' : details.stream_type
    if(!liveGridElements[monitorId])return;
    var streamBlock = liveGridElements[monitorId].monitorItem.find('.stream-block')
    closeLiveGridPlayer(monitorId,false)
    streamBlock.find('.stream-element').remove()
    streamBlock.append(buildStreamElementHtml(streamType))
    if(initiateAfter)initiateLiveGridPlayer(monitor,subStreamChannel)
}
function buildLiveGridBlock(monitor){
    if(monitor.mode === 'stop'){
        new PNotify({
            title: lang.sorryNo,
            text: lang[`Cannot watch a monitor that isn't running.`],
            type: 'danger'
        })
        return
    }
    var monitorDetails = safeJsonParse(monitor.details)
    var monitorLiveId = `monitor_live_${monitor.mid}`
    var monitorMutes = dashboardOptions().monitorMutes || {}
    var subStreamChannel = monitor.subStreamChannel
    var streamType = subStreamChannel ? monitorDetails.substream ? monitorDetails.substream.output.stream_type : 'hls' : monitorDetails.stream_type
    var streamElement = buildStreamElementHtml(streamType)
    if(!loadedLiveGrids[monitor.mid])loadedLiveGrids[monitor.mid] = {}
    var baseHtml = `<div
        id="${monitorLiveId}"
        data-ke="${monitor.ke}"
        data-mid="${monitor.mid}"
        data-mode="${monitor.mode}"
        class="grid-stack-item monitor_item glM${monitor.mid}"
    >
        <div class="grid-stack-item-content ui-draggable-handle">
            <div class="stream-block no-padding mdl-card__media mdl-color-text--grey-50">
                <div class="gps-map-info gps-map-details hidden">
                    <div><i class="fa fa-compass fa-3x gps-info-bearing"></i></div>
                    <div><i class="fa fa-compass fa-3x gps-info-speed"></i></div>
                    <div></div>
                </div>
                <div class="gps-map gps-map-info hidden" id="gps-map-${monitor.mid}"></div>
                <div class="stream-objects"></div>
                <div class="stream-hud">
                    <div class="camera_cpu_usage">
                        <div class="progress">
                            <div class="progress-bar progress-bar-danger" role="progressbar" style="width: 0px;"><span></span></div>
                        </div>
                    </div>
                    <div class="lamp" title="${monitor.mode}"><i class="fa fa-eercast"></i></div>
                    <div class="controls">
                        <span title="${lang['Currently viewing']}" class="label label-default">
                            <span class="viewers"></span>
                        </span>
                        <a class="btn btn-sm badge btn-warning run-monitor-detection-trigger-test">${lang['Trigger Event']}</a>
                    </div>
                </div>
                ${streamElement}
            </div>
        </div>
        <div class="mdl-card__supporting-text text-center">
            <div class="indifference detector-fade">
                <div class="progress">
                    <div class="progress-bar progress-bar-danger" role="progressbar"><span></span></div>
                </div>
            </div>
            <div class="monitor_details">
                <div><span class="monitor_name">${monitor.name}</span></div>
            </div>
            <div class="btn-group btn-group-sm">`
            var buttons = {
               "Mute Audio": {
                  "label": lang['Mute Audio'],
                  "attr": `system="monitorMuteAudioSingle" mid="${monitor.mid}"`,
                  "class": "primary",
                  "icon": monitorMutes[monitor.mid] !== 1 ? 'volume-up' : 'volume-off'
               },
               "Snapshot": {
                  "label": lang['Snapshot'],
                  "class": "primary snapshot-live-grid-monitor",
                  "icon": "camera"
               },
               "Show Logs": {
                  "label": lang['Show Logs'],
                  "class": "warning toggle-live-grid-monitor-logs",
                  "icon": "exclamation-triangle"
               },
               "Control": {
                  "label": lang['Control'],
                  "class": "default toggle-live-grid-monitor-ptz-controls",
                  "icon": "arrows"
               },
               "Reconnect Stream": {
                  "label": lang['Reconnect Stream'],
                  "class": "success signal reconnect-live-grid-monitor",
                  "icon": "plug"
               },
               "Pop": {
                  "label": lang['Pop'],
                  "class": "default run-live-grid-monitor-pop",
                  "icon": "external-link"
               },
               "Zoom In": {
                  "label": lang['Zoom In'],
                  "attr": `monitor="zoomStreamWithMouse"`,
                  "class": "default",
                  "icon": "search-plus"
               },
               // "Calendar": {
               //    "label": lang['Calendar'],
               //    "attr": `monitor="calendar"`,
               //    "class": "default ",
               //    "icon": "calendar"
               // },
               // "Power Viewer": {
               //    "label": lang['Power Viewer'],
               //    "attr": `monitor="powerview"`,
               //    "class": "default",
               //    "icon": "map-marker"
               // },
               "Time-lapse": {
                  "label": lang['Time-lapse'],
                  "attr": `monitor="timelapseJpeg"`,
                  "class": "default",
                  "icon": "angle-double-right"
               },
               // "Video Grid": {
               //    "label": "Video Grid",
               //    "attr": `monitor="video_grid"`,
               //    "class": "default",
               //    "icon": "th"
               // },
               "Videos List": {
                  "label": lang['Videos List'],
                  "class": "default open-videos",
                  "icon": "film"
               },
               "Monitor Settings": {
                  "label": lang['Monitor Settings'],
                  "class": "default open-monitor-settings",
                  "icon": "wrench"
               },
               "Fullscreen": {
                  "label": lang['Fullscreen'],
                  "class": "default toggle-live-grid-monitor-fullscreen",
                  "icon": "arrows-alt"
               },
               "Close": {
                  "label": lang['Close'],
                  "class": "danger close-live-grid-monitor",
                  "icon": "times"
               }
            }
            if(!permissionCheck('video_view',monitor.mid)){
                delete(buttons["Videos List"])
                delete(buttons["Time-lapse"])
                delete(buttons["Power Viewer"])
                delete(buttons["Calendar"])
            }
            if(!permissionCheck('monitor_edit',monitor.mid)){
                delete(buttons["Monitor Settings"])
            }
            $.each(buttons,function(n,v){
                baseHtml += `<a class="btn btn-${v.class}" ${v.attr} title="${v.label}"><i class="fa fa-${v.icon}"></i></a>`
            })
            baseHtml += `</div>
        </div>
        <div class="mdl-data_window pull-right">
            <div class="d-flex flex-row" style="height: 100%;">
                <div class="data-menu col-md-6 p-2 videos-mini scrollable"></div>
                <div class="data-menu col-md-6 p-2 logs scrollable"></div>
            </div>
        </div>
    </div>`

    return baseHtml
}
function drawPtzControlsOnLiveGridBlock(monitorId){
    var monitorItem = $('#monitor_live_' + monitorId)
    var ptzControls = monitorItem.find('.PTZ_controls');
    if(ptzControls.length>0){
        ptzControls.remove()
    }else{
        var html = `<div class="PTZ_controls">
            <div class="pad">
                <div class="control top run-live-grid-monitor-ptz" data-ptz-control="up"></div>
                <div class="control left run-live-grid-monitor-ptz" data-ptz-control="left"></div>
                <div class="control right run-live-grid-monitor-ptz" data-ptz-control="right"></div>
                <div class="control bottom run-live-grid-monitor-ptz" data-ptz-control="down"></div>
                <div class="control middle run-live-grid-monitor-ptz" data-ptz-control="center"></div>
            </div>
            <div class="btn-group btn-group-sm btn-group-justified">
                <a title="${lang['Zoom In']}" class="zoom_in btn btn-default run-live-grid-monitor-ptz" data-ptz-control="zoom_in"><i class="fa fa-search-plus"></i></a>
                <a title="${lang['Zoom Out']}" class="zoom_out btn btn-default run-live-grid-monitor-ptz" data-ptz-control="zoom_out"><i class="fa fa-search-minus"></i></a>
            </div>
            <div class="btn-group btn-group-sm btn-group-justified">
                <a title="${lang['Enable Nightvision']}" class="nv_enable btn btn-default run-live-grid-monitor-ptz" data-ptz-control="enable_nv"><i class="fa fa-moon-o"></i></a>
                <a title="${lang['Disable Nightvision']}" class="nv_disable btn btn-default run-live-grid-monitor-ptz" data-ptz-control="disable_nv"><i class="fa fa-sun-o"></i></a>
            </div>
            ${safeJsonParse(loadedMonitors[monitorId].details,{}).is_onvif === '1' ? `
            <div class="btn-group btn-group-sm btn-group-justified">
                <a title="${lang['Set Home Position (ONVIF-only)']}" class="btn btn-default run-live-grid-monitor-ptz" data-ptz-control="setHome"><i class="fa fa-h-square"></i> ${lang['Set Home']}</a>
            </div>` : ``}
        </div>`
        monitorItem.append(html)
    }
}
function drawVideoCardToMiniList(monitorId,video,skipLimitCheck){
    var theVideoList = liveGridElements[monitorId].miniVideoList
    if(!skipLimitCheck){
        var rowsDrawn = theVideoList.find('.video-row')
        if(rowsDrawn.length > 10)rowsDrawn.last().remove()
    }
    theVideoList.prepend(createVideoRow(video,`col-12 mb-2`))
}
function loadVideoMiniList(monitorId){
    getVideos({
        monitorId: monitorId,
        limit: 10,
    },function(data){
        var videos = data.videos
        $.each(videos.reverse(),function(n,video){
            drawVideoCardToMiniList(monitorId,video,true)
        })
    })
}
function drawLiveGridBlock(monitorConfig,subStreamChannel){
    var monitorId = monitorConfig.mid
    if($('#monitor_live_' + monitorId).length === 0){
        var x = 0;
        var y = 0;
        var monitorsPerRow = getMonitorsPerRow()
        var width = monitorsPerRow
        var height = width;
        var isSmallMobile = isMobile && window.innerWidth <= 812;
        var html = buildLiveGridBlock(monitorConfig)
        if($user.details && $user.details.monitorOrder && $user.details.monitorOrder[monitorConfig.ke+''+monitorId]){
            var saved = $user.details.monitorOrder[monitorConfig.ke+''+monitorId];
            x = saved.x;
            y = saved.y;
            width = saved.width;
            height = saved.height;
        }
        var autoPlacement = false
        if(dashboardOptions().switches.monitorOrder !== 1){
            autoPlacement = true
        }
        liveGrid.data('gridstack').addWidget($(html), x, y, isSmallMobile ? 4 :  height, isSmallMobile ? 4 :  height, autoPlacement);
        var theBlock = $('#monitor_live_' + monitorId);
        var streamElement = theBlock.find('.stream-element')
        liveGridElements[monitorId] = {
            monitorItem: theBlock,
            streamElement: streamElement,
            eventObjects: theBlock.find('.stream-objects'),
            motionMeter: theBlock.find('.indifference .progress-bar'),
            motionMeterText: theBlock.find('.indifference .progress-bar span'),
            width: streamElement.width(),
            height: streamElement.height(),
            miniVideoList: theBlock.find('.videos-mini'),
        }
        try{
            if(safeJsonParse(monitorConfig.details).control === "1"){
                theBlock.find('[monitor="control_toggle"]').show()
            }else{
                theBlock.find('.pad').remove();
                theBlock.find('[monitor="control_toggle"]').hide()
            }
        }catch(re){
            debugLog(re)
        }
        setCosmeticMonitorInfo(loadedMonitors[monitorId],subStreamChannel)
        setLiveGridOpenCount(1)
    }
    initiateLiveGridPlayer(loadedMonitors[monitorId],subStreamChannel)
    loadVideoMiniList(monitorId)
}
function initiateLiveGridPlayer(monitor,subStreamChannel){
    var livePlayerElement = loadedLiveGrids[monitor.mid]
    var details = monitor.details
    var groupKey = monitor.ke
    var monitorId = monitor.mid
    var loadedMonitor = loadedMonitors[monitorId]
    var loadedPlayer = loadedLiveGrids[monitor.mid]
    var websocketPath = checkCorrectPathEnding(location.pathname) + 'socket.io'
    var containerElement = $(`#monitor_live_${monitor.mid}`)
    var streamType = subStreamChannel ? details.substream ? details.substream.output.stream_type : 'hls' : details.stream_type
    if(location.search === '?p2p=1'){
        websocketPath = '/socket.io'
        // websocketQuery.machineId = machineId
    }
    switch(streamType){
        case'jpeg':
            startJpegStream(monitorId)
        break;
        case'b64':
            if(loadedPlayer.Base64 && loadedPlayer.Base64.connected){
                loadedPlayer.Base64.disconnect()
            }
            loadedPlayer.Base64 = io(location.origin,{ path: websocketPath, query: websocketQuery, transports: ['websocket'], forceNew: false})
            var ws = loadedPlayer.Base64
            var buffer
            ws.on('diconnect',function(){
                console.log('Base64 Stream Disconnected')
            })
            ws.on('connect',function(){
                ws.emit('Base64',{
                    auth: $user.auth_token,
                    uid: $user.uid,
                    ke: monitor.ke,
                    id: monitor.mid,
                    channel: subStreamChannel
                })
                if(!loadedPlayer.ctx || loadedPlayer.ctx.length === 0){
                    loadedPlayer.ctx = containerElement.find('canvas');
                }
                var ctx = loadedPlayer.ctx[0]
                var ctx2d = ctx.getContext("2d")
                loadedPlayer.image = new Image()
                var image = loadedPlayer.image
                image.onload = function() {
                    loadedPlayer.imageLoading = false
                    var x = 0
                    var y = 0
                    ctx.getContext("2d").drawImage(image,x,y,ctx.width,ctx.height)
                    URL.revokeObjectURL(loadedPlayer.imageUrl)
                }
                ws.on('data',function(imageData){
                    try{
                        if(loadedPlayer.imageLoading === true)return console.log('drop');
                        loadedPlayer.imageLoading = true
                        var arrayBufferView = new Uint8Array(imageData);
                        var blob = new Blob( [ arrayBufferView ], { type: "image/jpeg" } );
                        loadedPlayer.imageUrl = URL.createObjectURL( blob );
                        loadedPlayer.image.src = loadedPlayer.imageUrl
                        loadedPlayer.last_frame = 'data:image/jpeg;base64,'+base64ArrayBuffer(imageData)
                    }catch(er){
                        debugLog('base64 frame')
                    }
                    // $.ccio.init('signal',d);
                })
            })
        break;
        case'mp4':
            setTimeout(function(){
                var stream = containerElement.find('.stream-element');
                var onPoseidonError = function(){
                    // setTimeout(function(){
                        // mainSocket.f({f:'monitor',ff:'watch_on',id:monitor.mid})
                    // },5000)
                }
                if(!loadedPlayer.PoseidonErrorCount)loadedPlayer.PoseidonErrorCount = 0
                if(loadedPlayer.PoseidonErrorCount >= 5)return
                if(monitor.details.stream_flv_type==='ws'){
                    if(loadedPlayer.Poseidon){
                        loadedPlayer.Poseidon.stop()
                        revokeVideoPlayerUrl(monitorId)
                    }
                    try{
                        loadedPlayer.Poseidon = new Poseidon({
                            video: stream[0],
                            auth_token: $user.auth_token,
                            ke: monitor.ke,
                            uid: $user.uid,
                            id: monitor.mid,
                            url: location.origin,
                            path: websocketPath,
                            query: websocketQuery,
                            onError : onPoseidonError,
                            channel : subStreamChannel
                        })
                        loadedPlayer.Poseidon.start();
                    }catch(err){
                        // onPoseidonError()
                        console.log('onTryPoseidonError',err)
                    }
                }else{
                    stream.attr('src',getApiPrefix(`mp4`)+'/'+monitor.mid + (subStreamChannel ? `/${subStreamChannel}` : '')+'/s.mp4?time=' + (new Date()).getTime())
                    stream[0].onerror = function(err){
                        console.error(err)
                    }
                }
            },1000)
        break;
        case'flv':
            if (flvjs.isSupported()) {
                if(loadedPlayer.flv){
                    loadedPlayer.flv.destroy()
                    revokeVideoPlayerUrl(monitorId)
                }
                var options = {};
                if(monitor.details.stream_flv_type==='ws'){
                    if(monitor.details.stream_flv_maxLatency&&monitor.details.stream_flv_maxLatency!==''){
                        monitor.details.stream_flv_maxLatency = parseInt(monitor.details.stream_flv_maxLatency)
                    }else{
                        monitor.details.stream_flv_maxLatency = 20000;
                    }
                    options = {
                        type: 'flv',
                        isLive: true,
                        auth_token: $user.auth_token,
                        ke: monitor.ke,
                        uid: $user.uid,
                        id: monitor.mid,
                        maxLatency: monitor.details.stream_flv_maxLatency,
                        hasAudio:false,
                        url: location.origin,
                        path: websocketPath,
                        channel : subStreamChannel,
                        query: websocketQuery
                    }
                }else{
                    options = {
                        type: 'flv',
                        isLive: true,
                        url: getApiPrefix(`flv`)+'/'+monitor.mid + (subStreamChannel ? `/${subStreamChannel}` : '')+'/s.flv'
                    }
                }
                loadedPlayer.flv = flvjs.createPlayer(options);
                loadedPlayer.flv.attachMediaElement(containerElement.find('.stream-element')[0]);
                loadedPlayer.flv.on('error',function(err){
                    console.log(err)
                });
                loadedPlayer.flv.load();
                loadedPlayer.flv.play();
            }else{
                new PNotify({title:'Stream cannot be started',text:'FLV.js is not supported on this browser. Try another stream type.',type:'error'});
            }
        break;
        case'hls':
            function createSteamNow(){
                clearTimeout(loadedPlayer.m3uCheck)
                var url = getApiPrefix(`hls`) + '/' + monitor.mid + (subStreamChannel ? `/${subStreamChannel}` : '') + '/s.m3u8'
                $.get(url,function(m3u){
                    if(m3u == 'File Not Found'){
                        loadedPlayer.m3uCheck = setTimeout(function(){
                            createSteamNow()
                        },2000)
                    }else{
                        var video = containerElement.find('.stream-element')[0]
                        if (isAppleDevice) {
                            video.src = url;
                            video.addEventListener('loadedmetadata', function() {
                              setTimeout(function(){
                                video.play();
                              },3000)
                            }, false);
                        }else{
                            var hlsOptions = safeJsonParse(dashboardOptions().hlsOptions) || {}
                            if(hlsOptions instanceof String){
                                hlsOptions = {}
                                new PNotify({
                                    title: lang['Invalid JSON'],
                                    text: lang.hlsOptionsInvalid,
                                    type: `warning`,
                                })
                            }
                            if(loadedPlayer.hls){
                                loadedPlayer.hls.destroy()
                                revokeVideoPlayerUrl(monitorId)
                            }
                            loadedPlayer.hls = new Hls(hlsOptions)
                            loadedPlayer.hls.loadSource(url)
                            loadedPlayer.hls.attachMedia(video)
                            loadedPlayer.hls.on(Hls.Events.MANIFEST_PARSED,function() {
                                if (video.paused) {
                                    video.play();
                                }
                            });
                        }
                    }
                })
            }
            createSteamNow()
        break;
        case'mjpeg':
            var liveStreamElement = containerElement.find('.stream-element')
            var setSource = function(){
                liveStreamElement.attr('src',getApiPrefix(`mjpeg`)+'/'+monitorId + (subStreamChannel ? `/${subStreamChannel}` : ''))
                liveStreamElement.unbind('ready')
                liveStreamElement.ready(function(){
                    setTimeout(function(){
                        liveStreamElement.contents().find("body").append('<style>img{width:100%;height:100%}</style>')
                    },1000)
                })
            }
            setSource()
            liveStreamElement.on('error',function(err){
                setTimeout(function(){
                    setSource()
                },4000)
            })
        break;
        case'h265':
            var player = loadedPlayer.h265Player
            var video = containerElement.find('.stream-element')[0]
            if (player) {
                player.stop()
                revokeVideoPlayerUrl(monitorId)
            }
            loadedPlayer.h265Player = new libde265.RawPlayer(video)
            var player = loadedPlayer.h265Player
            player.set_status_callback(function(msg, fps) {
            })
            player.launch()
            if(loadedPlayer.h265Socket && loadedPlayer.h265Socket.connected){
                loadedPlayer.h265Socket.disconnect()
            }
            if(loadedPlayer.h265HttpStream && loadedPlayer.abort){
                loadedPlayer.h265HttpStream.abort()
            }
            if(monitor.details.stream_flv_type==='ws'){
              loadedPlayer.h265Socket = io(location.origin,{ path: websocketPath, query: websocketQuery, transports: ['websocket'], forceNew: false})
              var ws = loadedPlayer.h265Socket
              ws.on('diconnect',function(){
                  console.log('h265Socket Stream Disconnected')
              })
              ws.on('connect',function(){
                  ws.emit('h265',{
                      auth: $user.auth_token,
                      uid: $user.uid,
                      ke: groupKey,
                      id: monitorId,
                      channel: subStreamChannel
                  })
                  ws.on('data',function(imageData){
                      player._handle_onChunk(imageData)
                  })
              })
            }else{
              var url = getApiPrefix(`h265`) + '/' + monitorId + (subStreamChannel ? `/${subStreamChannel}` : '') + '/s.hevc';
              loadedPlayer.h265HttpStream = player.createHttpStream(url)
            }
        break;
    }
    var monitorMutes = dashboardOptions().monitorMutes || {}
    if(dashboardOptions().switches.monitorMuteAudio === 1){
        containerElement.find('video').each(function(n,el){
            el.muted = "muted"
        })
    }else{
        var hasFocus = windowFocus && window.hadFocus
        $.each(loadedMonitors,function(frontId,monitor){
            setTimeout(() => {
                var monitorId = monitor.mid
                var muted = monitorMutes[monitorId]
                try{
                    var vidEl = $('.monitor_item[mid="' + monitorId + '"] video')[0]
                    if(vidEl.length === 0)return;
                    if(muted === 1){
                        vidEl.muted = true
                    }else{
                        if(hasFocus){
                            vidEl.muted = false
                        }else{
                            console.error('User must have window active to unmute.')
                        }
                    }
                }catch(err){
                    // console.log(err)
                }
            },2000)
        })
    }
    //initiate signal check
    var signalCheckInterval = (isNaN(loadedMonitor.details.signal_check) ? 10 : parseFloat(loadedMonitor.details.signal_check)) * 1000 * 60
    if(signalCheckInterval > 0){
        clearInterval(loadedPlayer.signal)
        loadedPlayer.signal = setInterval(function(){
            signalCheckLiveStream({
                mid: monitorId,
                checkSpeed: 1000,
            })
        },signalCheckInterval);
    }
}
function revokeVideoPlayerUrl(monitorId){
    try{
        URL.revokeObjectURL(liveGridElements[monitorId].streamElement[0].src)
    }catch(err){
        debugLog(err)
    }
}
function closeLiveGridPlayer(monitorId,killElement){
    try{
        var livePlayerElement = loadedLiveGrids[monitorId]
        if(livePlayerElement){
            if(livePlayerElement.hls){livePlayerElement.hls.destroy()}
            if(livePlayerElement.Poseidon){livePlayerElement.Poseidon.stop()}
            if(livePlayerElement.Base64){livePlayerElement.Base64.disconnect()}
            if(livePlayerElement.h265Socket){livePlayerElement.h265Socket.disconnect()}
            if(livePlayerElement.h265Player){livePlayerElement.h265Player.stop()}
            if(livePlayerElement.dash){livePlayerElement.dash.reset()}
            if(livePlayerElement.jpegInterval){
                stopJpegStream(monitorId)
            }
            if(livePlayerElement.h265HttpStream && livePlayerElement.h265HttpStream.abort){
                livePlayerElement.h265HttpStream.abort()
            }
        }
        if(liveGridElements[monitorId])revokeVideoPlayerUrl(monitorId)
        clearInterval(livePlayerElement.signal)
    }catch(err){
        console.log(err)
    }
    if(killElement){
        var theElement = $('#monitor_live_'+monitorId)
        if(theElement.length > 0){
            getLiveGridData().removeWidget(theElement)
            setLiveGridOpenCount(-1)
            delete(loadedLiveGrids[monitorId])
            delete(liveGridElements[monitorId])
        }
    }
}
function callMonitorToLiveGrid(v){
    var watchedOn = dashboardOptions().watch_on || {}
    if(watchedOn[v.ke] && watchedOn[v.ke][v.mid] === 1){
        mainSocket.f({f:'monitor',ff:'watch_on',id:v.mid})
        openLiveGrid()
    }
}
function loadPreviouslyOpenedLiveGridBlocks(){
    $.getJSON(getApiPrefix(`monitor`),function(data){
        $.each(data,function(n,v){
            callMonitorToLiveGrid(v)
        })
        setTimeout(function(){
            sortListMonitors()
            if(dashboardOptions().switches.jpegMode === 1){
                mainSocket.f({
                    f: 'monitor',
                    ff: 'jpeg_on'
                })
            }
        },1000)
        drawMonitorGroupList()
    })
}
function closeAllLiveGridPlayers(rememberClose){
    var watchedOn = dashboardOptions().watch_on || {}
    $.each(watchedOn,function(n,groupOfMons){
        $.each(groupOfMons,function(monitorId,monitor){
            if(monitor === 1){
                if(rememberClose){
                    mainSocket.f({f:'monitor',ff:'watch_off',id: monitorId})
                }else{
                    closeLiveGridPlayer(monitorId,true)
                }
            }
        })
    })
}
function saveLiveGridBlockOpenState(monitorId,groupKey,state){
    var openBlocks = dashboardOptions().watch_on || {}
    openBlocks[groupKey] = openBlocks[groupKey] ? openBlocks[groupKey] : {}
    openBlocks[groupKey][monitorId] = state || 0
    dashboardOptions('watch_on',openBlocks)
}
function openLiveGrid(){
    if(tabTree.name !== 'liveGrid'){
        openTab('liveGrid',{})
    }
}
function popOutMonitor(monitorId){
    var monitorPop = monitorPops[monitorId]
    function finish(img){
        if(monitorPop){
            monitorPop.close()
        }
        monitorPop = window.open(getApiPrefix() + '/embed/' + $user.ke + '/' + monitorId + '/fullscreen|jquery|relative|gui','pop_' + monitorId + $user.auth_token,'height='+img.height+',width='+img.width);
    }
    if(loadedLiveGrids[monitorId]){
        getSnapshot(loadedMonitors[monitorId],function(url){
            $('#temp').html('<img>')
            var img=$('#temp img')[0]
            img.onload = function(){
                finish(img)
            }
            img.src = url
        })
    }else{
        var img = {
            height: 720,
            width: 1280
        }
        finish(img)
    }
}
function fullScreenLiveGridStream(monitorItem){
    var videoElement = monitorItem.find('.stream-element')
    monitorItem.addClass('fullscreen')
    if(videoElement.is('canvas')){
        var theBody = $('body')
        videoElement.attr('height',theBody.height())
        videoElement.attr('width',theBody.width())
    }
    fullScreenInit(videoElement[0])
}
function toggleJpegMode(){
    var sendData = {
        f: 'monitor',
        ff: 'jpeg_on'
    }
    if(window.jpegModeOn === true){
        sendData.ff = 'jpeg_off'
    }
    mainSocket.f(sendData)
}
function startJpegStream(monitorId){
    if(loadedLiveGrids[monitorId]){
        var monitor = loadedMonitors[monitorId]
        var loadedBlock = loadedLiveGrids[monitorId]
        var jpegInterval = !isNaN(monitor.details.jpegInterval) ? parseFloat(monitor.details.jpegInterval) : 1
        resetMonitorCanvas(monitorId,false)
        var streamElement = $('#monitor_live_' + monitorId + ' .stream-element');
        // stopJpegStream(monitorId)
        var jpegUrl = getApiPrefix('jpeg') + '/' + monitorId + '/s.jpg?time='
        function drawNewFrame(){
            streamElement.attr('src',jpegUrl + (new Date()).getTime())
        }
        streamElement.on('load',function(){
            loadedBlock.jpegInterval = setTimeout(drawNewFrame,1000/jpegInterval)
        }).on('error',function(){
            loadedBlock.jpegInterval = setTimeout(drawNewFrame,1000/jpegInterval)
        })
        drawNewFrame()
    }
}
function stopJpegStream(monitorId){
    var livePlayerElement = loadedLiveGrids[monitorId]
    if(!livePlayerElement)return;
    try{
        liveGridElements[monitorId].streamElement.off('load').off('error')
        clearTimeout(livePlayerElement.jpegInterval)
    }catch(err){
        console.log(err)
        console.log(monitorId)
    }
}
function startAllJpegStreams(monitorId){
    $.each(loadedMonitors,function(n,monitor){
        startJpegStream(monitor.mid)
    })
}
function stopAllJpegStreams(monitorId){
    $.each(loadedMonitors,function(n,monitor){
        stopJpegStream(monitor.mid)
    })
}
function canBackgroundStream(){
    return tabTree.name === 'liveGrid' && dashboardOptions().switches.backgroundStream === 1
}
function resetLiveGridDimensionsInMemory(monitorId){
    var theRef = liveGridElements[monitorId]
    theRef.width = theRef.streamElement.width()
    theRef.height = theRef.streamElement.height()
}
function resetAllLiveGridDimensionsInMemory(monitorId){
    $.each(liveGridElements,function(monitorId,data){
        resetLiveGridDimensionsInMemory(monitorId)
    })
}
function signalCheckLiveStream(options){
    try{
        var monitorId = options.mid
        var monitorConfig = loadedMonitors[monitorId]
        var liveGridData = liveGridElements[monitorId]
        var monitorItem = liveGridData.monitorItem
        var monitorDetails = monitorConfig.details
        var checkCount = 0
        var base64Data = null;
        var checkSpeed = options.checkSpeed || 1000
        var subStreamChannel = monitor.subStreamChannel
        var streamType = subStreamChannel ? monitorDetails.substream ? monitorDetails.substream.output.stream_type : 'hls' : monitorDetails.stream_type
        function failedStreamCheck(){
            if(monitorConfig.signal_check_log == 1){
                logWriterDraw('[mid="'+monitorId+'"]',{
                    log: {
                        type: 'Stream Check',
                        msg: lang.clientStreamFailedattemptingReconnect
                    }
                })
            }
            mainSocket.f({f:'monitor',ff:'watch_on',id:monitorId});
        }
        function succeededStreamCheck(){
            if(monitorConfig.signal_check_log == 1){
                logWriterDraw('[mid="'+monitorId+'"]',{
                    log: {
                        type: 'Stream Check',
                        msg : lang.Success
                    }
                })
            }
        }
        function executeCheck(){
            switch(streamType){
                case'b64':case'h265':
                    monitorItem.resize()
                break;
                case'hls':case'flv':case'mp4':
                    if(monitorItem.find('video')[0].paused){
                        failedStreamCheck()
                    }else{
                        succeededStreamCheck()
                    }
                break;
                default:
                    if(dashboardOptions().jpeg_on === true){return}
                    getSnapshot({
                        monitor: loadedMonitors[monitorId],
                    },function(url){
                        base64Data = url;
                        setTimeout(function(){
                            getSnapshot({
                                monitor: loadedMonitors[monitorId],
                            },function(url){
                                if(base64Data === url){
                                    if(checkCount < 3){
                                        ++checkCount;
                                        setTimeout(function(){
                                            executeCheck();
                                        },checkSpeed)
                                    }else{
                                        failedStreamCheck()
                                    }
                                }else{
                                    succeededStreamCheck()
                                }
                            });
                        },checkSpeed)
                    });
                break;
            }
        }
        executeCheck();
    }catch(err){
        var errorStack = err.stack;
        function phraseFoundInErrorStack(x){return errorStack.indexOf(x) > -1}
        if(phraseFoundInErrorStack("The HTMLImageElement provided is in the 'broken' state.")){
            mainSocket.f({f:'monitor',ff:'watch_on',id:monitorId});
        }
        clearInterval(liveGridData.signal);
        delete(liveGridData.signal);
    }
}
$(document).ready(function(e){
    liveGrid
    .on('dblclick','.stream-hud',function(){
        $(this).parents('[data-mid]').find('[monitor="fullscreen"]').click();
    })
    $('body')
    .resize(function(){
        resetAllLiveGridDimensionsInMemory()
    })
    .on('click','.toggle-substream',function(){
        var monitorId = $(this).parents('[data-mid]').attr('data-mid')
        var monitor = loadedMonitors[monitorId]
        if(monitor.subStreamToggleLock)return false;
        monitor.subStreamToggleLock = true
        $.get(getApiPrefix(`toggleSubstream`)+'/'+monitor.mid,function(data){
            monitor.subStreamToggleLock = false
        })
    })
    .on('click','.launch-live-grid-monitor',function(){
        var monitorId = $(this).parents('[data-mid]').attr('data-mid')
        // if(isMobile){
        //     createLivePlayerTab(loadedMonitors[monitorId])
        // }else{
            mainSocket.f({
                f: 'monitor',
                ff: 'watch_on',
                id: monitorId
            })
            openLiveGrid()
        // }
    })
    .on('click','.reconnect-live-grid-monitor',function(){
        var monitorId = $(this).parents('[data-mid]').attr('data-mid')
        mainSocket.f({
            f: 'monitor',
            ff: 'watch_on',
            id: monitorId
        })
    })
    .on('click','.close-live-grid-monitor',function(){
        var monitorId = $(this).parents('[data-mid]').attr('data-mid')
        mainSocket.f({
            f: 'monitor',
            ff: 'watch_off',
            id: monitorId
        })
        setTimeout(function(){
            saveLiveGridBlockOpenState(monitorId,$user.ke,0)
        },1000)
    })
    .on('click','.snapshot-live-grid-monitor',function(){
        var monitorId = $(this).parents('[data-mid]').attr('data-mid')
        getSnapshot({
            monitor: loadedMonitors[monitorId],
        },function(url){
            $('#temp').html('<a href="'+url+'" download="'+formattedTimeForFilename()+'_'+monitorId+'.jpg">a</a>').find('a')[0].click();
        })
    })
    .on('click','.toggle-live-grid-monitor-logs',function(){
        var monitorItem = $(this).parents('[data-mid]')
        monitorItem.toggleClass('show_data')
        var dataBlocks = monitorItem.find('.stream-block,.mdl-data_window')
        if(monitorItem.hasClass('show_data')){
            dataBlocks.addClass('col-md-6').removeClass('col-md-12')
        }else{
            dataBlocks.addClass('col-md-12').removeClass('col-md-6')
        }
    })
    .on('click','.toggle-live-grid-monitor-ptz-controls',function(){
        var monitorItem = $(this).parents('[data-mid]').attr('data-mid')
        drawPtzControlsOnLiveGridBlock(monitorItem)
    })
    .on('click','.toggle-live-grid-monitor-fullscreen',function(){
        var monitorItem = $(this).parents('[data-mid]')
        fullScreenLiveGridStream(monitorItem)
    })
    .on('click','.run-live-grid-monitor-pop',function(){
        var monitorId = $(this).parents('[data-mid]').attr('data-mid')
        popOutMonitor(monitorId)
    })
    .on('click','.run-live-grid-monitor-ptz',function(){
        var el = $(this)
        var monitorId = el.parents('[data-mid]').attr('data-mid')
        var switchChosen = el.attr('data-ptz-control')
        runPtzCommand(monitorId,switchChosen)
    })
    .on('click','.run-monitor-detection-trigger-test',function(){
        var el = $(this)
        var monitorId = el.parents('[data-mid]').attr('data-mid')
        runTestDetectionTrigger(monitorId)
    })
    $('.open-all-monitors').click(function(){
        $.each(loadedMonitors,function(monitorId,monitor){
            mainSocket.f({
                f: 'monitor',
                ff: 'watch_on',
                id: monitor.mid
            })
            openLiveGrid()
        })
    })
    liveGrid
    .gridstack({
        cellHeight: 80,
        verticalMargin: 0,
    })
    .on('dragstop', function(event,ui){
        setTimeout(function(){
            saveLiveGridBlockPositions()
        },700)
    })
    .on('gsresizestop', function(){
        resetAllLiveGridDimensionsInMemory()
        saveLiveGridBlockPositions()
    });
    addOnTabReopen('liveGrid', function () {
        loadPreviouslyOpenedLiveGridBlocks()
    })
    addOnTabAway('liveGrid', function () {
        closeAllLiveGridPlayers()
    })
    onInitWebsocket(function (d){
        loadPreviouslyOpenedLiveGridBlocks()
    })
    onWebSocketEvent(function (d){
        switch(d.f){
            case'init_success':
                // loadPreviouslyOpenedLiveGridBlocks()
            break;
            case'video_build_success':
                d.status = 1
                d.mid = d.id || d.mid
                if(liveGridElements[d.mid] && liveGridElements[d.mid].streamElement)drawVideoCardToMiniList(d.mid,createVideoLinks(d),false)
            break;
            case'monitor_watch_off':case'monitor_stopping':
                var monitorId = d.mid || d.id
                closeLiveGridPlayer(monitorId,(d.f === 'monitor_watch_off'))
            break;
            case'monitor_status':
                if(
                    tabTree.name === 'liveGrid' &&
                    (
                        d.code === 2 ||
                        d.code === 3
                    )
                ){
                    var monitorId = d.mid || d.id
                    setTimeout(function(){
                        callMonitorToLiveGrid(loadedMonitors[monitorId])
                    },2000)
                }
            break;
            case'substream_start':
                loadedMonitors[d.mid].subStreamChannel = d.channel
                setTimeout(() => {
                    resetMonitorCanvas(d.mid,true,d.channel)
                },3000)
            break;
            case'substream_end':
                loadedMonitors[d.mid].subStreamChannel = null
                resetMonitorCanvas(d.mid,true,null)
            break;
            case'monitor_watch_on':
                var monitorId = d.mid || d.id
                var subStreamChannel = d.subStreamChannel
                drawLiveGridBlock(loadedMonitors[monitorId],subStreamChannel)
                saveLiveGridBlockOpenState(monitorId,$user.ke,1)
            break;
            case'mode_jpeg_off':
                window.jpegModeOn = false
                $.each(loadedMonitors,function(n,v){
                    stopJpegStream(v.mid)
                    resetMonitorCanvas(v.mid)
                    initiateLiveGridPlayer(v)
                })
                $('body').removeClass('jpegMode')
            break;
            case'mode_jpeg_on':
                window.jpegModeOn = true
                startAllJpegStreams()
                $('body').addClass('jpegMode')
            break;
            case'detector_trigger':
                var monitorId = d.id
                var liveGridElement = liveGridElements[monitorId]
                if(liveGridElement){
                    var monitorElement = liveGridElement.monitorItem
                    var livePlayerElement = loadedLiveGrids[monitorId]
                    if(d.doObjectDetection === true){
                        monitorElement.addClass('doObjectDetection')
                        clearTimeout(livePlayerElement.detector_trigger_doObjectDetection_timeout)
                        livePlayerElement.detector_trigger_doObjectDetection_timeout = setTimeout(function(){
                            monitorElement.removeClass('doObjectDetection')
                        },3000)
                    }else{
                        monitorElement.removeClass('doObjectDetection')
                    }
                    if(d.details.matrices&&d.details.matrices.length>0){
                        drawMatrices(d,{
                            theContainer: liveGridElement.eventObjects,
                            height: liveGridElement.height,
                            width: liveGridElement.width,
                        })
                    }
                    if(d.details.confidence){
                        var eventConfidence = d.details.confidence
                        if(eventConfidence > 100)eventConfidence = 100
                        liveGridElement.motionMeter.css('width',eventConfidence + '%');
                        liveGridElement.motionMeterText[0].innerHtml = d.details.confidence+'% change in <b>'+d.details.name+'</b>'
                    }
                    monitorElement.addClass('detector_triggered')
                    clearTimeout(livePlayerElement.detector_trigger_timeout);
                    livePlayerElement.detector_trigger_timeout = setTimeout(function(){
                        monitorElement.removeClass('detector_triggered');
                        liveGridElement.eventObjects.find('.stream-detected-object,.stream-detected-point').remove()
                    },5000);
                    playAudioAlert()
                    var monitorPop = monitorPops[monitorId]
                    if($user.details.event_mon_pop === '1' && (!monitorPop || monitorPop.closed === true)){
                        popOutMonitor(monitorId)
                    }
                    // console.log({
                    //     ke: d.ke,
                    //     mid: monitorId,
                    //     log: {
                    //         type: lang['Event Occurred'],
                    //         msg: d.details,
                    //     }
                    // })
                }
            break;
        }
    })
    $(window).focus(function(){
        if(canBackgroundStream()){
            loadPreviouslyOpenedLiveGridBlocks()
        }
    }).blur(function(){
        if(canBackgroundStream()){
            closeAllLiveGridPlayers()
        }
    })
    dashboardSwitchCallbacks.monitorOrder = function(toggleState){
        if(toggleState !== 1){
            $('.monitor_item').attr('data-gs-auto-position','yes')
        }else{
            $('.monitor_item').attr('data-gs-auto-position','no')
        }
    }
    dashboardSwitchCallbacks.monitorMuteAudio = function(toggleState){
        var monitorMutes = dashboardOptions().monitorMutes || {}
        $('.monitor_item video').each(function(n,vidEl){
            var monitorId = $(this).parents('[mid]').attr('mid')
            if(toggleState === 1){
                vidEl.muted = true
            }else{
                if(monitorMutes[monitorId] !== 1){
                    vidEl.muted = false
                }
            }
        })
    }
    dashboardSwitchCallbacks.jpegMode = toggleJpegMode
})
