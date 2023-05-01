var liveGridCycleTimer = null;
var cycleOnLiveGridOptionsBefore = null;
var cycleOnLiveGridOptions = null;
var cycleOnLiveGridMoveNext = function(){}
var cycleOnLiveGridMovePrev = function(){}
var cycleOnLiveGridFullList = null
var cycleOnLiveGridCurrentPart = null
function getListOfMonitorsToCycleOnLiveGrid(chosenTags,useMonitorIds){
    var monitors = []
    if(useMonitorIds){
        monitors = getMonitorsFromIds(chosenTags)
    }else if(chosenTags){
        var tags = sanitizeTagList(chosenTags)
        monitors = getMonitorsFromTags(tags)
    }else{
        monitors = getRunningMonitors(true)
    }
    return monitors;
}
function getPartForCycleOnLiveGrid(fullList, afterMonitorId, numberOfMonitors) {
    const startIndex = afterMonitorId ? fullList.findIndex(monitor => monitor.mid === afterMonitorId) : -1;
    const result = [];
    for (let i = 1; i <= numberOfMonitors; i++) {
        const index = (startIndex + i) % fullList.length;
        result.push(fullList[index]);
    }
    return result;
}
function displayCycleSetOnLiveGrid(monitorsList){
    cycleOnLiveGridCurrentPart = [].concat(monitorsList)
    closeAllLiveGridPlayers()
    monitorsWatchOnLiveGrid(monitorsList.map(monitor => monitor.mid))
}
// rotator
function stopCycleOnLiveGrid(){
    console.error('STOP!!!!!',new Error)
    clearTimeout(liveGridCycleTimer)
    liveGridCycleTimer = null
}
function resumeCycleOnLiveGrid(fullList,partForCycle,numberOfMonitors){
    console.error('RESUME!!!!!',new Error)
    function next(){
        var afterMonitorId = partForCycle.slice(-1)[0].mid;
        partForCycle = getPartForCycleOnLiveGrid(fullList,afterMonitorId,numberOfMonitors)
        displayCycleSetOnLiveGrid(partForCycle)
        reset()
    }
    function prev(){
        var firstInPart = partForCycle[0].mid;
        var firstPartIndex = fullList.findIndex(monitor => monitor.mid === firstInPart)
        var backedToIndex = (firstPartIndex - (numberOfMonitors + 1) + fullList.length) % fullList.length;
        var beforeMonitorId = fullList[backedToIndex].mid
        partForCycle = getPartForCycleOnLiveGrid(fullList,beforeMonitorId,numberOfMonitors, true)
        displayCycleSetOnLiveGrid(partForCycle)
        reset()
    }
    function reset(){
        clearTimeout(liveGridCycleTimer)
        liveGridCycleTimer = setTimeout(function(){
            next()
        },30000)
    }
    reset()
    cycleOnLiveGridMoveNext = next
    cycleOnLiveGridMovePrev = prev
}
function beginCycleOnLiveGrid({
    chosenTags,
    useMonitorIds,
    numberOfMonitors,
    monitorHeight,
}){
    var fullList = getListOfMonitorsToCycleOnLiveGrid(chosenTags,useMonitorIds)
    var partForCycle = getPartForCycleOnLiveGrid(fullList,null,numberOfMonitors)
    cycleOnLiveGridFullList = [].concat(fullList)
    displayCycleSetOnLiveGrid(partForCycle)
    stopCycleOnLiveGrid()
    resumeCycleOnLiveGrid(fullList,partForCycle,numberOfMonitors)
}
dashboardSwitchCallbacks.cycleLiveGrid = function(toggleState){
    if(toggleState !== 1){
        cycleOnLiveGridOptions = null
        cycleOnLiveGridOptionsBefore = null
        stopCycleOnLiveGrid()
    }else{
        openTab('liveGrid')
        cycleOnLiveGridOptionsBefore = cycleOnLiveGridOptions ? Object.assign({},cycleOnLiveGridOptions) : null
        const theLocalStorage = dashboardOptions()
        const cycleLivePerRow = parseInt(theLocalStorage.cycleLivePerRow) || 2
        const cycleLiveNumberOfMonitors = parseInt(theLocalStorage.cycleLiveNumberOfMonitors) || 4
        const cycleLiveMonitorHeight = parseInt(theLocalStorage.cycleLiveMonitorHeight) || 4
        cycleOnLiveGridOptions = {
            chosenTags: null,
            useMonitorIds: null,
            monitorsPerRow: cycleLivePerRow,
            numberOfMonitors: cycleLiveNumberOfMonitors,
            monitorHeight: cycleLiveMonitorHeight,
        }
        beginCycleOnLiveGrid(cycleOnLiveGridOptions)
    }
}
function keyShortcutsForCycleOnLiveGrid(enable) {
    function cleanup(){
        document.removeEventListener('keydown', keyShortcuts['cycleOnLiveGrid'].keydown);
        document.removeEventListener('keyup', keyShortcuts['cycleOnLiveGrid'].keyup);
        delete(keyShortcuts['cycleOnLiveGrid'])
    }
    if(enable){
        let isKeyPressed = false;
        function handleKeyboard(event){
            if (isKeyPressed) {
                return;
            }
            event.preventDefault();
            switch(event.code){
                case 'Space':
                    isKeyPressed = true;
                    if(liveGridCycleTimer){
                        stopCycleOnLiveGrid()
                    }else{
                        resumeCycleOnLiveGrid(
                            cycleOnLiveGridFullList,
                            cycleOnLiveGridCurrentPart,
                            cycleOnLiveGridOptions.numberOfMonitors
                        )
                    }
                break;
                case 'ArrowLeft':
                    isKeyPressed = true;
                    cycleOnLiveGridMovePrev();
                break;
                case 'ArrowRight':
                    isKeyPressed = true;
                    cycleOnLiveGridMoveNext();
                break;
            }
        }
        function handleKeyup(event) {
            isKeyPressed = false;
        }
        keyShortcuts['cycleOnLiveGrid'] = {
            keydown: handleKeyboard,
            keyup: handleKeyup,
        }
        document.addEventListener('keydown', keyShortcuts['cycleOnLiveGrid'].keydown);
        document.addEventListener('keyup', keyShortcuts['cycleOnLiveGrid'].keyup);
    }else{
        cleanup()
    }
}
addOnTabOpen('liveGrid', function () {
    keyShortcutsForCycleOnLiveGrid(true)
})
addOnTabReopen('liveGrid', function () {
    if(cycleOnLiveGridOptions){
        beginCycleOnLiveGrid(cycleOnLiveGridOptions)
    }
    keyShortcutsForCycleOnLiveGrid(true)
})
addOnTabAway('liveGrid', function () {
    stopCycleOnLiveGrid()
    keyShortcutsForCycleOnLiveGrid(false)
})
