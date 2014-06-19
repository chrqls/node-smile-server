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

var VERSION = '0.8.9';

// Interval of time used to update the GlobalViewModel
var DELAY_UPDATE_BOARD = 3000;
var DELAY_ERROR = 60000;
var DELAY_SHORT = 9000;
var DELAY_NORMAL = 18000;/*
var DELAY_LONG = 20000;*/

var SMILEROUTES = {
    'all': '/smile/all',
    'reset': '/smile/reset',
    'iqsets': '/smile/iqsets',
    'iqset': '/smile/iqset',
    'question': '/smile/question',
    'session': '/smile/createsession',
    'startmake': '/smile/startmakequestion',
    'startsolve': '/smile/startsolvequestion',
    'seeresults': '/smile/sendshowresults',
    'deletequestion': '/smile/questionview/',
    'talk': '/smile/talk/teacher/post',
    'retake': '/smile/retake'
};

var DEAMON_UPDATING_BOARD;

$(document).ready(function() {
    
    // Init Data Model
    ko.applyBindings(GlobalViewModel);

    GlobalViewModel.redirectView();
});

/* ------------------

         MODELS

   ------------------ */

var Student = function(name,ip) {

    this.name = name;
    this.ip = ip;
    this.questions = [];
}

var Question = function(sessionID,urlImage,author,question,answer,options,ip,type) {

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
    status: ko.observable(''),
    group_name: ko.observable(''),
    teacher_name: ko.observable(''),
    session_name: ko.observable(''),
    new_iqset_name: ko.observable(''),
    message_for_student: ko.observable(''),

    // Use prepared questions
    iqsets: ko.observableArray([]),
    
    // Preview IQSet
    iqset_to_preview: ko.observableArray([]),

    // Start making questions
    students: ko.observableArray([]),
    questions: ko.observableArray([]),

    // Detail of a question
    question_detail: ko.observableArray([]),

    // Detail of a student
    student_detail: ko.observableArray([])
};

/* ------------------

      KO EXTENDERS

   ------------------ */

// This adds the required extender for validation
ko.extenders.required = function(target, overrideMessage) {
    //add some sub-observables to our observable
    target.hasError = ko.observable();
    target.validationMessage = ko.observable();

    //define a function to do validation
    function validate(newValue) {
        target.hasError(newValue ? false : true);
        target.validationMessage(newValue ? '' : overrideMessage || 'This field is required');
    }

    //initial validation
    validate(target());

    //validate whenever the value changes
    target.subscribe(validate);

    //return the original observable
    return target;
};

/* -----------------------------------
 

                ACTIONS
    (functions called by the view)


   ----------------------------------- */

GlobalViewModel.redirectView = function() {

    GlobalViewModel.questions.removeAll();
    GlobalViewModel.students.removeAll();

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
                // If we are at least at START_MAKE phase, we display the 'status' progress bar
                switchProgressBar('loading');

                section = 'general-board';
                clearInterval(DEAMON_UPDATING_BOARD);
                DEAMON_UPDATING_BOARD = setInterval(updateGVM, DELAY_UPDATE_BOARD);
                break;

            case 'START_SOLVE':
                $('.start_solving').addClass('hidden');
                $('.see_results').removeClass('hidden');
                break;

            case 'START_SHOW':
                $('.see_results').addClass('hidden');
                $('.retake').removeClass('hidden');
                calculateAndShowResults(dataAll);
                break;

            case 'QUESTION':
            case 'QUESTION_PIC': 
                addQuestion(dataAll[i]); break;
            case 'HAIL':         
                addStudent(dataAll[i]);  break;
            case 'ANSWER':       
                questionsAnsweredByStudent(dataAll[i].IP); break;
        }
    }
    switchSection(section);
}

GlobalViewModel.createSession = function() {
    
    if(!typeExist('SESSION_VALUES')) {
        if (!this.teacher_name() || this.teacher_name() === '') { this.teacher_name('Unknown'); }
        if (!this.session_name() || this.session_name() === '') { this.session_name('Unspecified'); }
        if (!this.group_name() || this.group_name() === '')     { this.group_name('General');  }

        // Send session values to server
        postMessage('session');
    }
    this.redirectView();
}

