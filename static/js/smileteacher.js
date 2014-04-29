/**
 #
 #Copyright (c) 2011-2014 Razortooth Communications, LLC. All rights reserved.
 #
 #Redistribution and use in source and binary forms, with or without modification,
 #are permitted provided that the following conditions are met:
 #
 #    * Redistributions of source code must retain the above copyright notice,
 #      this list of conditions and the following disclaimer.
 #
 #    * Redistributions in binary form must reproduce the above copyright notice,
 #      this list of conditions and the following disclaimer in the documentation
 #      and/or other materials provided with the distribution.
 #
 #    * Neither the name of Razortooth Communications, LLC, nor the names of its
 #      contributors may be used to endorse or promote products derived from this
 #      software without specific prior written permission.
 #
 #THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 #ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 #WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 #DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 #ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 #(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 #LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 #ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 #(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 #SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **/

var VERSION = '0.1.5';

var SMILEROUTES = {
    //"currentmessage": "/smile/currentmessage",
    "all": "/smile/all",
    "iqsets": "/smile/iqsets",
    "iqset": "/smile/iqset/",
    "question":"/smile/question",
    "createsession": "/smile/createsession",
    "startmakequestion":"startmakequestion"
};

var TEMP_IQSET = '';
var TEMP_IQSETS = [];
var TEMP_POSITION = 0;

/* --------
    MODELS
   -------- */

var Question = function(position,urlImage,author,question,answer,options,ip,type) {

    this.position = position;
    this.urlImage = urlImage;
    this.author = author;
    this.question = question;
    this.answer = answer;
    this.options = options;
    this.ip = ip;
    this.type = type;
}

var IQSet = function(position,id,title,teacherName,groupName,date) {

    this.position = position;
    this.id = id;
    this.sessionName = title;
    this.teacherName = teacherName;
    this.groupName = groupName;
    this.date = date;
    this.questions = [];
    //this.size = size;
}



var GlobalViewModel = {
    teacher_name: ko.observable(""),
    session_name: ko.observable(""),
    group_name: ko.observable(""),
    iqsets: ko.observableArray([]),
    
    // Preview IQSet
    iqset_to_preview: ko.observable(''),
    questions_to_preview: ko.observableArray([]),

    position: ko.observable(''),
    questions: ko.observableArray([]),
    version: ko.observable(VERSION)
};

/* --------------
    KO EXTENDERS
   -------------- */

// This adds the required extender for validation
ko.extenders.required = function(target, overrideMessage) {
    //add some sub-observables to our observable
    target.hasError = ko.observable();
    target.validationMessage = ko.observable();

    //define a function to do validation
    function validate(newValue) {
        target.hasError(newValue ? false : true);
        target.validationMessage(newValue ? "" : overrideMessage || "This field is required");
    }

    //initial validation
    validate(target());

    //validate whenever the value changes
    target.subscribe(validate);

    //return the original observable
    return target;
};

/* ---------
    ACTIONS
   --------- */

// Displays directly a "Recovering Session" button if a session is already running
GlobalViewModel.initializePage = function() {

    $.ajax({ 
        cache: false, 
        type: "GET", 
        dataType: "text", 
        url: SMILEROUTES["all"], 
        data: {}, 
        
        error: function(xhr, text, err) {
            smileAlert('#globalstatus', 'Unable to call /smile/all.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', 'trace');
        }, 
        success: function(data) {

            // If a session is already running, we replace the session values fields by a "recovering session" button
            if(data.indexOf('SessionID') !== -1 ){
                switchSection('div[data-slug=recover-session]');
            }
        }
    });
}

GlobalViewModel.resetSessionValues = function() {

    this.teacher_name("");
    this.session_name("");
    this.group_name("");
    //window.location.href = window.location.pathname;
    //window.location.reload(true);
    return false;
}

GlobalViewModel.createSession = function() {
    
    if (!this.teacher_name() || this.teacher_name() === "") { this.teacher_name('Default Teacher'); }
    if (!this.session_name() || this.session_name() === "") { this.session_name('Default Session'); }
    if (!this.group_name() || this.group_name() === "")     { this.group_name('Default Group');  }
    
    $.ajax({ 
        cache: false, 
        type: "POST", 
        dataType: "text", 
        url: SMILEROUTES["createsession"],
        data: {"teacherName":GlobalViewModel.teacher_name,"groupName":GlobalViewModel.group_name,"sessionName":GlobalViewModel.session_name}, 
        
        error: function(xhr, text, err) {
            smileAlert('#globalstatus', 'Unable to post session values.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', 'trace');
        }, 
        success: function(data) {
            switchSection('div[data-slug=choose-activity-flow]');
        }
    });

    return false;
}

