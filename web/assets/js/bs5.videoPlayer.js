$(document).ready(function(){
    var theBlock = $('#tab-videoPlayer')
    window.createVideoPlayerTab = function(video){
        var newTabId = `videoPlayer-${video.mid}-${moment(video.time).format('YYYY-MM-DD-HH-mm-ss')}`
        var humanStartTime = formattedTime(video.time,true)
        var humanEndTime = formattedTime(video.end,true)
        var tabLabel = `<b>${lang['Video']}</b> : ${loadedMonitors[video.mid].name} : ${formattedTime(video.time,true)}`
        var videoUrl = getLocation() + video.href
        var hasRows = video.events && video.events.length > 0
        var loadedEvents = {}
        var eventMatrixHtml = ``
        if(hasRows){
            var objectsFound = {}
            eventMatrixHtml += `<div class="border-top-dotted border-top-dark pt-2 mt-2"><h3>${lang.Events}</h3></div>`
            $.each(video.events,function(n,theEvent){
                loadedEvents[new Date(theEvent.time)] = theEvent
                var objectsFound = {}
                eventMatrixHtml += `<div class="d-block tab-videoPlayer-event-row card bg-darker mb-1 p-2" time-index="${theEvent.time}">`
                eventMatrixHtml += `<div class="d-block">
                    <div class="d-block">${formattedTime(theEvent.time)}</div>
                </div>`
                $.each(theEvent.details.matrices,function(n,matrix){
                    if(!objectsFound[matrix.tag])objectsFound[matrix.tag] = 1
                    ++objectsFound[matrix.tag]
                })
                $.each(objectsFound,function(tag,count){
                    eventMatrixHtml += `<div class="d-block">
                        <div class="d-block" style="text-transform: capitalize">${tag} : ${count}</div>
                    </div>`
                })
                eventMatrixHtml += `</div>`
            })
            eventMatrixHtml += `</div>`
        }
        var baseHtml = `<main class="container page-tab tab-videoPlayer" id="tab-${newTabId}" video-id="${video.mid}${video.time}">
            <div class="my-3 bg-dark text-white rounded shadow-sm">
                <div class="p-3">
                    <h6 class="video-title border-bottom-dotted border-bottom-dark pb-2 mb-0">${tabLabel}</h6>
                  </div>
                  <div style="position: relative">
                      <div class="tab-videoPlayer-event-objects" style="position: absolute;width: 100%; height: 100%; z-index: 10"></div>
                      <video class="tab-videoPlayer-video-element" controls autoplay src="${videoUrl}"></video>
                  </div>
                  <div class="p-3">
                      <div class="d-block">
                            <a class="btn btn-sm btn-success" download href="${videoUrl}"><i class="fa fa-download"></i> ${lang.Download}</a>
                      </div>
                      <div class="d-block">
                          <b class="flex-grow-1">${lang.Started}</b>
                          <div class="video-time">${humanStartTime}</div>
                      </div>
                      <div class="d-block">
                          <b class="flex-grow-1">${lang.Ended}</b>
                          <div class="video-end">${humanEndTime}</div>
                      </div>
                      <div class="d-block">
                          ${eventMatrixHtml}
                      </div>
                      <small class="d-block text-end mt-3">
                        <a class="go-back btn badge" href="#">${lang['Back']}</a>
                      </small>
                </div>
            </div>
        </main>`
        var tabCreateResponse = createNewTab(newTabId,tabLabel,baseHtml,{},null,'videoPlayer')
        console.log(tabCreateResponse)
        if(!tabCreateResponse.existAlready){
            var videoElement = tabCreateResponse.theTab.find('.tab-videoPlayer-video-element')[0]
            var videoObjectContainer = tabCreateResponse.theTab.find('.tab-videoPlayer-event-objects')
            var videoHeight = videoObjectContainer.height()
            var videoWidth = videoObjectContainer.width()
            videoElement.ontimeupdate = function(time){
                var eventTime = new Date(((new Date(video.time).getTime() / 1000) + videoElement.currentTime) * 1000)
                var theEvent = loadedEvents[eventTime]
                if(theEvent){
                    drawMatrices(theEvent,{
                        theContainer: videoObjectContainer,
                        height: videoHeight,
                        width: videoWidth,
                    })
                }else{
                    videoObjectContainer.find('.stream-detected-object').remove()
                }
            }
        }
    }
    window.closeVideoPlayer = function(tabId){
        console.log('closeVideoPlayer')
        try{
            var videoElement = $(`#tab-${tabId}`).find('video')[0]
            if(!videoElement.paused)videoElement.pause();
            videoElement.removeAttribute('src');
            videoElement.load();
        }catch(err){
            console.log(err)
        }
    }
    window.pauseVideoPlayer = function(tabId){
        console.log('pauseVideoPlayer')
        try{
            var videoElement = $(`#tab-${tabId}`).find('video')[0]
            try{
                videoElement.pause();
            }catch(err){

            }
        }catch(err){
            console.log(err)
        }
    }
    window.resumeVideoPlayer = function(tabId){
        console.log('resumeVideoPlayer')
        try{
            var videoElement = $(`#tab-${tabId}`).find('video')[0]
            try{
                videoElement.play();
            }catch(err){

            }
        }catch(err){
            console.log(err)
        }
    }
    function drawVideoInfoCard(){

    }
    function drawVideoEventsList(){

    }
    $('body')
    .on('tab-open-videoPlayer',function(){
        if(pageLoadingData && pageLoadingData.title){
            theBlock.find('.video-title').html(pageLoadingData.title)
            theBlock.find('.video-time').html(formattedTime(pageLoadingData.time,true))
            theBlock.find('.video-end').html(formattedTime(pageLoadingData.end,true))
        }
    })
    .on('click','.tab-videoPlayer-event-row',function(){
        var el = $(this)
        var parent = el.parents('main')
        var videoEl = parent.find('video')
        var videoData = loadedVideosInMemory[parent.attr('video-id')]
        var videoTime = new Date(videoData.time).getTime() / 1000
        var timeIndex = new Date(el.attr('time-index')).getTime() / 1000
        var newVideoTimeIndex = timeIndex - videoTime
        console.log(newVideoTimeIndex)
        videoEl[0].currentTime = newVideoTimeIndex
    })
})