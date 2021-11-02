$(document).ready(function(){
    var loadedMonitorStates = {}
    var loadedSchedules = {}
    var schedulerWindow = $('#tab-schedules')
    var scheduleSelector = $('#schedulesSelector')
    var schedulerForm = schedulerWindow.find('form')
    var selectedStates = schedulerWindow.find('[name="monitorStates"]')
    var selectedDays = schedulerWindow.find('[name="days"]')
    var loadSchedules = function(callback){
        $.get(getApiPrefix() + '/schedule/' + $user.ke,function(d){
            var html = ''
            $.each(d.schedules,function(n,v){
                loadedSchedules[v.name] = v
                html += createOptionHtml({
                    value: v.name,
                    label: v.name
                })
            })
            scheduleSelector.find('optgroup').html(html)
            if(callback)callback()
        })
    }
    var loadMonitorStates = function(){
        $.get(getApiPrefix() + '/monitorStates/' + $user.ke,function(d){
            var html = ''
            $.each(d.presets,function(n,v){
                loadedMonitorStates[v.name] = v
                html += createOptionHtml({
                    value: v.name,
                    label: v.name
                })
            })
            selectedStates.html(html)
        })
    }
    addOnTabReopen('schedules',function(loadedTab){
        loadMonitorStates()
        loadSchedules()
    })
    schedulerWindow.on('click','.delete',function(e){
        $.confirm.create({
            title: lang['Delete Schedule'],
            body: lang.deleteScheduleText,
            clickOptions: {
                title: 'Delete',
                class: 'btn-danger'
            },
            clickCallback: function(){
                var form = schedulerForm.serializeObject()
                $.post(getApiPrefix() + '/schedule/' + $user.ke + '/' + form.name + '/delete',function(d){
                    debugLog(d)
                    if(d.ok === true){
                        loadSchedules()
                        new PNotify({title:lang.Success,text:d.msg,type:'success'})
                    }
                })
            }
        })
    })
    scheduleSelector.change(function(e){
        var selected = $(this).val()
        var loaded = loadedSchedules[selected]
        var namespace = schedulerWindow.find('[name="name"]')
        var deleteButton = schedulerWindow.find('.delete')
        var tzEl = schedulerWindow.find('[name="timezone"]')
        selectedStates.find('option:selected').removeAttr('selected')
        selectedDays.find('option:selected').removeAttr('selected')
        if(loaded){
            namespace.val(loaded.name)
            var html = ''
            $.each(loaded,function(n,v){
                schedulerForm.find('[name="' + n + '"]').val(v)
            })
            $.each(loaded.details.monitorStates,function(n,v){
                selectedStates.find('option[value="' + v + '"]').prop('selected',true)
            })
            $.each(loaded.details.days,function(n,v){
                selectedDays.find('option[value="' + v + '"]').prop('selected',true)
            })
            tzEl.val(loaded.details.timezone || '+0')
            deleteButton.show()
        }else{
            tzEl.val('+0')
            namespace.val('')
            deleteButton.hide()
        }
    })
    schedulerForm.submit(function(e){
        e.preventDefault()
        var el = $(this)
        var form = el.serializeObject()
        var monitors = []
        var failedToParseAJson = false
        if(form.name === ''){
            return new PNotify({title:lang['Invalid Data'],text:lang['Name cannot be empty.'],type:'error'})
        }
        if(form.start === ''){
            return new PNotify({title:lang['Invalid Data'],text:lang['Start Time cannot be empty.'],type:'error'})
        }
        if(form.monitorStates instanceof Array === false){
            form.monitorStates = [form.monitorStates]
        }
        if(!form.days || form.days === ''){
            form.days = null
        }else if(form.days instanceof Array === false){
            form.days = [form.days]
        }
        var data = {
            start: form.start,
            end: form.end,
            enabled: form.enabled,
            details: {
                monitorStates: form.monitorStates,
                days: form.days,
                timezone: form.timezone,
            }
        }
        $.post(getApiPrefix() + '/schedule/' + $user.ke + '/' + form.name + '/insert',{data:data},function(d){
            debugLog(d)
            if(d.ok === true){
                loadSchedules(function(){
                    scheduleSelector.val(form.name)
                })
                new PNotify({title:lang.Success,text:d.msg,type:'success'})
            }
        })
        return false;
    })
})