GlobalViewModel.resetSession = function() {
    
    this.teacher_name('');
    this.session_name('');
    this.group_name('');
    this.status('');
    switchProgressBar('');
    GlobalViewModel.questions.removeAll();
    GlobalViewModel.students.removeAll();
    clearInterval(DEAMON_UPDATING_BOARD);
    
    // Reset the session on server
    smile_reset();

    this.redirectView();
}

GlobalViewModel.startMakingQuestions = function() {

    // If a session does not already exist, we send a 'start_make' signal to the server
    if(!typeExist('START_MAKE')) postMessage('startmake');

    location.reload();
}

GlobalViewModel.usePreparedQuestions = function() {

    // If a session is already running, we redirect directly to the current session
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

        // Preparing listener for single selection (radio mode)
        $('section[smile=list-of-iqsets] table tr').click(function() {
            if(!$(this).hasClass('selected')) {
                $('section[smile=list-of-iqsets] table tr.selected').each(function(index) {
                    $(this).removeClass('selected');
                });
                $(this).addClass('selected');
            }
        });
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

    if($('section[smile=list-of-iqsets] table tr.selected')) {
        
        var positionOfIQSet = document.querySelector('[smile=list-of-iqsets]')
                                      .querySelector('[class=selected]')
                                      .getAttribute('position_iqset');
        
        /* We get the position to get the id of the iqset */
        var iqset = JSON.parse(smile_iqset(GlobalViewModel.iqsets()[positionOfIQSet].id));
        var iqdata = iqset.iqdata;

        for (i = 0; i < iqdata.length; i++) {

            // We send each question to the server
            postMessage('question',iqdata[i]);
        }
        
        postMessage('startmake');

        DEAMON_UPDATING_BOARD = setInterval(updateGVM, DELAY_UPDATE_BOARD);
        location.reload();
    } else {
        absoluteAlert('Please <b>select</b> an iqset', DELAY_SHORT,'red');
    }
}

GlobalViewModel.startSolvingQuestions = function() {

    postMessage('startsolve');
    absoluteAlert('Trying to start solving...', DELAY_SHORT);
    this.redirectView();
}


function questionsAnsweredByStudent(IP_student, withAbsoluteAlert) {

    $('table#students tr').each(function(index) {

        var td_name = $(this).find('td[smile=name_of_student]');
        var td_IP = $(this).find('td[smile=ip_of_student]');
    
        if(td_IP.find('input[type=hidden]').val() === IP_student && !td_name.hasClass('answered')) {
            td_name.addClass('answered');
            if(withAbsoluteAlert) absoluteAlert('<b>'+td_name.find('input[type=hidden]').val()+'</b> finished answering!',DELAY_NORMAL);
        }
    });
}

GlobalViewModel.seeResults = function() {

    $('.see_results').addClass('hidden');
    postMessage('seeresults');
    absoluteAlert('Trying to see results...', DELAY_SHORT);
    this.redirectView();
}

GlobalViewModel.retake = function() {
    
    var status = smile_retake();
    console.log('status='+status);
    this.redirectView();
}

