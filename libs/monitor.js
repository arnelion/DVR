var fs = require('fs');
var events = require('events');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var Mp4Frag = require('mp4frag');
var onvif = require('node-onvif');
var request = require('request');
var connectionTester = require('connection-tester')
var URL = require('url')
module.exports = function(s,config,lang){
    s.initiateMonitorObject = function(e){
        if(!s.group[e.ke]){s.group[e.ke]={}};
        if(!s.group[e.ke].mon){s.group[e.ke].mon={}}
        if(!s.group[e.ke].mon[e.mid]){s.group[e.ke].mon[e.mid]={}}
        if(!s.group[e.ke].mon[e.mid].streamIn){s.group[e.ke].mon[e.mid].streamIn={}};
        if(!s.group[e.ke].mon[e.mid].emitterChannel){s.group[e.ke].mon[e.mid].emitterChannel={}};
        if(!s.group[e.ke].mon[e.mid].mp4frag){s.group[e.ke].mon[e.mid].mp4frag={}};
        if(!s.group[e.ke].mon[e.mid].firstStreamChunk){s.group[e.ke].mon[e.mid].firstStreamChunk={}};
        if(!s.group[e.ke].mon[e.mid].contentWriter){s.group[e.ke].mon[e.mid].contentWriter={}};
        if(!s.group[e.ke].mon[e.mid].childNodeStreamWriters){s.group[e.ke].mon[e.mid].childNodeStreamWriters={}};
        if(!s.group[e.ke].mon[e.mid].eventBasedRecording){s.group[e.ke].mon[e.mid].eventBasedRecording={}};
        if(!s.group[e.ke].mon[e.mid].watch){s.group[e.ke].mon[e.mid].watch={}};
        if(!s.group[e.ke].mon[e.mid].fixingVideos){s.group[e.ke].mon[e.mid].fixingVideos={}};
        if(!s.group[e.ke].mon[e.mid].isStarted){s.group[e.ke].mon[e.mid].isStarted = false};
        if(s.group[e.ke].mon[e.mid].delete){clearTimeout(s.group[e.ke].mon[e.mid].delete)}
        if(!s.group[e.ke].mon_conf){s.group[e.ke].mon_conf={}}
    }
    s.sendMonitorStatus = function(e){
        s.group[e.ke].mon[e.id].monitorStatus = e.status
        s.tx(Object.assign(e,{f:'monitor_status'}),'GRP_'+e.ke)
    }
    s.buildMonitorUrl = function(e,noPath){
        var authd = ''
        var url
        if(e.details.muser&&e.details.muser!==''&&e.host.indexOf('@')===-1) {
            e.username = e.details.muser
            e.password = e.details.mpass
            authd = e.details.muser+':'+e.details.mpass+'@'
        }
        if(e.port==80&&e.details.port_force!=='1'){e.porty=''}else{e.porty=':'+e.port}
        url = e.protocol+'://'+authd+e.host+e.porty
        if(noPath !== true)url += e.path
        return url
    }
    s.cleanMonitorObject = function(e){
        x={keys:Object.keys(e),ar:{}};
        x.keys.forEach(function(v){
            if(v!=='last_frame'&&v!=='record'&&v!=='spawn'&&v!=='running'&&(v!=='time'&&typeof e[v]!=='function')){x.ar[v]=e[v];}
        });
        return x.ar;
    }
    s.getRawSnapshotFromMonitor = function(monitor,options,callback){
        if(!callback){
            callback = options
            var options = ''
        }else{
            options = ' '+options
        }
        var url
        var runExtraction = function(){
            var snapBuffer = []
            var snapProcess = spawn(config.ffmpegDir,('-loglevel quiet -re -i '+url+options+' -frames:v 1 -f singlejpeg pipe:1').split(' '),{detached: true})
            snapProcess.stdout.on('data',function(data){
                snapBuffer.push(data)
            });
            snapProcess.on('close',function(data){
                snapBuffer = Buffer.concat(snapBuffer)
                callback(snapBuffer)
            })
        }
        var checkExists = function(localStream,callback){
            fs.stat(localStream,function(err){
                if(err){
                    callback(false)
                }else{
                    callback(true)
                }
            })
        }
        var localStream = s.dir.streams+monitor.ke+'/'+monitor.mid+'/'
        checkExists(localStream+'s.jpg',function(success){
            if(success === false){
                checkExists(localStream+'detectorStream.m3u8',function(success){
                    if(success === false){
                        checkExists(localStream+'s.m3u8',function(success){
                            if(success === false){
                                url = s.buildMonitorUrl(monitor)
                            }else{
                                url = localStream+'s.m3u8'
                            }
                            runExtraction()
                        })
                    }else{
                        url = localStream+'detectorStream.m3u8'
                        runExtraction()
                    }
                })
            }else{
                fs.readFile(localStream+'s.jpg',function(err,snapBuffer){
                    callback(snapBuffer)
                })
            }
        })
    }
    s.mergeDetectorBufferChunks = function(monitor,callback){
        var pathDir = s.dir.streams+monitor.ke+'/'+monitor.id+'/'
        var mergedFile = s.formattedTime()+'.mp4'
        var mergedFilepath = pathDir+mergedFile
        var streamDirItems = fs.readdirSync(pathDir)
        var items = []
        var copiedItems = []
        var createMerged = function(copiedItems){
            var allts = pathDir+items.join('_')
            fs.stat(allts,function(err,stats){
                if(err){
                    //not exist
                    var cat = 'cat '+copiedItems.join(' ')+' > '+allts
                    exec(cat,function(){
                        var merger = spawn(config.ffmpegDir,s.splitForFFPMEG(('-re -i '+allts+' -acodec copy -vcodec copy '+pathDir+mergedFile)))
                        merger.stderr.on('data',function(data){
                            s.userLog(monitor,{type:"Buffer Merge",msg:data.toString()})
                        })
                        merger.on('close',function(){
                            s.file('delete',allts)
                            copiedItems.forEach(function(copiedItem){
                                s.file('delete',copiedItem)
                            })
                            setTimeout(function(){
                                s.file('delete',mergedFilepath)
                            },1000 * 60 * 3)
                            delete(merger)
                            callback(mergedFilepath,mergedFile)
                        })
                    })
                }else{
                    //file exist
                    callback(mergedFilepath,mergedFile)
                }
            })
        }
        streamDirItems.forEach(function(filename){
            if(filename.indexOf('detectorStream') > -1 && filename.indexOf('.m3u8') === -1){
                items.push(filename)
            }
        })
        items.sort()
        items = items.slice(items.length - 5,items.length)
        items.forEach(function(filename){
            try{
                var tempFilename = filename.split('.')
                tempFilename[0] = tempFilename[0] + 'm'
                tempFilename = tempFilename.join('.')
                var tempWriteStream = fs.createWriteStream(pathDir+tempFilename)
                tempWriteStream.on('finish', function(){
                    copiedItems.push(pathDir+tempFilename)
                    if(copiedItems.length === items.length){
                        createMerged(copiedItems.sort())
                    }
                })
                fs.createReadStream(pathDir+filename).pipe(tempWriteStream)
            }catch(err){

            }
        })
        return items
    }

    s.cameraDestroy = function(x,e,p){
        if(s.group[e.ke]&&s.group[e.ke].mon[e.id]&&s.group[e.ke].mon[e.id].spawn !== undefined){
            if(s.group[e.ke].mon[e.id].spawn){
                s.group[e.ke].mon[e.id].allowStdinWrite = false
                s.txToDashcamUsers({
                    f : 'disable_stream',
                    ke : e.ke,
                    mid : e.id
                },e.ke)
                s.group[e.ke].mon[e.id].spawn.stdio[3].unpipe();
    //            if(s.group[e.ke].mon[e.id].p2pStream){s.group[e.ke].mon[e.id].p2pStream.unpipe();}
                if(s.group[e.ke].mon[e.id].p2p){s.group[e.ke].mon[e.id].p2p.unpipe();}
                delete(s.group[e.ke].mon[e.id].p2pStream)
                delete(s.group[e.ke].mon[e.id].p2p)
                delete(s.group[e.ke].mon[e.id].pamDiff)
                try{
                    s.group[e.ke].mon[e.id].spawn.removeListener('end',s.group[e.ke].mon[e.id].spawn_exit);
                    s.group[e.ke].mon[e.id].spawn.removeListener('exit',s.group[e.ke].mon[e.id].spawn_exit);
                    delete(s.group[e.ke].mon[e.id].spawn_exit);
                }catch(er){}
            }
            s.group[e.ke].mon[e.id].firstStreamChunk = {}
            clearTimeout(s.group[e.ke].mon[e.id].recordingChecker);
            delete(s.group[e.ke].mon[e.id].recordingChecker);
            clearTimeout(s.group[e.ke].mon[e.id].streamChecker);
            delete(s.group[e.ke].mon[e.id].streamChecker);
            clearTimeout(s.group[e.ke].mon[e.id].checkSnap);
            delete(s.group[e.ke].mon[e.id].checkSnap);
            clearTimeout(s.group[e.ke].mon[e.id].watchdog_stop);
            delete(s.group[e.ke].mon[e.id].watchdog_stop);
            delete(s.group[e.ke].mon[e.id].lastJpegDetectorFrame);
            clearTimeout(s.group[e.ke].mon[e.id].recordingSnapper);
            if(s.group[e.ke].mon[e.id].childNode){
                s.cx({f:'kill',d:s.cleanMonitorObject(e)},s.group[e.ke].mon[e.id].childNodeId)
            }else{
                if(!x||x===1){return};
                p=x.pid;
                if(s.group[e.ke].mon_conf[e.id].type===('dashcam'||'socket'||'jpeg'||'pipe')){
                    x.stdin.pause();setTimeout(function(){x.kill('SIGTERM');},500)
                }else{
                    try{
                        x.stdin.setEncoding('utf8');x.stdin.write('q');
                    }catch(er){}
                }
                setTimeout(function(){exec('kill -9 '+p,{detached: true})},1000)
            }
        }
    }
    s.cameraCheckDetails = function(e){
        if(e.details&&(e.details instanceof Object)===false){
            try{e.details=JSON.parse(e.details)}catch(err){}
        }
    }
    s.cameraControl = function(e,callback){
        s.cameraCheckDetails(e)
        if(!s.group[e.ke]||!s.group[e.ke].mon[e.id]){return}
        var monitorConfig = s.group[e.ke].mon_conf[e.id];
        if(monitorConfig.details.control!=="1"){s.userLog(e,{type:lang['Control Error'],msg:lang.ControlErrorText1});return}
        if(!monitorConfig.details.control_base_url||monitorConfig.details.control_base_url===''){
            e.base = s.buildMonitorUrl(monitorConfig, true);
        }else{
            e.base = monitorConfig.details.control_base_url;
        }
        if(!monitorConfig.details.control_url_stop_timeout || monitorConfig.details.control_url_stop_timeout === ''){
            monitorConfig.details.control_url_stop_timeout = 1000
        }
        if(!monitorConfig.details.control_url_method||monitorConfig.details.control_url_method===''){monitorConfig.details.control_url_method="GET"}
        var controlURL = e.base+monitorConfig.details['control_url_'+e.direction]
        var controlURLOptions = s.cameraControlOptionsFromUrl(controlURL,monitorConfig)
        if(monitorConfig.details.control_url_stop_timeout === '0' && monitorConfig.details.control_stop === '1' && s.group[e.ke].mon[e.id].ptzMoving === true){
            e.direction = 'stopMove'
            s.group[e.ke].mon[e.id].ptzMoving = false
        }else{
            s.group[e.ke].mon[e.id].ptzMoving = true
        }
        if(monitorConfig.details.control_url_method === 'ONVIF'){
            try{
                var move = function(device){
                    var stopOptions = {ProfileToken : device.current_profile.token,'PanTilt': true,'Zoom': true}
                    switch(e.direction){
                        case'center':
//                                device.services.ptz.gotoHomePosition()
                            msg = {type:'Center button inactive'}
                            s.userLog(e,msg)
                            callback(msg)
                        break;
                        case'stopMove':
                            msg = {type:'Control Trigger Ended'}
                            s.userLog(e,msg)
                            callback(msg)
                            device.services.ptz.stop(stopOptions).then((result) => {
//                                    console.log(JSON.stringify(result['data'], null, '  '));
                            }).catch((error) => {
//                                    console.error(error);
                            });
                        break;
                        default:
                            var controlOptions = {
                                ProfileToken : device.current_profile.token,
                                Velocity : {}
                            }
                            var onvifDirections = {
                                "left" : [-1.0,'x'],
                                "right" : [1.0,'x'],
                                "down" : [-1.0,'y'],
                                "up" : [1.0,'y'],
                                "zoom_in" : [1.0,'zoom'],
                                "zoom_out" : [-1.0,'zoom']
                            }
                            var direction = onvifDirections[e.direction]
                            controlOptions.Velocity[direction[1]] = direction[0];
                            (['x','y','z']).forEach(function(axis){
                                if(!controlOptions.Velocity[axis])
                                    controlOptions.Velocity[axis] = 0
                            })
                            if(monitorConfig.details.control_stop=='1'){
                                device.services.ptz.continuousMove(controlOptions).then(function(err){
                                    s.userLog(e,{type:'Control Trigger Started'});
                                    if(monitorConfig.details.control_url_stop_timeout !== '0'){
                                        setTimeout(function(){
                                            msg = {type:'Control Trigger Ended'}
                                            s.userLog(e,msg)
                                            callback(msg)
                                            device.services.ptz.stop(stopOptions).then((result) => {
//                                                    console.log(JSON.stringify(result['data'], null, '  '));
                                            }).catch((error) => {
                                                console.log(error);
                                            });
                                        },monitorConfig.details.control_url_stop_timeout)
                                    }
                                }).catch(function(err){
                                    console.log(err)
                                });
                            }else{
                                device.services.ptz.absoluteMove(controlOptions).then(function(err){
                                    msg = {type:'Control Triggered'}
                                    s.userLog(e,msg);
                                    callback(msg)
                                }).catch(function(err){
                                    console.log(err)
                                });
                            }
                        break;
                    }
                }
                //create onvif connection
                if(!s.group[e.ke].mon[e.id].onvifConnection){
                    s.group[e.ke].mon[e.id].onvifConnection = new onvif.OnvifDevice({
                        xaddr : 'http://' + controlURLOptions.host + ':' + controlURLOptions.port + '/onvif/device_service',
                        user : controlURLOptions.username,
                        pass : controlURLOptions.password
                    })
                    s.group[e.ke].mon[e.id].onvifConnection.init().then((info) => {
                        move(s.group[e.ke].mon[e.id].onvifConnection)
                    }).catch(function(error){
                        console.log(error)
                        s.userLog(e,{type:lang['Control Error'],msg:error})
                    })
                }else{
                    move(s.group[e.ke].mon[e.id].onvifConnection)
                }
            }catch(err){
                console.log(err)
                msg = {type:lang['Control Error'],msg:{msg:lang.ControlErrorText2,error:err,options:controlURLOptions,direction:e.direction}}
                s.userLog(e,msg)
                callback(msg)
            }
        }else{
            var stopCamera = function(){
                var stopURL = e.base+monitorConfig.details['control_url_'+e.direction+'_stop']
                var options = s.cameraControlOptionsFromUrl(stopURL,monitorConfig)
                var requestOptions = {
                    url : stopURL,
                    method : options.method,
                    auth : {
                        user : options.username,
                        pass : options.password
                    }
                }
                if(monitorConfig.details.control_digest_auth === '1'){
                    requestOptions.sendImmediately = true
                }
                request(requestOptions,function(err,data){
                    if(err){
                        msg = {ok:false,type:'Control Error',msg:err}
                    }else{
                        msg = {ok:true,type:'Control Trigger Ended'}
                    }
                    callback(msg)
                    s.userLog(e,msg);
                })
            }
            if(e.direction === 'stopMove'){
                stopCamera()
            }else{
                var requestOptions = {
                    url : controlURL,
                    method : controlURLOptions.method,
                    auth : {
                        user : controlURLOptions.username,
                        pass : controlURLOptions.password
                    }
                }
                if(monitorConfig.details.control_digest_auth === '1'){
                    requestOptions.sendImmediately = true
                }
                request(requestOptions,function(err,data){
                    if(err){
                        msg = {ok:false,type:'Control Error',msg:err};
                        callback(msg)
                        s.userLog(e,msg);
                        return
                    }
                    if(monitorConfig.details.control_stop=='1'&&e.direction!=='center'){
                        s.userLog(e,{type:'Control Triggered Started'});
                        if(monitorConfig.details.control_url_stop_timeout > 0){
                            setTimeout(function(){
                                stopCamera()
                            },monitorConfig.details.control_url_stop_timeout)
                        }
                    }else{
                        msg = {ok:true,type:'Control Triggered'};
                        callback(msg)
                        s.userLog(e,msg);
                    }
                })
            }
        }
    }
    s.cameraControlOptionsFromUrl = function(e,monitorConfig){
        s.cameraCheckDetails(e)
        URLobject = URL.parse(e)
        if(monitorConfig.details.control_url_method === 'ONVIF' && monitorConfig.details.control_base_url === ''){
            if(monitorConfig.details.onvif_port === ''){
                monitorConfig.details.onvif_port = 8000
            }
            URLobject.port = monitorConfig.details.onvif_port
        }else if(!URLobject.port){
            URLobject.port = 80
        }
        options = {
            host: URLobject.hostname,
            port: URLobject.port,
            method: monitorConfig.details.control_url_method,
            path: URLobject.pathname,
        };
        if(URLobject.query){
            options.path=options.path+'?'+URLobject.query
        }
        if(URLobject.username&&URLobject.password){
            options.username = URLobject.username
            options.password = URLobject.password
            options.auth=URLobject.username+':'+URLobject.password
        }else if(URLobject.auth){
            var auth = URLobject.auth.split(':')
            options.auth=URLobject.auth
            options.username = auth[0]
            options.password = auth[1]
        }
        return options
    }
    s.cameraSendSnapshot = function(e){
        s.cameraCheckDetails(e)
        if(config.doSnapshot===true){
            if(e.mon.mode!=='stop'){
                var pathDir = s.dir.streams+e.ke+'/'+e.mid+'/'
                if(fs.existsSync(pathDir+'s.jpg') === true){
                    fs.readFile(pathDir+'s.jpg',function(err,data){
                        if(err){s.tx({f:'monitor_snapshot',snapshot:e.mon.name,snapshot_format:'plc',mid:e.mid,ke:e.ke},'GRP_'+e.ke);return};
                        s.tx({f:'monitor_snapshot',snapshot:data,snapshot_format:'ab',mid:e.mid,ke:e.ke},'GRP_'+e.ke)
                    })
                }else{
                    e.url = s.buildMonitorUrl(e.mon)
                    switch(e.mon.type){
                        case'mjpeg':case'h264':case'local':
                            if(e.mon.type==='local'){e.url=e.mon.path;}
                             s.getRawSnapshotFromMonitor(e.mon,'-s 400x400',function(data){
                                 if((data[data.length-2] === 0xFF && data[data.length-1] === 0xD9)){
                                     s.tx({
                                         f:'monitor_snapshot',
                                         snapshot:data.toString('base64'),
                                         snapshot_format:'b64',
                                         mid:e.mid,
                                         ke:e.ke
                                     },'GRP_'+e.ke)
                                 }else{
                                     s.tx({f:'monitor_snapshot',snapshot:e.mon.name,snapshot_format:'plc',mid:e.mid,ke:e.ke},'GRP_'+e.ke)
                                }
                             })
                        break;
                        case'jpeg':
                            request({url:e.url,method:'GET',encoding:null},function(err,data){
                                if(err){s.tx({f:'monitor_snapshot',snapshot:e.mon.name,snapshot_format:'plc',mid:e.mid,ke:e.ke},'GRP_'+e.ke);return};
                                s.tx({f:'monitor_snapshot',snapshot:data.body,snapshot_format:'ab',mid:e.mid,ke:e.ke},'GRP_'+e.ke)
                            })
                        break;
                        default:
                            s.tx({f:'monitor_snapshot',snapshot:'...',snapshot_format:'plc',mid:e.mid,ke:e.ke},'GRP_'+e.ke)
                        break;
                    }
                }
            }else{
                s.tx({f:'monitor_snapshot',snapshot:'Disabled',snapshot_format:'plc',mid:e.mid,ke:e.ke},'GRP_'+e.ke)
            }
        }else{
            s.tx({f:'monitor_snapshot',snapshot:e.mon.name,snapshot_format:'plc',mid:e.mid,ke:e.ke},'GRP_'+e.ke)
        }
    }
    s.createCameraFolders = function(e){
        //set the recording directory
        if(e.details && e.details.dir && e.details.dir !== '' && config.childNodes.mode !== 'child'){
            //addStorage choice
            e.dir=s.checkCorrectPathEnding(e.details.dir)+e.ke+'/';
            if (!fs.existsSync(e.dir)){
                fs.mkdirSync(e.dir);
            }
            e.dir=e.dir+e.id+'/';
            if (!fs.existsSync(e.dir)){
                fs.mkdirSync(e.dir);
            }
        }else{
            //MAIN videos dir
            e.dir=s.dir.videos+e.ke+'/';
            if (!fs.existsSync(e.dir)){
                fs.mkdirSync(e.dir);
            }
            e.dir=s.dir.videos+e.ke+'/'+e.id+'/';
            if (!fs.existsSync(e.dir)){
                fs.mkdirSync(e.dir);
            }
        }
        //set the temporary files directory
        var setStreamDir = function(){
            //stream dir
            e.sdir=s.dir.streams+e.ke+'/';
            if (!fs.existsSync(e.sdir)){
                fs.mkdirSync(e.sdir);
            }
            e.sdir=s.dir.streams+e.ke+'/'+e.id+'/';
            if (!fs.existsSync(e.sdir)){
                fs.mkdirSync(e.sdir);
            }else{
                s.file('deleteFolder',e.sdir+'*')
            }
        }
        setStreamDir()
        return setStreamDir
    }
    s.stripAuthFromHost = function(e){
        var host = e.host.split('@');
        if(host[1]){
            //username and password found
            host = host[1]
        }else{
            //no username or password in `host` string
            host = host[0]
        }
        return host
    }
    s.resetRecordingCheck = function(e,launchMonitorProcesses){
        clearTimeout(s.group[e.ke].mon[e.id].recordingChecker)
        var cutoff = e.cutoff + 0
        if(e.type === 'dashcam'){
            cutoff *= 100
        }
        s.group[e.ke].mon[e.id].recordingChecker = setTimeout(function(){
            if(s.group[e.ke].mon[e.id].isStarted === true && s.group[e.ke].mon_conf[e.id].mode === 'record'){
                launchMonitorProcesses();
                s.sendMonitorStatus({id:e.id,ke:e.ke,status:lang.Restarting});
                s.userLog(e,{type:lang['Camera is not recording'],msg:{msg:lang['Restarting Process']}});
            }
        },60000 * cutoff * 1.1);
    }
    s.resetStreamCheck = function(e,launchMonitorProcesses){
        clearTimeout(s.group[e.ke].mon[e.id].streamChecker)
        s.group[e.ke].mon[e.id].streamChecker = setTimeout(function(){
            if(s.group[e.ke].mon[e.id].isStarted === true){
                launchMonitorProcesses();
                s.userLog(e,{type:lang['Camera is not streaming'],msg:{msg:lang['Restarting Process']}});
            }
        },60000*1);
    }
    s.cameraPullJpegStream = function(e){
        if(!e.details.sfps||e.details.sfps===''){
            e.details.sfps = 1
        }
        var capture_fps = parseFloat(e.details.sfps);
        if(isNaN(capture_fps)){capture_fps = 1}
        if(s.group[e.ke].mon[e.id].spawn){
            s.group[e.ke].mon[e.id].spawn.stdin.on('error',function(err){
                if(err&&e.details.loglevel!=='quiet'){
                    s.userLog(e,{type:'STDIN ERROR',msg:err});
                }
            })
        }else{
            if(x === 'record'){
                s.userLog(e,{type:lang.FFmpegCantStart,msg:lang.FFmpegCantStartText});
                return
            }
        }
        e.captureOne = function(f){
            s.group[e.ke].mon[e.id].recordingSnapRequest = request({
                url: e.url,
                method: 'GET',
                encoding: null,
                timeout: 15000
            },function(err,data){
                if(err){
                    return;
                }
            }).on('data',function(d){
                if(!e.buffer0){
                    e.buffer0 = [d]
                }else{
                    e.buffer0.push(d)
                }
                if((d[d.length-2] === 0xFF && d[d.length-1] === 0xD9)){
                    e.buffer0 = Buffer.concat(e.buffer0);
                  if(s.group[e.ke].mon[e.id].spawn&&s.group[e.ke].mon[e.id].spawn.stdin){
                      s.group[e.ke].mon[e.id].spawn.stdin.write(e.buffer0);
                  }
                  if(s.group[e.ke].mon[e.id].isStarted === true){
                      s.group[e.ke].mon[e.id].recordingSnapper = setTimeout(function(){
                          e.captureOne()
                      },1000/capture_fps)
                  }
                  e.buffer0 = null
                }
                if(!e.timeOut){
                    e.timeOut = setTimeout(function(){
                        e.errorCount = 0;
                        delete(e.timeOut)
                    },3000)
                }
            }).on('error', function(err){
                ++e.errorCount
                clearTimeout(e.timeOut)
                delete(e.timeOut)
                if(e.details.loglevel !== 'quiet'){
                    s.userLog(e,{
                        type: lang['JPEG Error'],
                        msg: {
                            msg: lang.JPEGErrorText,
                            info: err
                        }
                    });
                    switch(err.code){
                        case'ESOCKETTIMEDOUT':
                        case'ETIMEDOUT':
                            ++s.group[e.ke].mon[e.id].errorSocketTimeoutCount
                            if(
                                e.details.fatal_max !== 0 &&
                                s.group[e.ke].mon[e.id].errorSocketTimeoutCount > e.details.fatal_max
                            ){
                                s.userLog(e,{type:lang['Fatal Maximum Reached'],msg:{code:'ESOCKETTIMEDOUT',msg:lang.FatalMaximumReachedText}});
                                s.camera('stop',e)
                            }else{
                                s.userLog(e,{type:lang['Restarting Process'],msg:{code:'ESOCKETTIMEDOUT',msg:lang.FatalMaximumReachedText}});
                                s.camera('restart',e)
                            }
                            return;
                        break;
                    }
                }
                if(e.details.fatal_max !== 0 && e.errorCount > e.details.fatal_max){
                    clearTimeout(s.group[e.ke].mon[e.id].recordingSnapper)
                    launchMonitorProcesses()
                }
            })
        }
        e.captureOne()
    }
    s.createCameraFfmpegProcess = function(e){
        //launch ffmpeg (main)
        s.tx({f:'monitor_starting',mode:x,mid:e.id,time:s.formattedTime()},'GRP_'+e.ke);
        s.group[e.ke].mon[e.id].spawn = s.ffmpeg(e)
        s.sendMonitorStatus({id:e.id,ke:e.ke,status:e.wantedStatus});
        //on unexpected exit restart
        s.group[e.ke].mon[e.id].spawn_exit = function(){
            if(s.group[e.ke].mon[e.id].isStarted === true){
                if(e.details.loglevel!=='quiet'){
                    s.userLog(e,{type:lang['Process Unexpected Exit'],msg:{msg:lang['Process Crashed for Monitor'],cmd:s.group[e.ke].mon[e.id].ffmpeg}});
                }
                errorFatal('Process Unexpected Exit');
            }
        }
        s.group[e.ke].mon[e.id].spawn.on('end',s.group[e.ke].mon[e.id].spawn_exit)
        s.group[e.ke].mon[e.id].spawn.on('exit',s.group[e.ke].mon[e.id].spawn_exit)
        s.group[e.ke].mon[e.id].spawn.on('error',function(er){
            s.userLog(e,{type:'Spawn Error',msg:er});errorFatal('Spawn Error')
        })
        s.userLog(e,{type:lang['Process Started'],msg:{cmd:s.group[e.ke].mon[e.id].ffmpeg}});
    }
    s.createCameraStreamHandlers = function(e,launchMonitorProcesses){
        s.group[e.ke].mon[e.id].spawn.stdio[5].on('data',function(data){
            s.resetStreamCheck(e,launchMonitorProcesses)
        })
        //emitter for mjpeg
        if(!e.details.stream_mjpeg_clients||e.details.stream_mjpeg_clients===''||isNaN(e.details.stream_mjpeg_clients)===false){e.details.stream_mjpeg_clients=20;}else{e.details.stream_mjpeg_clients=parseInt(e.details.stream_mjpeg_clients)}
        s.group[e.ke].mon[e.id].emitter = new events.EventEmitter().setMaxListeners(e.details.stream_mjpeg_clients);
        if(e.type==='jpeg'){
            s.cameraPullJpegStream(e)
        }
        if(e.details.detector === '1'){
            s.ocvTx({f:'init_monitor',id:e.id,ke:e.ke})
            //frames from motion detect
            if(e.details.detector_pam === '1'){
               s.createPamDiffEngine(e)
               s.group[e.ke].mon[e.id].spawn.stdio[3].pipe(s.group[e.ke].mon[e.id].p2p).pipe(s.group[e.ke].mon[e.id].pamDiff)
                if(e.details.detector_use_detect_object === '1'){
                    s.group[e.ke].mon[e.id].spawn.stdio[4].on('data',function(d){
                        s.group[e.ke].mon[e.id].lastJpegDetectorFrame = d
                    })
                }
            }else{
                s.group[e.ke].mon[e.id].spawn.stdio[3].on('data',function(d){
                    s.ocvTx({f:'frame',mon:s.group[e.ke].mon_conf[e.id].details,ke:e.ke,id:e.id,time:s.formattedTime(),frame:d});
                })
            }
        }
        //frames to stream
       switch(e.details.stream_type){
           case'mp4':
               s.group[e.ke].mon[e.id].mp4frag['MAIN'] = new Mp4Frag();
               s.group[e.ke].mon[e.id].mp4frag['MAIN'].on('error',function(error){
                   s.userLog(e,{type:lang['Mp4Frag'],msg:{error:error}})
               })
               s.group[e.ke].mon[e.id].spawn.stdio[1].pipe(s.group[e.ke].mon[e.id].mp4frag['MAIN'])
           break;
           case'flv':
               e.frameToStream = function(d){
                   if(!s.group[e.ke].mon[e.id].firstStreamChunk['MAIN'])s.group[e.ke].mon[e.id].firstStreamChunk['MAIN'] = d;
                   e.frameToStream = function(d){
                       s.resetStreamCheck(e,launchMonitorProcesses)
                       s.group[e.ke].mon[e.id].emitter.emit('data',d)
                   }
                   e.frameToStream(d)
               }
           break;
           case'mjpeg':
               e.frameToStream = function(d){
                   s.resetStreamCheck(e,launchMonitorProcesses)
                   s.group[e.ke].mon[e.id].emitter.emit('data',d)
               }
           break;
           case'h265':
               e.frameToStream = function(d){
                   s.resetStreamCheck(e,launchMonitorProcesses)
                   s.group[e.ke].mon[e.id].emitter.emit('data',d)
               }
           break;
           case'b64':case undefined:case null:case'':
               var buffer
               e.frameToStream = function(d){
                  s.resetStreamCheck(e,launchMonitorProcesses)
                  if(!buffer){
                      buffer=[d]
                  }else{
                      buffer.push(d)
                  }
                  if((d[d.length-2] === 0xFF && d[d.length-1] === 0xD9)){
                      s.group[e.ke].mon[e.id].emitter.emit('data',Buffer.concat(buffer))
                      buffer = null
                  }
               }
           break;
        }
        if(e.frameToStream){
            s.group[e.ke].mon[e.id].spawn.stdout.on('data',e.frameToStream)
        }
        if(e.details.stream_channels && e.details.stream_channels !== ''){
            var createStreamEmitter = function(channel,number){
                var pipeNumber = number+config.pipeAddition;
                if(!s.group[e.ke].mon[e.id].emitterChannel[pipeNumber]){
                    s.group[e.ke].mon[e.id].emitterChannel[pipeNumber] = new events.EventEmitter().setMaxListeners(0);
                }
               var frameToStream
               switch(channel.stream_type){
                   case'mp4':
                       s.group[e.ke].mon[e.id].mp4frag[pipeNumber] = new Mp4Frag();
                       s.group[e.ke].mon[e.id].spawn.stdio[pipeNumber].pipe(s.group[e.ke].mon[e.id].mp4frag[pipeNumber])
                   break;
                   case'mjpeg':
                       frameToStream = function(d){
                           s.group[e.ke].mon[e.id].emitterChannel[pipeNumber].emit('data',d)
                       }
                   break;
                   case'flv':
                       frameToStream = function(d){
                           if(!s.group[e.ke].mon[e.id].firstStreamChunk[pipeNumber])s.group[e.ke].mon[e.id].firstStreamChunk[pipeNumber] = d;
                           frameToStream = function(d){
                               s.group[e.ke].mon[e.id].emitterChannel[pipeNumber].emit('data',d)
                           }
                           frameToStream(d)
                       }
                   break;
                   case'h264':
                       frameToStream = function(d){
                           s.group[e.ke].mon[e.id].emitterChannel[pipeNumber].emit('data',d)
                       }
                   break;
                }
                if(frameToStream){
                    s.group[e.ke].mon[e.id].spawn.stdio[pipeNumber].on('data',frameToStream)
                }
            }
            e.details.stream_channels.forEach(createStreamEmitter)
        }
    }
    s.cameraFilterFfmpegLog = function(e,launchMonitorProcesses){
        var checkLog = function(d,x){return d.indexOf(x)>-1}
        s.group[e.ke].mon[e.id].spawn.stderr.on('data',function(d){
            d=d.toString();
            switch(true){
                case checkLog(d,'[hls @'):
                case checkLog(d,'Past duration'):
                case checkLog(d,'Last message repeated'):
                case checkLog(d,'pkt->duration = 0'):
                case checkLog(d,'Non-monotonous DTS'):
                case checkLog(d,'NULL @'):
                case checkLog(d,'RTP: missed'):
                case checkLog(d,'deprecated pixel format used'):
                    return
                break;
                case checkLog(d,'Could not find tag for vp8'):
                case checkLog(d,'Only VP8 or VP9 Video'):
                case checkLog(d,'Could not write header'):
                    return s.userLog(e,{type:lang['Incorrect Settings Chosen'],msg:{msg:d}})
                break;
                case checkLog(d,'Connection refused'):
                case checkLog(d,'Connection timed out'):
                    //restart
                    setTimeout(function(){
                        s.userLog(e,{type:lang['Connection timed out'],msg:lang['Retrying...']});
                        errorFatal('Connection timed out');
                    },1000)
                break;
                case checkLog(d,'Immediate exit requested'):
                case checkLog(d,'mjpeg_decode_dc'):
                case checkLog(d,'bad vlc'):
                case checkLog(d,'error dc'):
                    launchMonitorProcesses()
                break;
                case /T[0-9][0-9]-[0-9][0-9]-[0-9][0-9]./.test(d):
                    var filename = d.split('.')[0]+'.'+e.ext
                    s.insertCompletedVideo(e,{
                        file : filename
                    },function(err){
                        s.userLog(e,{type:lang['Video Finished'],msg:{filename:d}})
                        if(
                            e.details.detector === '1' &&
                            s.group[e.ke].mon[e.id].isStarted === true &&
                            e.details &&
                            e.details.detector_record_method === 'del'&&
                            e.details.detector_delete_motionless_videos === '1'&&
                            s.group[e.ke].mon[e.id].detector_motion_count === 0
                        ){
                            if(e.details.loglevel !== 'quiet'){
                                s.userLog(e,{type:lang['Delete Motionless Video'],msg:filename})
                            }
                            s.deleteVideo({
                                filename : filename,
                                ke : e.ke,
                                id : e.id
                            })
                        }
                        s.group[e.ke].mon[e.id].detector_motion_count = 0
                    })
                    s.resetRecordingCheck(e,launchMonitorProcesses)
                    return;
                break;
            }
            s.userLog(e,{type:"FFMPEG STDERR",msg:d})
        })
    }
    s.camera = function(x,e,cn,tx){
        var ee = s.cleanMonitorObject(e);
        if(!e){e={}};
        if(cn&&cn.ke&&!e.ke){e.ke=cn.ke};
        if(!e.mode){e.mode=x;}
        if(!e.id&&e.mid){e.id=e.mid}
        s.cameraCheckDetails(e);
        //parse Objects
        (['detector_cascades','cords','detector_filters','input_map_choices']).forEach(function(v){
            if(e.details&&e.details[v]&&(e.details[v] instanceof Object)===false){
                try{
                    if(e.details[v] === '') e.details[v] = '{}'
                    e.details[v]=JSON.parse(e.details[v]);
                    if(!e.details[v])e.details[v]={};
                    s.group[e.ke].mon[e.id].details = e.details;
                }catch(err){

                }
            }
        });
        //parse Arrays
        (['stream_channels','input_maps']).forEach(function(v){
            if(e.details&&e.details[v]&&(e.details[v] instanceof Array)===false){
                try{
                    e.details[v]=JSON.parse(e.details[v]);
                    if(!e.details[v])e.details[v]=[];
                }catch(err){
                    e.details[v]=[];
                }
            }
        });
        s.initiateMonitorObject({ke:e.ke,mid:e.id})
        switch(x){
            case'watch_on'://live streamers - join
               if(!cn.monitor_watching){cn.monitor_watching={}}
               if(!cn.monitor_watching[e.id]){cn.monitor_watching[e.id]={ke:e.ke}}
               s.group[e.ke].mon[e.id].watch[cn.id]={};
            break;
            case'watch_off'://live streamers - leave
               if(cn.monitor_watching){delete(cn.monitor_watching[e.id])}
                if(s.group[e.ke].mon[e.id]&&s.group[e.ke].mon[e.id].watch){
                    delete(s.group[e.ke].mon[e.id].watch[cn.id]),e.ob=Object.keys(s.group[e.ke].mon[e.id].watch).length
                    if(e.ob===0){
                       delete(s.group[e.ke].mon[e.id].watch)
                    }
                }else{
                    e.ob=0;
                }
                if(tx){tx({f:'monitor_watch_off',ke:e.ke,id:e.id,cnid:cn.id})};
                s.tx({viewers:e.ob,ke:e.ke,id:e.id},'MON_'+e.id);
            break;
            case'restart'://restart monitor
                s.sendMonitorStatus({id:e.id,ke:e.ke,status:'Restarting'});
                s.camera('stop',e)
                setTimeout(function(){
                    s.camera(e.mode,e)
                },1300)
            break;
            case'idle':case'stop'://stop monitor
                if(!s.group[e.ke]||!s.group[e.ke].mon[e.id]){return}
                if(config.childNodes.enabled === true && config.childNodes.mode === 'master' && s.group[e.ke].mon[e.id].childNode && s.childNodes[s.group[e.ke].mon[e.id].childNode].activeCameras[e.ke+e.id]){
                    s.group[e.ke].mon[e.id].isStarted = false
                    s.cx({
                        //function
                        f : 'cameraStop',
                        //data, options
                        d : s.group[e.ke].mon_conf[e.id]
                    },s.group[e.ke].mon[e.id].childNodeId)
                    s.cx({f:'sync',sync:s.group[e.ke].mon_conf[e.id],ke:e.ke,mid:e.id},s.group[e.ke].mon[e.id].childNodeId);
                }else{
                    if(s.group[e.ke].mon[e.id].eventBasedRecording.process){
                        clearTimeout(s.group[e.ke].mon[e.id].eventBasedRecording.timeout)
                        s.group[e.ke].mon[e.id].eventBasedRecording.allowEnd=true;
                        s.group[e.ke].mon[e.id].eventBasedRecording.process.kill('SIGTERM');
                    }
                    if(s.group[e.ke].mon[e.id].fswatch){s.group[e.ke].mon[e.id].fswatch.close();delete(s.group[e.ke].mon[e.id].fswatch)}
                    if(s.group[e.ke].mon[e.id].fswatchStream){s.group[e.ke].mon[e.id].fswatchStream.close();delete(s.group[e.ke].mon[e.id].fswatchStream)}
                    if(s.group[e.ke].mon[e.id].last_frame){delete(s.group[e.ke].mon[e.id].last_frame)}
                    if(s.group[e.ke].mon[e.id].isStarted !== true){return}
                    s.cameraDestroy(s.group[e.ke].mon[e.id].spawn,e)
                    if(e.neglectTriggerTimer===1){
                        delete(e.neglectTriggerTimer);
                    }else{
                        clearTimeout(s.group[e.ke].mon[e.id].trigger_timer)
                        delete(s.group[e.ke].mon[e.id].trigger_timer)
                    }
                    clearInterval(s.group[e.ke].mon[e.id].running);
                    clearInterval(s.group[e.ke].mon[e.id].detector_notrigger_timeout)
                    clearTimeout(s.group[e.ke].mon[e.id].err_fatal_timeout);
                    s.group[e.ke].mon[e.id].isStarted = false
                    s.group[e.ke].mon[e.id].isRecording = false
                    s.tx({f:'monitor_stopping',mid:e.id,ke:e.ke,time:s.formattedTime()},'GRP_'+e.ke);
                    s.cameraSendSnapshot({mid:e.id,ke:e.ke,mon:e})
                    if(x==='stop'){
                        s.userLog(e,{type:lang['Monitor Stopped'],msg:lang.MonitorStoppedText});
                        clearTimeout(s.group[e.ke].mon[e.id].delete)
                        if(e.delete===1){
                            s.group[e.ke].mon[e.id].delete=setTimeout(function(){
                                delete(s.group[e.ke].mon[e.id]);
                                delete(s.group[e.ke].mon_conf[e.id]);
                            },1000*60);
                        }
                    }else{
                        s.tx({f:'monitor_idle',mid:e.id,ke:e.ke,time:s.formattedTime()},'GRP_'+e.ke);
                        s.userLog(e,{type:lang['Monitor Idling'],msg:lang.MonitorIdlingText});
                    }
                }
                var wantedStatus = lang.Stopped
                if(x==='idle'){
                    var wantedStatus = lang.Idle
                }
                s.sendMonitorStatus({id:e.id,ke:e.ke,status:wantedStatus})
            break;
            case'start':case'record'://watch or record monitor url
                s.initiateMonitorObject({ke:e.ke,mid:e.id})
                if(!s.group[e.ke].mon_conf[e.id]){s.group[e.ke].mon_conf[e.id]=s.cleanMonitorObject(e);}
                e.url = s.buildMonitorUrl(e);
                if(s.group[e.ke].mon[e.id].isStarted === true){
                    //stop action, monitor already started or recording
                    return
                }
                //lock this function
                s.sendMonitorStatus({id:e.id,ke:e.ke,status:lang.Starting});
                s.group[e.ke].mon[e.id].isStarted = true
                //create host string without username and password
                var strippedHost = s.stripAuthFromHost(e)
                //set recording status
                e.wantedStatus = lang.Watching
                if(x==='record'){
                    e.wantedStatus = lang.Recording
                    s.group[e.ke].mon[e.id].isRecording = true
                }else{
                    s.group[e.ke].mon[e.mid].isRecording = false
                }
                var setStreamDir = s.createCameraFolders(e)
                //set up fatal error handler
                if(e.details.fatal_max===''){
                    e.details.fatal_max = 10
                }else{
                    e.details.fatal_max = parseFloat(e.details.fatal_max)
                }
                var errorFatal = function(errorMessage){
                    s.debugLog(errorMessage)
                    clearTimeout(s.group[e.ke].mon[e.id].err_fatal_timeout);
                    ++errorFatalCount;
                    if(s.group[e.ke].mon[e.id].isStarted === true){
                        s.group[e.ke].mon[e.id].err_fatal_timeout=setTimeout(function(){
                            if(e.details.fatal_max!==0&&errorFatalCount>e.details.fatal_max){
                                s.camera('stop',{id:e.id,ke:e.ke})
                            }else{
                                launchMonitorProcesses()
                            };
                        },5000);
                    }else{
                        s.cameraDestroy(s.group[e.ke].mon[e.id].spawn,e)
                    }
                    s.sendMonitorStatus({id:e.id,ke:e.ke,status:lang.Died});
                }
                var errorFatalCount = 0;
                //cutoff time and recording check interval
                if(!e.details.cutoff||e.details.cutoff===''){e.cutoff=15}else{e.cutoff=parseFloat(e.details.cutoff)};
                if(isNaN(e.cutoff)===true){e.cutoff=15}
                //set master based process launcher
                var launchMonitorProcesses = function(){
                    s.group[e.ke].mon[e.id].allowStdinWrite = false
                    s.txToDashcamUsers({
                        f : 'disable_stream',
                        ke : e.ke,
                        mid : e.id
                    },e.ke)
                    if(e.details.detector_trigger === '1'){
                        s.group[e.ke].mon[e.id].motion_lock=setTimeout(function(){
                            clearTimeout(s.group[e.ke].mon[e.id].motion_lock);
                            delete(s.group[e.ke].mon[e.id].motion_lock);
                        },15000)
                    }
                    //start "no motion" checker
                    if(e.details.detector === '1' && e.details.detector_notrigger === '1'){
                        if(!e.details.detector_notrigger_timeout || e.details.detector_notrigger_timeout === ''){
                            e.details.detector_notrigger_timeout = 10
                        }
                        e.detector_notrigger_timeout = parseFloat(e.details.detector_notrigger_timeout)*1000*60;
                        s.group[e.ke].mon[e.id].detector_notrigger_timeout_function = function(){
                            s.onDetectorNoTriggerTimeoutExtensions.forEach(function(extender){
                                extender(r,e)
                            })
                        }
                        clearInterval(s.group[e.ke].mon[e.id].detector_notrigger_timeout)
                        s.group[e.ke].mon[e.id].detector_notrigger_timeout=setInterval(s.group[e.ke].mon[e.id].detector_notrigger_timeout_function,s.group[e.ke].mon[e.id].detector_notrigger_timeout)
                    }
                    if(e.details.snap === '1'){
                        var resetSnapCheck = function(){
                            clearTimeout(s.group[e.ke].mon[e.id].checkSnap)
                            s.group[e.ke].mon[e.id].checkSnap = setTimeout(function(){
                                if(s.group[e.ke].mon[e.id].isStarted === true){
                                    fs.stat(e.sdir+'s.jpg',function(err,snap){
                                        var notStreaming = function(){
                                            launchMonitorProcesses()
                                            s.userLog(e,{type:lang['Camera is not streaming'],msg:{msg:lang['Restarting Process']}});
                                        }
                                        if(err){
                                            notStreaming()
                                        }else{
                                            if(!e.checkSnapTime)e.checkSnapTime = snap.mtime
                                            if(err || e.checkSnapTime === snap.mtime){
                                                e.checkSnapTime = snap.mtime
                                                notStreaming()
                                            }else{
                                                resetSnapCheck()
                                            }
                                        }
                                    })
                                }
                            },60000*1);
                        }
                        resetSnapCheck()
                    }
                    if(config.childNodes.mode !== 'child' && s.platform!=='darwin' && (x==='record' || (x==='start'&&e.details.detector_record_method==='sip'))){
                        //check if ffmpeg is recording
                        s.group[e.ke].mon[e.id].fswatch = fs.watch(e.dir, {encoding : 'utf8'}, (event, filename) => {
                            switch(event){
                                case'rename':
                                    s.group[e.ke].mon[e.id].open = filename.split('.')[0]
                                break;
                                case'change':
                                    s.resetRecordingCheck(e,launchMonitorProcesses)
                                break;
                            }
                        });
                    }
                    if(
                        //is MacOS
                        s.platform !== 'darwin' &&
                        //is Watch-Only or Record
                        (x === 'start' || x === 'record') &&
                        //if JPEG API enabled or Stream Type is HLS
                        (
                            e.details.stream_type === 'jpeg' ||
                            e.details.stream_type === 'hls' ||
                            e.details.snap === '1'
                        )
                    ){
                        s.group[e.ke].mon[e.id].fswatchStream = fs.watch(e.sdir, {encoding : 'utf8'}, () => {
                            s.resetStreamCheck(e,launchMonitorProcesses)
                        })
                    }
                    s.cameraSendSnapshot({mid:e.id,ke:e.ke,mon:e})
                    //check host to see if has password and user in it
                    setStreamDir()
                    clearTimeout(s.group[e.ke].mon[e.id].recordingChecker)
                    if(s.group[e.ke].mon[e.id].isStarted === true){
                        e.errorCount = 0;
                        s.group[e.ke].mon[e.id].errorSocketTimeoutCount = 0;
                        s.cameraDestroy(s.group[e.ke].mon[e.id].spawn,e)
                        startVideoProcessor = function(err,o){
                            if(o.success === true){
                                s.group[e.ke].mon[e.id].isRecording = true
                                s.createCameraFfmpegProcess(e)
                                s.createCameraStreamHandlers(e,launchMonitorProcesses)
                                if(e.type === 'dashcam'){
                                    setTimeout(function(){
                                        s.group[e.ke].mon[e.id].allowStdinWrite = true
                                        s.txToDashcamUsers({
                                            f : 'enable_stream',
                                            ke : e.ke,
                                            mid : e.id
                                        },e.ke)
                                    },30000)
                                }
                                if(
                                    x === 'record' ||
                                    e.type === 'mjpeg' ||
                                    e.type === 'h264' ||
                                    e.type === 'local'
                                ){
                                    s.cameraFilterFfmpegLog(e,launchMonitorProcesses)
                                }
                              }else{
                                  s.userLog(e,{type:lang["Ping Failed"],msg:lang.skipPingText1});
                                  errorFatal("Ping Failed");return;
                            }
                        }
                        if(
                            e.type !== 'socket' &&
                            e.type !== 'dashcam' &&
                            e.protocol !== 'udp' &&
                            e.type !== 'local' &&
                            e.details.skip_ping !== '1'
                        ){
                            connectionTester.test(strippedHost,e.port,2000,startVideoProcessor);
                        }else{
                            startVideoProcessor(null,{success:true})
                        }
                    }else{
                        s.cameraDestroy(s.group[e.ke].mon[e.id].spawn,e)
                    }
                }
                //start drawing files
                delete(s.group[e.ke].mon[e.id].childNode)
                if(config.childNodes.enabled === true && config.childNodes.mode === 'master'){
                    var childNodeList = Object.keys(s.childNodes)
                    if(childNodeList.length > 0){
                        e.childNodeFound = false
                        launchMonitorProcesses = function(){
                            startVideoProcessor = function(){
                                s.cx({
                                    //function
                                    f : 'cameraStart',
                                    //mode
                                    mode : x,
                                    //data, options
                                    d : s.group[e.ke].mon_conf[e.id]
                                },s.group[e.ke].mon[e.id].childNodeId)
                            }
                            if(
                                e.type !== 'socket' &&
                                e.type !== 'dashcam' &&
                                e.protocol !== 'udp' &&
                                e.type !== 'local' &&
                                e.details.skip_ping !== '1'
                            ){
                                connectionTester.test(strippedHost,e.port,2000,function(err,o){
                                    if(o.success === true){
                                        startVideoProcessor()
                                    }else{
                                        s.userLog(e,{type:lang["Ping Failed"],msg:lang.skipPingText1});
                                        errorFatal("Ping Failed");return;
                                    }
                                })
                            }else{
                                startVideoProcessor()
                            }
                        }
                        childNodeList.forEach(function(ip){
                            if(e.childNodeFound === false && s.childNodes[ip].cpu < 80){
                                e.childNodeFound = true
                                s.childNodes[ip].activeCameras[e.ke+e.id] = s.cleanMonitorObject(s.group[e.ke].mon_conf[e.id]);
                                s.group[e.ke].mon[e.id].childNode = ip
                                s.group[e.ke].mon[e.id].childNodeId = s.childNodes[ip].cnid;
                                s.cx({f:'sync',sync:s.group[e.ke].mon_conf[e.id],ke:e.ke,mid:e.id},s.group[e.ke].mon[e.id].childNodeId);
                                launchMonitorProcesses();
                            }
                        })
                    }else{
                        launchMonitorProcesses();
                    }
                }else{
                    launchMonitorProcesses();
                }
            break;
            default:
                console.log(x)
            break;
        }
        if(typeof cn==='function'){setTimeout(function(){cn()},1000);}
    }
}