GlobalViewModel.usePreparedQuestions = function() {

    // Refresh 
    //GlobalViewModel.iqsets = [];
    switchSection('div[data-slug=choose-an-iqset]');

    $.ajax({ 
        cache: false, 
        type: "GET", 
        dataType: "text", 
        url: SMILEROUTES["iqsets"], 
        data: {}, 
        
        error: function(xhr, text, err) {
            smileAlert('#globalstatus', 'Unable to call /smile/iqsets.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', 'trace');
        }, 
        
        success: function(data) {

            var dataObject = JSON.parse(data);
            var iqsets = dataObject.rows;

            //TEMP_POSITION = 0;

            GlobalViewModel.iqsets.removeAll();

            for (i = 0; i < dataObject.total_rows; i++) {

                // Getting the values accessible from /smile/iqsets
                /*
                TEMP_IQSET.position = i;
                TEMP_IQSET.id = iqsets[i].id;
                TEMP_IQSET.sessionName = iqsets[i].value[0];
                TEMP_IQSET.teacherName = iqsets[i].value[1];
                TEMP_IQSET.groupName = iqsets[i].value[2];
                TEMP_IQSET.date = iqsets[i].key.substr(0, 10);
                */

                GlobalViewModel.iqsets.push(new IQSet(
                    i,
                    iqsets[i].id,
                    iqsets[i].value[0],
                    iqsets[i].value[1],
                    iqsets[i].value[2],
                    iqsets[i].key.substr(0, 10)
                ));

                //smileAlert('#globalstatus', 'during push='+GlobalViewModel.iqsets.length, 'blue', 15000);

                
                /*
                // Getting the values accessible from /smile/iqset/{id} (for now, the size)          
                $.ajax({ 
                    cache: false, 
                    type: "GET", 
                    dataType: "text", 
                    url: SMILEROUTES["iqset"]+iqsets[i].id, 
                    data: {}, 
                    error: function(xhr, text, err) { smileAlert('#globalstatus', 'Unable to ajax in ajax.', 'trace'); }, 
                    
                    success: function(data) {
                        var iqset = JSON.parse(data);


                        smileAlert('#globalstatus', 'TEMP_POSITION='+TEMP_POSITION, 'green', 15000);
                        //GlobalViewModel.iqsets[0].size = iqset.iqdata.length;

                        TEMP_POSITION++;

                        //smileAlert('#globalstatus', '???='+iqset.title, 'green', 15000);


                        // The IQSet is ready, we can add it to the list
                        //GlobalViewModel.iqsets.push(TEMP_IQSET);

                        //smileAlert('#globalstatus', 'session name='+TEMP_IQSET.sessionName, 'green', 5000);
                    }
                });

                */
            }
        }
    });

    //smileAlert('#globalstatus', 'FINAL='+GlobalViewModel.iqsets.length, 'blue', 15000);

    //GlobalViewModel.iqsets = TEMP_IQSETS;

    return false;
}

function previewIQSet(idIQSet) {

    var iqset = JSON.parse(getJsonIQSet(idIQSet));
    var iqdata = iqset.iqdata;
    GlobalViewModel.questions_to_preview.removeAll();

    for (i = 0; i < iqdata.length; i++) {

        var options = [];
        options.push(iqdata[i].O1,iqdata[i].O2,iqdata[i].O3,iqdata[i].O4);

        GlobalViewModel.questions_to_preview.push(
            new Question(
                i,
                iqdata[i].PICURL,
                iqdata[i].NAME,
                iqdata[i].Q,
                iqdata[i].A,
                options,
                iqdata[i].IP,
                iqdata[i].TYPE
            )
        );
    }
    ///

    //smileAlert('#globalstatus', 'iqset='+iqset, 'blue', 7000);

    //GlobalViewModel.iqset_to_preview = iqset;
    //GlobalViewModel.questions_to_preview = iqset.iqdata;

    //alert(iqset.iqdata);

    switchSection('div[data-slug=preview-iqset]');
    
}