function detailStudent() {

    var selected = $('table#students tr.selected');

    if(selected.length == 1) {

        var IP_studentToDetail = selected.find('td[smile=ip_of_student] input[type=hidden]').val();
        
        // We remove the previous student detailed
        GlobalViewModel.student_detail.removeAll();

        // We get the /smile/all
        var dataAll = JSON.parse(smile_all());

        var studentToDetail = new Student('Unknown',IP_studentToDetail);

        for (i = 0; i < dataAll.length; i++) {

            if(dataAll[i].TYPE === 'HAIL' && dataAll[i].IP === IP_studentToDetail) {
                studentToDetail.name = dataAll[i].NAME;
            }

            // If the question is still in session, we load the details
            if((dataAll[i].TYPE === 'QUESTION' || dataAll[i].TYPE === 'QUESTION_PIC') && dataAll[i].IP === IP_studentToDetail) {

                var options = [];
                options.push(
                    dataAll[i].O1,
                    dataAll[i].O2,
                    dataAll[i].O3,
                    dataAll[i].O4
                );

                var question = new Question(
                    dataAll[i].SessionID,
                    dataAll[i].PICURL,
                    dataAll[i].NAME,
                    dataAll[i].Q,
                    dataAll[i].A,
                    options,
                    dataAll[i].IP,
                    dataAll[i].TYPE
                );

                studentToDetail.questions.push(question);
            }
        }

        GlobalViewModel.student_detail.push(studentToDetail);

        // We highlight the right answers
        $('section[smile=student-detail] .question').each(function() {

            var answer = parseInt($(this).find('[type=hidden]').val());

            var options = $(this).find('#options span');
            
            $(this).find('#options span').each(function(index) {
        
                if(index+1 === answer) {
                    $(this).addClass('rightAnswer');
                }
            });
        });

        switchSection('student-detail');
    
    } else if(selected.length > 1) {
        absoluteAlert('Please select <b>only</b> one student', DELAY_SHORT,'red');
    } else {
        absoluteAlert('Please <b>select</b> a student', DELAY_SHORT,'red');
    }
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

    if(GlobalViewModel.status() !== 'START_MAKE') {
        $('section[smile=question-detail]').find('a.delete').addClass('hidden');
    } 
        
    switchSection('question-detail');
}

function confirmDeletion(sessionID) {

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

                $.ajax({ 
                    cache: false, 
                    type: 'DELETE', 
                    //dataType: "text",
                    contentType: 'application/json', 
                    url: urlDeletingQuestion,
                    data: {}, 
                    
                    error: function(xhr, text, err) {
                        absoluteAlert('Unable to remove question from session', DELAY_ERROR, 'trace');
                    }, 
                    success: function(data) {
                        absoluteAlert('Question of student deleted!', DELAY_NORMAL, 'green');
                        switchSection('general-board');

                        // Decrementing number of questions of a student (if the question does not come from an iqset)
                        if(GlobalViewModel.students().length) {

                            $('table#students tr').each(function(index) {
                            
                                if($(this).find('td[smile=ip_of_student] input[type=hidden]').val() === data.IP) {

                                    var amount = $(this).find('td[smile=number_of_questions] span');
                                    amount.text(parseInt(amount.text())-1);
                                    if(amount.text() === '0') {
                                        amount.removeClass('sticker_positive');
                                        amount.addClass('sticker_null');
                                    }
                                }
                            });
                        }
                    }
                });
            }
        }
    }
}

/*
    TALK TO A STUDENT ?
*/
function showTalkForm() {
    $('#talkButton_with_form').removeClass('hidden');
    $('#talkButton_without_form').addClass('hidden');
}
function hideTalkForm() {
    $('#talkButton_with_form').addClass('hidden');
    $('#talkButton_without_form').removeClass('hidden');
    GlobalViewModel.message_for_student('');
}
GlobalViewModel.talkToStudent = function() {

    if($('table#students tr.selected').length > 0) {

        $('table#students tr.selected').each(function(index) {
        
        var message = {};

        message['TYPE'] = 'TEACHER'; 
        message.TEXT = GlobalViewModel.message_for_student();
        message.IP = $(this).find('td[smile=ip_of_student] input[type=hidden]').val();

        postMessage('talk',JSON.stringify(message));
        });
    } else {
        absoluteAlert('Please <b>select</b> a student', DELAY_SHORT,'red');
    }
}


