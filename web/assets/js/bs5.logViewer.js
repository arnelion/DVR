$(document).ready(function(e){
    var theWindow = $('#tab-logViewer')
    var logTypeSelector = $('#log_monitors')
    var dateRangeSelector = $('#logs_daterange')
    var savedLogRows = $('#saved-logs-rows')
    var theForm = theWindow.find('form')
    var logViewerDataInMemory = {}
    //log viewer
    dateRangeSelector.daterangepicker({
        startDate: moment().subtract(moment.duration("5:00:00")),
        endDate: moment().add(moment.duration("24:00:00")),
        timePicker: true,
        timePicker24Hour: true,
        timePickerSeconds: true,
        timePickerIncrement: 30,
        locale: {
            format: 'MM/DD/YYYY h:mm A'
        }
    },function(start, end, label){
        drawLogRows()
    });
    addOnTabOpen('logViewer',function(){
        logTypeSelector.find('optgroup option').remove()
        var html = ''
        $.each(loadedMonitors,function(n,v){
            html += createOptionHtml({
                value: v.mid,
                label: v.name,
            })
        })
        logTypeSelector.find('optgroup').html(html)
        drawLogRows()
    })
    function drawLogRows(){
        var html = ''
        var selectedLogType = logTypeSelector.val()
        selectedLogType = selectedLogType === 'all' ? '' : selectedLogType
        var currentDateRange = dateRangeSelector.data('daterangepicker');
        var apiEndpoint = getApiPrefix(`logs`) + '/' + selectedLogType + '?start=' + formattedTimeForFilename(currentDateRange.startDate) + '&end=' + formattedTimeForFilename(currentDateRange.endDate)
        $.get(apiEndpoint,function(rows){
            logViewerDataInMemory = {
                startDate: currentDateRange.startDate,
                endDate: currentDateRange.endDate,
                url: apiEndpoint,
                query: selectedLogType,
                rows: rows,
            }
            if(rows.length === 0){
                html = '<tr class="text-center"><td>'+lang.NoLogsFoundForDateRange+'</td></tr>'
            }else{
                $.each(rows,function(n,v){
                    html += buildLogRow(v)
                })
            }
            savedLogRows.html(html)
        })
    }
    logTypeSelector.change(drawLogRows)
    theForm.submit(function(e){
        e.preventDefault()
        drawLogRows()
        return false
    })
    theWindow.find('[download]').click(function(e){
        e.preventDefault()
        if(!logViewerDataInMemory.rows){
            console.log('No Logs Found for Download')
            return
        }
        downloadJSON(logViewerDataInMemory,'Shinobi_Logs_'+(new Date())+'.json')
        return false;
    })
})