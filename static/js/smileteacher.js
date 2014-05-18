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

var VERSION = '0.5.1';

var SMILEROUTES = {
    "all": "/smile/all",
    "reset": "/smile/reset",
    "iqsets": "/smile/iqsets",
    "iqset": "/smile/iqset/",
    "question": "/smile/question",
    "session": "/smile/createsession",
    "startmake": "/smile/startmakequestion",
    "deletequestion": "/smile/questionview/"
};

var deamon_updating_board;

/* --------
    MODELS
   -------- */
var Student = function(name,ip) {

    this.name = name;
    this.ip = ip;
}

var Question = function(sessionID,urlImage,author,question,answer,options,ip,type) {

    //this.position = position;
    this.session_id = sessionID;
    this.urlImage = urlImage;
    this.author = author;
    this.question = question;
    this.answer = answer;
    this.options = options;
    this.ip = ip;
    this.type = type;
}

var IQSet = function(position,id,title,teacherName,groupName,date,size) {

    this.position = position;
    this.id = id;
    this.sessionName = title;
    this.teacherName = teacherName;
    this.groupName = groupName;
    this.date = date;
    this.questions = [];
    this.size = size;
}

var GlobalViewModel = {

    version: ko.observable(VERSION),

    // Session values
    teacher_name: ko.observable(''),
    session_name: ko.observable(''),
    group_name: ko.observable(''),

    // Use prepared questions
    iqsets: ko.observableArray([]),
    
    // Preview IQSet
    iqset_to_preview: ko.observableArray([]),

    // Start making questions
    position: ko.observable(''),
    //id_questions: ko.observable(''),
    students: ko.observableArray([]),
    questions: ko.observableArray([]),


    // Detail of a question
    question_detail: ko.observableArray([])
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

GlobalViewModel.redirectView = function() {

    GlobalViewModel.questions.removeAll();

    // We get the /smile/all
    var dataAll = JSON.parse(smile_all());
    var section = 'create-session';

    for(i=0; i<dataAll.length; i++) {

        switch (dataAll[i].TYPE) {
        
            case 'SESSION_VALUES':
                GlobalViewModel.session_name(dataAll[i].sessionName);
                GlobalViewModel.group_name(dataAll[i].groupName);
                GlobalViewModel.teacher_name(dataAll[i].teacherName);
                section = 'choose-activity-flow';
                break;

            case 'START_MAKE':
                section = 'general-board';
                clearInterval(deamon_updating_board);
                deamon_updating_board = setInterval(updateGVM, 5000);
                break;

            case 'QUESTION':
            case 'QUESTION_PIC':
                addQuestion(dataAll[i]);
                break;

            default: break;
        }
    }
    switchSection(section);
}

GlobalViewModel.createSession = function() {
    
    if(typeExist('SESSION_VALUES')) {
        this.redirectView();
    } else {
        if (!this.teacher_name() || this.teacher_name() === "") { this.teacher_name('Unknown'); }
        if (!this.session_name() || this.session_name() === "") { this.session_name('Unspecified'); }
        if (!this.group_name() || this.group_name() === "")     { this.group_name('General');  }

        // Send session values to server
        postMessage('session');
    }
}

GlobalViewModel.resetSession = function() {
    
    this.teacher_name('');
    this.session_name('');
    this.group_name('');
    GlobalViewModel.questions.removeAll();
    clearInterval(deamon_updating_board);
    
    // Reset the session on server
    smile_reset();

    this.redirectView();
}

GlobalViewModel.startMakingQuestions = function() {

    // If a session does not already exist, we send a 'start_make' signal to the server
    if(!typeExist('START_MAKE')) postMessage('startmake');

    this.redirectView();
}

GlobalViewModel.usePreparedQuestions = function() {

    if(typeExist('START_MAKE')) {
        this.redirectView();
    } else {

        // Redirecting view
        switchSection('list-of-iqsets');

        // Getting iqsets from server
        var dataObject = JSON.parse(smile_iqsets());
        var iqsets = dataObject.rows;

        GlobalViewModel.iqsets.removeAll();

        for (i=0; i < dataObject.total_rows; i++) {

            // Getting the current iqset
            var iqset = JSON.parse(smile_iqset(iqsets[i].id));

            GlobalViewModel.iqsets.push(new IQSet(
                i,
                iqsets[i].id,
                iqsets[i].value[0],
                iqsets[i].value[1],
                iqsets[i].value[2],
                iqsets[i].key.substr(0, 10),
                iqset.iqdata.length
            ));  
        }
    }
}

function previewIQSet(idIQSet) {

    // With 'idIQSet', we extract the data of the IQSet from server
    var iqset = JSON.parse(smile_iqset(idIQSet));
    var iqdata = iqset.iqdata;
    
    GlobalViewModel.iqset_to_preview.removeAll();

    // We affect these data to an iqset 
    var iqsetToPreview = new IQSet(
        'any',
        'any', 
        iqset.title,
        iqset.teachername,
        iqset.groupname,
        iqset.date.substr(0, 10)
    );

    // Adding to this IQSet the list of questions
    for (i = 0; i < iqdata.length; i++) {

        var options = [];
        options.push(iqdata[i].O1,iqdata[i].O2,iqdata[i].O3,iqdata[i].O4);

        iqsetToPreview.questions.push(
            new Question(
                'any',
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

    // We finally load the iqset to preview
    GlobalViewModel.iqset_to_preview.push(iqsetToPreview);

    switchSection('preview-iqset');
}

GlobalViewModel.startMakingQuestionsWithIQSet = function() {

    $.ajax({ 
        cache: false, 
        type: "GET", 
        dataType: "text", 
        url: SMILEROUTES["iqset"]+GlobalViewModel.iqsets()[GlobalViewModel.position()].id, 
        async: false,
        data: {}, 
        
        error: function(xhr, text, err) {
            smileAlert('#globalstatus', 'Unable to call /smile/iqset/{key}.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', 'trace');
        }, 
        
        success: function(data) {

            var iqset = JSON.parse(data);
            var iqdata = iqset.iqdata;

            for (i = 0; i < iqdata.length; i++) {

                // We add the question on client side
                addQuestion(iqdata[i]);

                // Same job on server side
                postMessage('question',iqdata[i]);
            }
        }
    });
    
    postMessage('startmake');

    deamon_updating_board = setInterval(updateGVM, 5000);
    this.redirectView();
}

function detailQuestion(sessionID) {

    // We remove the previous question detailed to put the new one
    GlobalViewModel.question_detail.removeAll();

    // We get the /smile/all
    var dataAll = JSON.parse(smile_all());

    for (i = 0; i < dataAll.length; i++) {

        // If the question is still in session, we load the details
        if(dataAll[i].SessionID === sessionID) {

            var options = [];
            options.push(
                dataAll[i].O1,
                dataAll[i].O2,
                dataAll[i].O3,
                dataAll[i].O4
            );

            GlobalViewModel.question_detail.push(
                new Question(
                    dataAll[i].SessionID,
                    dataAll[i].PICURL,
                    dataAll[i].NAME,
                    dataAll[i].Q,
                    dataAll[i].A,
                    options,
                    dataAll[i].IP,
                    dataAll[i].TYPE
                )
            );
        }
    }
    switchSection('question-detail');
}

function confirmDeletion(sessionID) {
    //smileAlert('#globalstatus', 'position=='+sessionID, 'green'); 
    $('input[name=sessionIDtoDelete]').val(sessionID);
    switchSection('confirm-deletion');
}

GlobalViewModel.removeQuestionFromSession = function() {

    var positionOfcurrentQuestion = -1;

    var dataAll = JSON.parse(smile_all());

    for (i = 0; i < dataAll.length; i++) {

        // If the question is still in session, we load the details
        if(dataAll[i].TYPE === 'QUESTION' || dataAll[i].TYPE === 'QUESTION_PIC') {

            positionOfcurrentQuestion++;

            if(dataAll[i].SessionID === $('input[name=sessionIDtoDelete]').val()) {

                var urlDeletingQuestion = SMILEROUTES['deletequestion']+positionOfcurrentQuestion+'.json';

                smileAlert('#globalstatus', 'url=='+urlDeletingQuestion, 'green'); 

                $.ajax({ 
                    cache: false, 
                    type: "DELETE", 
                    //dataType: "text",
                    contentType: "application/json", 
                    url: urlDeletingQuestion,
                    data: {}, 
                    
                    error: function(xhr, text, err) {
                        smileAlert('#globalstatus', 'Unable to remove question from session', 'trace');
                    }, 
                    success: function(data) {
                        switchSection('general-board');
                    }
                });

            }
        }
    }
}

$(document).ready(function() {
    
    // Init Data Model
    ko.applyBindings(GlobalViewModel);

    GlobalViewModel.redirectView();
});

/* ---------
    UTILITY
   --------- */

function switchSection(newSection) {
    $('section.visible').removeClass('visible').addClass('hidden');
    $('div[smile='+newSection+']').parent().addClass('visible').removeClass('hidden');
}

// Should I really have this skeleton? or directly having the add________ in the loop synchronizing everytime ?
// Same question for the future addStudent(student)
function addQuestion(question) {

    var options = [];
    options.push(question.O1,question.O2,question.O3,question.O4);


    GlobalViewModel.questions.push(
        new Question(
            question.SessionID,
            question.PICURL,
            question.NAME,
            question.Q,
            question.A,
            options,
            question.IP,
            question.TYPE
        )
    );
}

/*
var guid = (function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  }
  return function() {
    return s4()+s4()+'-'+s4()+'-'+s4()+'-'+s4()+'-'+s4()+s4()+s4();
  };
})();
*/
function updateGVM() {

    var dataAll = JSON.parse(smile_all());
    var questionsOfGVM = '';

    // Removing questions not present on server
    for(i=0; i<GlobalViewModel.questions().length; i++) {

        if(!JSON.stringify(dataAll).contains('"SessionID":"'+GlobalViewModel.questions()[i].session_id+'"')) {
            GlobalViewModel.questions.remove(GlobalViewModel.questions()[i]);
        } else {
            questionsOfGVM += JSON.stringify(GlobalViewModel.questions()[i]);
        }
    }

    // Adding questions not present on teacher webapp
    for(i=0; i<dataAll.length; i++) {

        if(dataAll[i].TYPE === 'QUESTION' || dataAll[i].TYPE === 'QUESTION_PIC') {
        
            if(!questionsOfGVM.contains('"session_id":"'+dataAll[i].SessionID+'"')) {
                addQuestion(dataAll[i]);
                smileAlert('#globalstatus','New question!','',1500);
            }
        }
    }
}

function postMessage(type,values) {

    switch(type) {

        case 'session':

            $.ajax({ 
                cache: false, 
                type: "POST", 
                dataType: "text", 
                url: SMILEROUTES['session'],
                data: {
                    "TYPE":"SESSION_VALUES",
                    "teacherName":GlobalViewModel.teacher_name,
                    "groupName":GlobalViewModel.group_name,
                    "sessionName":GlobalViewModel.session_name
                }, 
                
                error: function(xhr, text, err) {
                    smileAlert('#globalstatus', 'Unable to send SESSION_VALUES to server', 'trace');
                }, 
                success: function(data) {
                    switchSection('choose-activity-flow');
                }
            });
            break;

        case 'startmake':

            $.ajax({ 
                cache: false, 
                type: "POST", 
                dataType: "text", 
                url: SMILEROUTES['startmake'],
                data: { "TYPE":"START_MAKE" }, 
                async: false,
                
                error: function(xhr, text, err) {
                    smileAlert('#globalstatus', 'Unable to send START_MAKE phase', 'trace');
                }, 
                success: function(data) {}
            });
            break;

        case 'question':

            $.ajax({ 
                cache: false, 
                type: "POST", 
                dataType: "text", 
                url: SMILEROUTES['question'],
                //async: false,

                data: {
                    "TYPE":values.TYPE,
                    "IP":values.IP,
                    "NAME":values.NAME,
                    "O1":values.O1,
                    "O2":values.O2,
                    "O3":values.O3,
                    "O4":values.O4,
                    "Q":values.Q,
                    "SessionID":Date.now(),
                    "A":values.A,
                    "PICURL":values.PICURL
                },
                
                error: function(xhr, text, err) {
                    smileAlert('#globalstatus', 'Unable to post session values.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', 'trace');
                }, 
                success: function(data) { }
            });
            break;
    }
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

function typeExist(type) {

    var answer = false;

    // We get the /smile/all
    var dataAll = JSON.parse(smile_all());

    for(i=0; i<dataAll.length; i++) {
        if(dataAll[i].TYPE === type) answer = true;
    }
    return answer;
}

function smile_reset() {

    $.ajax({ 
        cache: false, 
        type: "GET", 
        dataType: "text", 
        //contentType: "application/json", 
        url: SMILEROUTES['reset'],
        data: {}, 
        async: false,
        
        error: function(xhr, text, err) {
            smileAlert('#globalstatus', 'Unable to reset.  Reason: ' + xhr.status + ':' + xhr.responseText, 'trace');
        }, 
        success: function(data) {}
    });
}

function smile_iqsets() {

    var iqsets;

    $.ajax({ 
        cache: false, 
        type: "GET", 
        dataType: "text", 
        url: SMILEROUTES["iqsets"],
        async: false,
        data: {}, 
        
        error: function(xhr, text, err) {
            smileAlert('#globalstatus', 'Unable to call /smile/iqsets.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', 'trace');
        }, 
        success: function(data) { 
            iqsets = data; 
        }
    });
    return iqsets;
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