/*
    SAVE A NEW IQSET
*/
function showSaveForm() {
    $('#saveButton_with_form').removeClass('hidden');
    $('#saveButton_without_form').addClass('hidden');
}
function hideSaveForm() {
    $('#saveButton_with_form').addClass('hidden');
    $('#saveButton_without_form').removeClass('hidden');
    GlobalViewModel.new_iqset_name('');
}
GlobalViewModel.saveNewIQSet = function() {

    if($('table#questions tr.checked').length > 0) {
        var iqset = {};
        iqset['iqdata'] = []; 
        iqset.title = GlobalViewModel.new_iqset_name();

        $('table#questions tr.checked').each(function(index) {

            for(i=0; i<GlobalViewModel.questions().length; i++) {

                if($(this).find('input[type=hidden]').attr('name') === GlobalViewModel.questions()[i].session_id) {
                    
                    iqset.iqdata.push({
                        "PICURL":GlobalViewModel.questions()[i].urlImage,
                          "NAME":GlobalViewModel.questions()[i].author,
                             "Q":GlobalViewModel.questions()[i].question,
                             "A":GlobalViewModel.questions()[i].answer,
                            "IP":"No IP address",
                            "O4":GlobalViewModel.questions()[i].options[3],
                            "O3":GlobalViewModel.questions()[i].options[2],
                            "O2":GlobalViewModel.questions()[i].options[1],
                            "O1":GlobalViewModel.questions()[i].options[0],
                          "TYPE":GlobalViewModel.questions()[i].type
                    });
                }
            }
        });
        postMessage('iqset',JSON.stringify(iqset));
    } else {
        absoluteAlert('Please select <b>at least</b> one question', DELAY_SHORT,'red');
    }
}



/* --------------------------------------------------------



                           UTILITY
         (encapsulation of code used by the actions)



   -------------------------------------------------------- */

function absoluteAlert(text, lifetime, alerttype, hasCross) {
    
    var container = '#absolute_alerts';
    var alertID = 'id_'+Math.floor(Math.random()*99999);
    var cross = hasCross? '<a style="color:white;opacity:0.7" class="close" href="">×</a>' : '';

    // Types of box
    var box_grey = 'secondary';
    var box_red = 'alert';
    var box_blue = '';
    var box_green = 'success';
    
    if (!alerttype)                 { alerttype = box_grey; } 
    else if (alerttype === 'trace') { alerttype = box_red; text += ' : ' + printStackTrace(); } 
    else if (alerttype === 'red')   { alerttype = box_red; } 
    else if (alerttype === 'blue')  { alerttype = box_blue; } 
    else if (alerttype === 'green') { alerttype = box_green; } 

    var html_to_inject = '<div id="%s"> \
                            <div style="margin:3px 0;opacity:0.8;display: inline-block;padding-right:30px" class="alert-box %s" data-alert=""> \
                              <span style="font-weight:normal">%s</span>%s \
                            </div> \
                          </div>';

    $(container).append(sprintf(html_to_inject, alertID, alerttype, text, cross));

    if (lifetime) {
        setInterval(function() {
            $(container).find('#'+alertID).fadeOut().remove();
        }, lifetime)
    }
}

function switchSection(newSection) {
    $('section.visible').removeClass('visible').addClass('hidden');
    $('section[smile='+newSection+']').addClass('visible').removeClass('hidden');
}

function switchProgressBar(newProgressBar) {
    $('.status-progress-bars div.visible').removeClass('visible').addClass('hidden');
    $('.status-progress-bars div[smile='+newProgressBar+']').addClass('visible').removeClass('hidden');
}

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
    ));

    // Incrementing number of questions of a student (if the question does not come from an iqset)
    if(GlobalViewModel.students().length) {

        $('table#students tr').each(function(index) {
        
            if($(this).find('td[smile=ip_of_student] input[type=hidden]').val() === question.IP) {

                var amount = $(this).find('td[smile=number_of_questions] span');
                amount.text(parseInt(amount.text())+1);
                if(parseInt(amount.text()) > 0) {
                    amount.removeClass('sticker_null');
                    amount.addClass('sticker_positive');
                }
            }
        });
    }
}

function addStudent(student) {

    GlobalViewModel.students.push(
        new Student(
            student.NAME,
            student.IP
        )
    );
}

