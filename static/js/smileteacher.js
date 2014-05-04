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

var VERSION = '0.2.9';

var SMILEROUTES = {
    //"currentmessage": "/smile/currentmessage",
    "all": "/smile/all",
    "iqsets": "/smile/iqsets",
    "iqset": "/smile/iqset/",
    "question":"/smile/question",
    "createsession": "/smile/createsession",
    "startmakequestion":"startmakequestion"
};

// var IQSET_PREVIEW = '';
// var QUESTION_TO_DETAIL = '';
// var ID_IQSET = '';
// var TEMP_IQSETS = [];
// var TEMP_POSITION = 0;

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

    version: ko.observable(VERSION),

    // Session values
    teacher_name: ko.observable(""),
    session_name: ko.observable(""),
    group_name: ko.observable(""),

    // Use prepared questions
    iqsets: ko.observableArray([]),
    
    // Preview IQSet
    //iqset_to_preview: ko.observable(''),
    questions_to_preview: ko.observableArray([]),

    // Start making questions
    position: ko.observable(''),
    id_questions: ko.observable(''),
    //students: ko.observableArray([]),
    questions: ko.observableArray([]),


    // Detail of a question
    question_detail: ko.observable([])
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

// Displays directly a "Recovering Session" button if a session is already running (instead of the session values fields)
GlobalViewModel.synchronizeWithServer = function() {

    // We get the /smile/all
    var dataAll = JSON.parse(smile_all());

    for(i=0; i<dataAll.length; i++) {

        if(JSON.stringify(dataAll[i]).indexOf('teacherName') !== -1) {
            GlobalViewModel.session_name(dataAll[i].sessionName);
            GlobalViewModel.group_name(dataAll[i].groupName);
            GlobalViewModel.teacher_name(dataAll[i].teacherName);
            smileAlert('#globalstatus', 'Recovered.','blue',2000);
        }
    }

    if(JSON.stringify(dataAll).indexOf('SessionID') !== -1) {
        switchSection('recover-session');
    }
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
            switchSection('choose-activity-flow');
        }
    });

    return false;
}

GlobalViewModel.usePreparedQuestions = function() {

    // Refresh 
    switchSection('choose-an-iqset');

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

    var iqset = JSON.parse(smile_iqset(idIQSet));
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

    switchSection('preview-iqset');

}

function viewQuestionDetail(position) {

    var iqset = JSON.parse(smile_iqset(ID_IQSET));
    var iqdata = iqset.iqdata;
    smileAlert('#globalstatus', 'iqdata[position]='+iqdata[position], 'green', 5000);
    /*
    GlobalViewModel.question_detail.removeAll();

    var options = [];
    options.push(
        iqdata[position].O1,
        iqdata[position].O2,
        iqdata[position].O3,
        iqdata[position].O4
    );

    GlobalViewModel.question_detail.push(
        new Question(
            position,
            iqdata[position].PICURL,
            iqdata[position].NAME,
            iqdata[position].Q,
            iqdata[position].A,
            options,
            iqdata[position].IP,
            iqdata[position].TYPE
        )
    );
*/

    switchSection('question-detail');
}

GlobalViewModel.recoverSession = function() {

    smileAlert('#globalstatus', 'Session recovered ('+GlobalViewModel.session_name+', '+GlobalViewModel.teacher_name+')', 'green', 5000);

    return false;
}

GlobalViewModel.startMakingQuestions = function() {

    smileAlert('#globalstatus', 'Start making questions', 'green', 5000);
    return false;
}

GlobalViewModel.startMakingQuestionsWithIQSet = function() {
    
    //GlobalViewModel.questions.removeAll();
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

                $.ajax({ 
                    cache: false, 
                    type: "POST", 
                    dataType: "text", 
                    url: SMILEROUTES["question"],
                    async: false,

                    data: {
                        "TYPE":iqdata[i].TYPE,
                        "IP":iqdata[i].IP,
                        "NAME":iqdata[i].NAME,
                        "O1":options[0],
                        "O2":options[1],
                        "O3":options[2],
                        "O4":options[3],
                        "Q":iqdata[i].Q,
                        "SessionID":Date.now(),
                        "A":iqdata[i].A
                    },
                    
                    error: function(xhr, text, err) {
                        smileAlert('#globalstatus', 'Unable to post session values.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', 'trace');
                    }, 
                    success: function(data) { }
                });

            }
        }
    });

    switchSection('list-questions');

    return false;
}

$(document).ready(function() {
    
    // Init Data Model
    ko.applyBindings(GlobalViewModel);

    GlobalViewModel.synchronizeWithServer();
});

/* ---------
    UTILITY
   --------- */

function switchSection(newSection) {
    $('section.active').removeClass('active');
    $('div[data-slug='+newSection+']').parent().addClass('active');
}

GlobalViewModel.foobar = function() {

    smileAlert('#globalstatus', 'GlobalViewModel.iqsets.length='+GlobalViewModel.iqsets.total_rows, 'blue', 15000);
}

function smile_all() {

    var all;

    $.ajax({ 
        cache: false, 
        type: "GET", 
        dataType: "text", 
        url: SMILEROUTES["all"], 
        async: false,
        data: {}, 
        error: function(xhr, text, err) {
            smileAlert('#globalstatus', 'Unable to call /smile/all', 'trace',8000);
        }, 
        success: function(data) { all = data; }
    });
    return all;
}

function smile_iqset(id) {

    var iqset;

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
        success: function(data) { iqset = data; }
    });
    return iqset;
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