GlobalViewModel.recoverSession = function() {

    smileAlert('#globalstatus', 'Session recovered', 'green', 5000);
    return false;
}

GlobalViewModel.startMakingQuestions = function() {

    smileAlert('#globalstatus', 'Start making questions', 'green', 5000);
    return false;
}

GlobalViewModel.startMakingQuestionsWithIQSet = function() {
    
    $.ajax({ 
        cache: false, 
        type: "GET", 
        dataType: "text", 
        url: SMILEROUTES["iqset"]+GlobalViewModel.iqsets()[GlobalViewModel.position()].id, 
        data: {}, 
        
        error: function(xhr, text, err) {
            smileAlert('#globalstatus', 'Unable to call /smile/iqset/{key}.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', 'trace');
        }, 
        
        success: function(data) {

            var iqset = JSON.parse(data);
            var iqdata = iqset.iqdata;

            for (i = 0; i < iqdata.length; i++) {

                var options = [];
                options.push(iqdata[i].O1,iqdata[i].O2,iqdata[i].O3,iqdata[i].O4);

                GlobalViewModel.questions.push(
                    new Question(
                        i,
                        iqdata[i].PICURL,
                        iqdata[i].NAME,
                        iqdata[i].Q,
                        iqdata[i].A,
                        options,
                        iqdata[i].IP,
                        iqdata[i].TYPE
                    )
                );
            }
            //GlobalViewModel.title_iqset = iqset.title;
        }
    });

    switchSection('div[data-slug=list-questions]');

    return false;
}

$(document).ready(function() {
    
    // Init Data Model
    ko.applyBindings(GlobalViewModel);

    GlobalViewModel.initializePage();

    // TEMP
    var essai = getJsonIQSet('342E5328-BA65-437D-ABCA-BE1A735E3D49');
    smileAlert('#globalstatus', 'essai='+essai, 'blue', 7000);
});

/* ---------
    UTILITY
   --------- */

function switchSection(newSection) {
    $('section.active').removeClass('active');
    $(newSection).parent().addClass('active');
}

function sleep(seconds) {

    var now = new Date();
    var desiredTime = new Date().setSeconds(now.getSeconds() + seconds);
    while (now < desiredTime) { now = new Date(); }
}

GlobalViewModel.foobar = function() {

    smileAlert('#globalstatus', 'GlobalViewModel.iqsets.length='+GlobalViewModel.iqsets.total_rows, 'blue', 15000);
}

function getJsonIQSet(id) {

    $.ajax({ 
        cache: false, 
        type: "GET", 
        dataType: "text", 
        url: SMILEROUTES["iqset"]+id, 
        async: false,
        data: {}, 
        
        error: function(xhr, text, err) {
            smileAlert('#globalstatus', 'Unable to call /smile/iqset/{key}', 'trace',8000);
        }, 
        
        success: function(data) {

            TEMP_IQSET = data;
        }
    });

    return TEMP_IQSET;
}


// alerttype
//  - by default, none is required if you don't intend to use lifetime
//  - trace : use the stacktrace in the error message
//  - red : display a red color alert
//  - blue : display a blue color alert
//  - green : display a green color alert
//
function smileAlert(targetid, text, alerttype, lifetime) {
    var defaultalert = 'secondary';
    var redalert = 'alert';
    var bluealert = '';
    var greenalert = 'success';
    var formatstr = '<div class="alert-box %s"> \
        %s \
        <a href="" class="close">&times;</a> \
        </div>';
    
    if (!alerttype)                 { alerttype = defaultalert; } 
    else if (alerttype === 'trace') { alerttype = redalert; 
                                      text += ' : ' + printStackTrace(); } 
    else if (alerttype === 'red')   { alerttype = redalert; } 
    else if (alerttype === 'blue')  { alerttype = bluealert; } 
    else if (alerttype === 'green') { alerttype = greenalert; } 
    else                            { alerttype = defaultalert; }
    
    if (targetid) {
        $(targetid).append(sprintf(formatstr, alerttype, text));
    }
    if (lifetime) {
        setInterval(function() {
            $(targetid).find('.alert-box').fadeOut().remove();
        }, lifetime)
    }
}