// To recap, each time this function is called, it updates students, questions, and session values
function updateGVM() {

    // Getting /smile/all
    var dataAll = JSON.parse(smile_all());

    var GVM_questions = '';
    var GVM_students = '';

    // Removing questions not present on server
    for(i=0; i<GlobalViewModel.questions().length; i++) {

        if(!JSON.stringify(dataAll).contains('"SessionID":"'+GlobalViewModel.questions()[i].session_id+'"')) {
            GlobalViewModel.questions.remove(GlobalViewModel.questions()[i]);
        } else {
            GVM_questions += JSON.stringify(GlobalViewModel.questions()[i]);
        }
    }
    // Removing students not present on server
    for(i=0; i<GlobalViewModel.students().length; i++) {

        if(!JSON.stringify(dataAll).contains('"IP":"'+GlobalViewModel.students()[i].ip+'"')) {
            GlobalViewModel.students.remove(GlobalViewModel.students()[i]);
        } else {
            GVM_students += JSON.stringify(GlobalViewModel.students()[i]);
        }
    }

    // Update all values available on server in the GlobalViewModel
    for(i=0; i<dataAll.length; i++) {

        switch(dataAll[i].TYPE) {

            case 'START_MAKE':
                if(GlobalViewModel.students().length > 0) {
                    $('.start_solving').removeClass('hidden');
                }
                GlobalViewModel.status('START_MAKE');
                switchProgressBar('start-make');
                break;
            case 'START_SOLVE': 
                GlobalViewModel.status('START_SOLVE');
                switchProgressBar('start-solve');
                $('.start_solving').addClass('hidden');
                $('.see_results').removeClass('hidden');
                break;
            case 'START_SHOW':  
                GlobalViewModel.status('START_SHOW');
                switchProgressBar('start-show');
                $('.see_results').addClass('hidden');
                $('.retake').removeClass('hidden');
                break;

            case 'SESSION_VALUES':
                if(dataAll[i].teacherName !== GlobalViewModel.teacher_name()) {
                    GlobalViewModel.teacher_name(dataAll[i].teacherName);
                    GlobalViewModel.session_name(dataAll[i].sessionName);
                    GlobalViewModel.group_name(dataAll[i].groupName);
                }
            break;

            case 'HAIL':
                if(!GVM_students.contains('"ip":"'+dataAll[i].IP+'"')) {
                    addStudent(dataAll[i]);
                    absoluteAlert('<b>'+dataAll[i].NAME+'</b> appears!',DELAY_NORMAL);
                }
            break;

            case 'QUESTION':
            case 'QUESTION_PIC':
                if(!GVM_questions.contains('"session_id":"'+dataAll[i].SessionID+'"')) {
                    addQuestion(dataAll[i]);
                    absoluteAlert('New question from <b>'+dataAll[i].NAME+'</b>!',DELAY_NORMAL);
                }
            break;
            case 'ANSWER':
                questionsAnsweredByStudent(dataAll[i].IP,true); 
                break;
        }
    }

    /*
        Each time updateGVM() is called, we have to wake up those listeners (by doing off/on).
        Why? If you call a 'click' listener already listening, the listener will be disabled
    */
    // Single selection for students
    $(document).off('click', 'table#students tr').on('click', 'table#students tr', function() {
        if(!$(this).hasClass('selected')) {
            $('table#students tr.selected').each(function(index) {
                $(this).removeClass('selected');
            });
            $(this).addClass('selected');
            $('div[smile=talk-to-student]').parent().removeClass('hidden');
        } else {
            $(this).removeClass('selected');
            hideTalkForm();
            $('div[smile=talk-to-student]').parent().addClass('hidden');
        }
    });
    // Multiple selection for questions
    $(document).off('click', 'table#questions tr').on('click', 'table#questions tr', function() {
        if($(this).hasClass('checked')) {
            $(this).removeClass('checked');
            if($('table#questions tr.checked').length === 0) {
                $('div[smile=save-new-iqset]').parent().addClass('hidden');
                hideSaveForm();
            }
        } else {
            $(this).addClass('checked');
            $('div[smile=save-new-iqset]').parent().removeClass('hidden');
        }
    });
}

function calculateAndShowResults(dataAll) {

    var students_results = [];
    var size_Q;
    var answers;
    // To display in tables
    var scores = [];
    var best_score = 0;
    var percents_success;
    var percents_success_sessionIDs = [];

    // Extracting all values
    for(var i=0; i<dataAll.length; i++) {

        switch(dataAll[i].TYPE) {

            case 'QUESTION':
            case 'QUESTION_PIC':

                percents_success_sessionIDs.push(dataAll[i].SessionID);
                break;

            case 'ANSWER':
                var studentResults = {};
                    studentResults.IP = dataAll[i].IP;
                    studentResults.MYANSWER = dataAll[i].MYANSWER;
                
                students_results.push(studentResults);
                break;
            
            case 'START_SHOW':
                answers = dataAll[i].RANSWER;
                size_Q = dataAll[i].NUMQ;
                percents_success = dataAll[i].RPERCENT;
                break;
        }
    }

    // Data processing
    for(var i=0; i<students_results.length; i++) {

        var points = 0;
        var score = {};
        score.IP = students_results[i].IP;

        for(var j=0; j<answers.length; j++) {

            if(parseInt(students_results[i].MYANSWER[j]) === answers[j]) {
                points++;
            }
        }
        score.SCORE = Math.round((100*points/size_Q) * 10 ) / 10;
        if(score.SCORE > best_score) best_score = score.SCORE;
        scores.push(score);
    }

    // Injecting values to display in student and question tables
    $('table#students tr').each(function(index) {
        for(var i=0; i<scores.length; i++) {
            if($(this).find('td[smile=ip_of_student] input[type=hidden]').val() === scores[i].IP) {
                
                var html;

                if(scores[i].SCORE === best_score)
                     html = '<span class="gold_score">';
                else html = '<span class="score">';

                html += scores[i].SCORE+'<span style="font-size:14px">%</span></span>'

                $(this).find('.score_container').html(html);
            }
        }
    });
    $('table#questions tr').each(function(index) {
        for(var i=0; i<percents_success.length; i++) {

            if($(this).find('input[type=hidden]').attr('name') === percents_success_sessionIDs[i]) {

                var html;

                if(parseInt(percents_success[i]) > 50)
                     html = '<span class="percent_success">';
                else html = '<span class="percent_fail">';

                html += percents_success[i]+'<span style="font-size:14px">%</span></span>'

                $(this).find('.percentSuccess_container').html(html);
            }
        }
    });
}

// Very useful to redirect views if a message already exists
function typeExist(type) {

    var answer = false;

    // We get the /smile/all
    var dataAll = JSON.parse(smile_all());

    for(i=0; i<dataAll.length; i++) {
        if(dataAll[i].TYPE === type) answer = true;
    }
    return answer;
}

/*
        ----------
           POST 
        ---------- */
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
                    absoluteAlert('Unable to send SESSION_VALUES to server', DELAY_NORMAL, 'trace');
                }, 
                success: function(data) {}
            });
            break;

        case 'startmake':

            $.ajax({ 
                cache: false, 
                type: 'POST', 
                dataType: 'text', 
                url: SMILEROUTES['startmake'],
                data: { "TYPE":"START_MAKE" }, 
                async: false,
                
                error: function(xhr, text, err) {
                    absoluteAlert('Unable to send START_MAKE phase', DELAY_ERROR, 'trace', true);
                }, 
                success: function(data) {}
            });
            break;

        case 'startsolve':

            $.ajax({ 
                cache: false, 
                type: 'GET', 
                contentType: 'application/json',
                dataType: 'text',
                url: SMILEROUTES['startsolve'],
                data: {}, 
                //async: false,
                
                error: function(xhr, text, err) {
                    absoluteAlert('Unable to send START_SOLVE phase', DELAY_ERROR, 'trace', true);
                }, 
                success: function(data) {
                    absoluteAlert('Your students can start answering questions.', DELAY_NORMAL, 'green');
                }
            });
            break;

        case 'seeresults':

            $.ajax({ 
                cache: false, 
                type: 'GET', 
                contentType: 'application/json',
                url: SMILEROUTES['seeresults'],
                data: {}, 
                //async: false,
                
                error: function(xhr, text, err) {
                    absoluteAlert('Unable to send START_SHOW phase', DELAY_ERROR, 'trace', true);
                }, 
                success: function(dataAll) {
                    absoluteAlert('Your students can see the results now!', DELAY_NORMAL, 'green');
                    calculateAndShowResults(dataAll);
                }
            });
            break;

        case 'question':

            $.ajax({ 
                cache: false, 
                type: 'POST', 
                dataType: 'text', 
                url: SMILEROUTES['question'],
                //async: false,

                data: {
                    'TYPE':values.TYPE,
                    'IP':values.IP,
                    'NAME':values.NAME,
                    'O1':values.O1,
                    'O2':values.O2,
                    'O3':values.O3,
                    'O4':values.O4,
                    'Q':values.Q,
                    'SessionID':Date.now(),
                    'A':values.A,
                    'PICURL':values.PICURL
                },
                
                error: function(xhr, text, err) {
                    absoluteAlert('Unable to post session values.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', DELAY_ERROR, 'trace');
                }, 
                success: function(data) {}
            });
            break;

        case 'iqset':

            $.ajax({ 
                cache: false, 
                type: 'POST', 
                contentType: 'application/json',
                url: SMILEROUTES['iqset'],
                //async: false,
                data: values,
                
                error: function(xhr, text, err) {
                    absoluteAlert('Unable to post session values.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', DELAY_ERROR, 'trace');
                }, 
                success: function(data) {
                    absoluteAlert('New iqset <i>"'+data.title+'"</i> saved!',DELAY_NORMAL,'green');
                    hideSaveForm();
                }
            });
            break;

        case 'talk':

            $.ajax({ 
                cache: false, 
                type: 'POST', 
                contentType: 'application/json',
                url: SMILEROUTES['talk'],
                //async: false,
                data: values,
                
                error: function(xhr, text, err) {
                    absoluteAlert('Unable to send your message  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', DELAY_ERROR, 'trace');
                }, 
                success: function(data) {

                    absoluteAlert('Message <b>sent</b>!',DELAY_NORMAL,'green');
                    
                    // Hiding 'Talk' button
                    $('table#students tr.selected').each(function(index) {
                        $(this).removeClass('selected');
                    });
                    hideTalkForm();
                    $('div[smile=talk-to-student]').parent().addClass('hidden');
                }
            });
            break;
    }
}

/*
        ---------
           GET 
        ---------*/
function smile_all() {

    var all;

    $.ajax({ 
        cache: false, 
        type: 'GET', 
        dataType: 'text', 
        url: SMILEROUTES['all'], 
        async: false,
        data: {}, 
        error: function(xhr, text, err) {
            absoluteAlert('Unable to call /smile/all', DELAY_ERROR, 'trace',true);
        }, 
        success: function(data) { all = data; }
    });
    return all;
}

function smile_reset() {

    $.ajax({ 
        cache: false, 
        type: 'GET', 
        dataType: 'text', 
        //contentType: "application/json", 
        url: SMILEROUTES['reset'],
        data: {}, 
        async: false,
        
        error: function(xhr, text, err) {
            absoluteAlert('Unable to reset.  Reason: ' + xhr.status + ':' + xhr.responseText, DELAY_ERROR, 'trace',true);
        }, 
        success: function(data) {}
    });
}

function smile_retake() {

    $.ajax({ 
        cache: false, 
        type: 'GET', 
        dataType: 'text', 
        //contentType: "application/json", 
        url: SMILEROUTES['retake'],
        data: {}, 
        async: false,
        
        error: function(xhr, text, err) {
            absoluteAlert('Unable to retake.  Reason: ' + xhr.status + ':' + xhr.responseText, DELAY_ERROR, 'trace',true);
        }, 
        success: function(data) {}
    });
}

function smile_iqsets() {

    var iqsets;

    $.ajax({ 
        cache: false, 
        type: 'GET', 
        dataType: 'text', 
        url: SMILEROUTES['iqsets'],
        async: false,
        data: {}, 
        
        error: function(xhr, text, err) {
            absoluteAlert('Unable to call /smile/iqsets.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', DELAY_ERROR, 'trace',true);
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
        type: 'GET', 
        dataType: 'text', 
        url: SMILEROUTES['iqset']+'/'+id, 
        async: false,
        data: {},  
        error: function(xhr, text, err) {
            absoluteAlert('Unable to call /smile/iqset/{key}', DELAY_ERROR, 'trace',true);
        }, 
        success: function(data) { iqset = data; }
    });
    return iqset;
}
