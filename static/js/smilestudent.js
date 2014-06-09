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

var VERSION = '1.1.0';

var DELAY_UPDATE_BOARD = 1500;
var DELAY_PRIVATE_MESSAGE = 5000;
var DELAY_ERROR = 60000;
var DELAY_SHORT = 5000;
var DELAY_NORMAL = 10000;/*
var DELAY_LONG = 20000;*/

var DEAMON_UPDATING_BOARD = null;
var DEAMON_LISTENING_PRIVATE_MESSAGE = null;

var STARTTIME;
var ALPHASEQ = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
var DIGITSEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
var CLIENTIP = '127.0.0.1';

var SMILEROUTES = {
    "pushmsg": "/JunctionServerExecution/pushmsg.php",
    "smsg": "/JunctionServerExecution/current/MSG/smsg.txt",
    "mystate": "/JunctionServerExecution/current/MSG/%s.txt",
    "postinquiry": "/smile/question",
    "getinquiry": "/smile/questionview/%s.json",
    "submitanswers": "/smile/pushmsg.php",
    "echoclientip": "/smile/echoclientip",
    "defaultpicurl": "/images/1x1-pixel.png",
    "getresults": "/smile/student/%s/result",
    "getprivatemessage": "/smile/talk/student/get"
};

/*
    1 - login screen
    2 - logged in, waiting
    3 - making questions
    4 - answering questions
    5 - results
*/
var STATEMACHINE = {
    "1": { "label": "Login", "id": "#login-pane1"
    }, "2": { "label": "Get Ready", "id": "#start-pane1"
    }, "3": { "label": "Make Qs", "id": "#makeq-pane1"
    }, "4": { "label": "Answer Qs", "id": "#answerq-pane1"
    }, "5": { "label": "Results", "id": "#results-pane1"
    }
};  // We should store transitions
var SMILESTATE = "1";

//
// KO Extenders
//
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


//
// Data Models
//
// Multimodel approach: See fiddle here: http://jsfiddle.net/npJZM/10/
// Another good approach:  http://bit.ly/QzIgHP
//

/**
 Model for SMILE Inquiry Type 2 - For use with SMILE 2.x clients and servers

 Note: This should get generalized into the common protocol, though we should try to maintain
 backwards compatibility for Type 2 clients and servers

 */
var SMILEInquiry2 = function(question, answer1, answer2, answer3, answer4, rightanswer, picurl) {
    var self = this;
    self.question = question;
    self.answer1 = answer1;
    self.answer2 = answer2;
    self.answer3 = answer3;
    self.answer4 = answer4;
    self.rightanswer = rightanswer;
    self.picurl = picurl;
    if ((self.picurl === "") || (self.picurl === undefined)) {
        self.type = "QUESTION";
    } else {
        self.type = "QUESTION_PIC";
    }
}

/**
 * We should refactor out any items that belong in specialized child ViewModels
 * Candidates:
 * - LoginModel
 * - MsgModel
 * - StateModel
 */
var GlobalViewModel = {
    username: ko.observable(nameGen(8)).extend({ required: "Please enter a username" }),
    realname: ko.observable(""),
    clientip: ko.observable(""),
    loginstatusmsg: ko.observable(""),
    sessionstatemsg: ko.observable(""),
    othermsg: ko.observable(""),
    hasSubmitted: ko.observable(false),
    iqx: ko.observableArray([new SMILEInquiry2()]),
    answer: ko.observable(""),
    question: ko.observable(""),
    a1: ko.observable(""),
    a2: ko.observable(""),
    a3: ko.observable(""),
    a4: ko.observable(""),
    rightanswer: ko.observable(""),
    numq: ko.observable(""),
    curq: ko.observable(0),
    qidx: ko.observable(0),
    picurl: ko.observable(""),
    pic: ko.observable(""),
    picdatauri: ko.observable("data:image/png;base64,"),
    rating: ko.observable(""),
    answersarray: ko.observableArray([]),
    ratingsarray: ko.observableArray([]),
    version: ko.observable(VERSION)
};

GlobalViewModel.fullName = ko.computed(function() {
    var self = this;
    // Knockout tracks dependencies automatically. It knows that fullName depends on firstName and lastName, because these get called when evaluating fullName.
    return self.username + " " + self.realname;
}, self);

GlobalViewModel.curq = ko.computed(function() {
    var self = this;
    // Knockout tracks dependencies automatically. It knows that fullName depends on firstName and lastName, because these get called when evaluating fullName.
    return self.qidx + 1;
}, self);

/* XXX This doesn't notify
GlobalViewModel.picdatauri = ko.computed(function() {
    var self = this;
    // Knockout tracks dependencies automatically. It knows that fullName depends on firstName and lastName, because these get called when evaluating fullName.
    console.log(self.pic);
    return 'data:image/png;base64,' + self.pic;
}, self).extend({ notify: 'always' });
*/

GlobalViewModel.doLogin = function() {
    var self = this;
    if (!self.username() || self.username() === "") {
        absoluteAlert('Please Enter a <b>username</b>', DELAY_SHORT,'red');
        return false;
    }
    if (!self.hasSubmitted()) {
        console.log('doLogin');
        absoluteAlert('Logging as ' + self.username(), DELAY_SHORT,'green');
        doSmileLogin(self.clientip(), self.username(), self.realname());
    }
    self.hasSubmitted(true);

    return false;
}

GlobalViewModel.validateInquirySubmission = function() {
    var self = this;
    console.log('a1: ' + self.a1() + ' a2: ' + self.a2() + ' a3: ' + self.a3() + ' a4 : ' + self.a4() + ' rightanswer: ' + self.rightanswer() + ' question: ' + self.question());
    return (self.a1() != "" && self.a2() != "" && self.a3() != "" && self.a4() != "" && self.rightanswer() != "" && self.question() != "");
}

GlobalViewModel.validateInquiryAnswer = function() {
    var self = this;
    return (self.answer() != "");
}

GlobalViewModel.doLoginReset = function() {
    this.username(nameGen(8));
    this.realname("");
    this.hasSubmitted(false);
    //
    // XXX This is silly, fix this, cleanup the object model and reset the state
    // For now just reload the page
    //
    window.location.href = window.location.pathname;
    window.location.reload(true);
    return false;
}

GlobalViewModel.doInquiryReset = function() {
    var self = this;
    self.a1("");
    self.a2("");
    self.a3("");
    self.a4("");
    self.answer("");
    self.rightanswer("");
    self.question("");
    self.picurl("");
    self.pic("");
    self.picdatauri("");
    self.rating("5");
}

GlobalViewModel.doSubmitQ = function() {
    var self = this;
    //console.log(">>>> >>> >> > doSubmitQ");
    if (self.validateInquirySubmission()) {

    $('#submit-inquiry-area').hide();
        var jsondata = generateJSONInquiry(self.clientip(), self.username(), self.question(), self.a1(), self.a2(), self.a3(), self.a4(), self.rightanswer(), self.picurl(), self.pic());
        doPostInquiry(jsondata, function() {
            self.doInquiryReset();
            $('#iq-pic').empty();
    });
    $('#submit-inquiry-area').show();
    } else {
        console.log("Cannot validateInquiry");
        $('div#inquiry-form-area').block({
            message: '<h3>Please fill in all fields and check correct answer</h3>',
            css: { border: '3px solid #a00', width: '30%'
            },
            timeout: 7000
        });
    }

}

GlobalViewModel.doSubmitQandDone = function() {
    var self = this;
    console.log("doSubmitQandDone");
    if (self.validateInquirySubmission()) {

    $('#submit-inquiry-area').hide();
        var jsondata = generateJSONInquiry(self.clientip(), self.username(), self.question(), self.a1(), self.a2(), self.a3(), self.a4(), self.rightanswer(), self.picurl(), self.pic());
        doPostInquiry(jsondata, function() {
            console.log("waiting for next phase");
            self.doInquiryReset();
            // XXX Localize this
            $('#iq-pic').empty();
            $('div#inquiry-form-area').block({
                message: '<h1>Done.  Please wait for the rest of the students to finish Creating Questions</h1>',
                css: { border: '3px solid #a00', width: '80%'
                }
            });
        });
    } else {
        // XXX Refactoring candidate
        console.log("Cannot validateInquiry");
        $('div#inquiry-form-area').block({
            message: '<h3>Please fill in all fields and check correct answer</h3>',
            css: { border: '3px solid #a00', width: '30%'
            },
            timeout: 7000
        });
    }
}

GlobalViewModel.doSaveAnswerState = function() {
    var self = this;
    //console.log(">>>>>>>>>>doSaveAnswerState");
    self.answersarray()[self.qidx()] = self.answer()[1]; // Drop the leading 'a' from the answer label
    self.ratingsarray()[self.qidx()] = self.rating();
}

GlobalViewModel.doAnswerPrevQ = function() {
    var self = this;
    //console.log(">>>>>>>>>>doAnswerPrevQ");
    self.doSaveAnswerState();

    // Check if there are more questions

    if ((GlobalViewModel.qidx()) > 0) {
        GlobalViewModel.qidx(GlobalViewModel.qidx() - 1);
        doGetInquiry(GlobalViewModel.qidx());
    } else {
        //
        // Can't go past the 1st question
        //
        /* $('div#answer-form-area').block({
         message: '<h1>Done.  Please wait for the rest of the students to finish Answering Questions</h1>',
         css: { border: '3px solid #a00'
         ,width: '80%'
         }
         }); */
    }
}

GlobalViewModel.doAnswerNextQ = function() {
    var self = this;
    //console.log(">>>>>>>>>>doAnswerNextQ");

    self.doSaveAnswerState();

    //
    // Validate the answer
    //
    if (!self.validateInquiryAnswer()) {
        $('div#answer-form-area').block({
            message: '<h3>Please select an answer</h3>',
            css: { border: '3px solid #a00', width: '30%'
            },
            timeout: 5000
        });
        return;
    }

    // Check if there are more questions
    if ((GlobalViewModel.qidx() + 1) < GlobalViewModel.numq()) {
        GlobalViewModel.qidx(GlobalViewModel.qidx() + 1);
        doGetInquiry(GlobalViewModel.qidx());
    } else {
        //
        // Submit All Questions
        //
        $('div#answer-form-area').block({
            message: '<h1>Done.  Please wait for the rest of the students to finish Answering Questions</h1>',
            css: { border: '3px solid #a00', width: '80%'
            }
        });

        doPostAnswers(GlobalViewModel.answersarray(), GlobalViewModel.ratingsarray(), GlobalViewModel.username(), GlobalViewModel.clientip(), function() {
            //
            // Should we do something else?
            //
            absoluteAlert('Submitted Answers for ' + GlobalViewModel.username(), DELAY_SHORT,'blue');
        });
    }
    /* if (self.validateInquiry()) {
     var jsondata = generateJSONInquiry(self.clientip(), self.username(), self.question(), self.a1(), self.a2(), self.a3(), self.a4(), self.rightanswer(), self.picurl());
     doPostInquiry(jsondata, function() {
     self.doInquiryReset();
     });
     } */

}

$(document).ready(function() {
    //
    // Init globals
    //
    STARTTIME = Date.now();
    setClientIP();
    SMILESTATE = "1";

    //
    // Init Data Model
    //
    ko.applyBindings(GlobalViewModel);

    //
    // Init UI
    //
    $(document).attr("title", "SMILE Student Web " + GlobalViewModel.version());

    restoreLoginState();

    //
    // Init Handlers
    //
    $('section a.wizard').on('click.fndtn', function(e) {
        e.stopPropagation();
        var $activetab = $(this).parent().parent().parent().find('section.active');

        if ($(this).hasClass('disabled')) {
            var txt = $activetab.text().split('.'); // XXX This is non-defensive
            absoluteAlert('Please wait for phase <em>' + txt[1].trim() + '</em> to complete.', DELAY_SHORT);
            return false; // Do something else in here if required
        } else {

            //
            // Toggle the activate tab into disabled state
            //
            $activetab.removeClass('active');
            $activetab.addClass('disabled');

            //
            // Toggle the next state tab into activate state
            //
            $(this).removeClass('disabled');
            $(this).parent().parent().addClass('active');
            window.location.href = $(this).attr('href');
        }
    });

    //
    // Fix for #50 (github), though we don't know why this is necessary
    //
    $("input[type='radio'].css-checkbox").change(function () {
        var selection=$(this).val();
        $(this).prop('checked', true);
        GlobalViewModel.answer($(this).val());
    });


});

//
// App functions
//
// alerttype
//  - by default, none is required if you don't intend to use lifetime
//  - trace : use the stacktrace in the error message
//  - red : display a red color alert
//  - blue : display a blue color alert
//  - green : display a green color alert
//
/*
function smileAlert(targetid, text, alerttype, lifetime) {
    var defaultalert = 'secondary';
    var redalert = 'alert';
    var bluealert = '';
    var greenalert = 'success';
    var formatstr = '<div class="alert-box %s"> \
        %s \
        <a href="" class="close">&times;</a> \
        </div>';
    if (!alerttype) {
        alerttype = defaultalert;
    } else if (alerttype === 'trace') {
        alerttype = redalert;
        var trace = printStackTrace();
        text = text + ' : ' + trace;
    } else if (alerttype === 'red') {
        alerttype = redalert;
    } else if (alerttype === 'blue') {
        alerttype = bluealert;
    } else if (alerttype === 'green') {
        alerttype = greenalert;
    } else {
        alerttype = defaultalert;
    }
    if (targetid) {
        $(targetid).append(sprintf(formatstr, alerttype, text));
    }
    if (lifetime) {
        setInterval(function() {
            $(targetid).find('.alert-box').fadeOut().remove();
        }, lifetime)
    }
}*/


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

function nameGen(namelen) {
    var dice;
    var alphasetsize = ALPHASEQ.length;
    var digitsetsize = DIGITSEQ.length;
    var name = "";

    // Get alpha portion
    for (var i = 0; i < namelen; i++) {
        dice = Math.floor((Math.random() * alphasetsize));
        name = name + ALPHASEQ[dice];
    }

    // Get digit portion, fixed at 4 digits
    for (var i = 0; i < 4; i++) {
        dice = Math.floor((Math.random() * digitsetsize));
        name = name + DIGITSEQ[dice];
    }
    return name;
}

function randomIPGen() {
    var baseip = '127.0.0.';
    var MAXVAL = 255;
    var dice = dice = Math.floor((Math.random() * MAXVAL) + 1); // A value of 1-255
    return(baseip + dice);
}

function setClientIP() {
    var clientip;
    $.ajax({ 
        cache: false, 
        type: "GET", // XXX should be POST
        dataType: "json", 
        url: SMILEROUTES["echoclientip"], 
        data: {}, 
        error: function(xhr, text, err) {
            absoluteAlert('Cannot obtain client IP address.  Please verify your connection or server status.', DELAY_ERROR,'trace');
        }, 
        success: function(data) {
            clientip = data.ip; // XXX We should be defensive in case garbage comes back
            if (clientip !== '127.0.0.1') {
                CLIENTIP = clientip;
            } else {
                // I've no idea why this would happen, other than on localhost without a real
                // ip address assigned.  But the game doesn't really function if there are multiple
                // duplicate IPs.  To avoid this during testing scenarios generate fake IPs.
                // If the server host cannot handle things properly when trying to figure out a client's IP
                // address, then they'll getback a fake address
                // XXX Note, this is not safe against duplicates.  This is as random as the pseudo-random number
                // generation ... so will be 1 in 255 chance of returning a dup
                CLIENTIP = randomIPGen();
                absoluteAlert('Using fake IP address <b>'+CLIENTIP+'</b>', DELAY_SHORT,'blue');
            }
            GlobalViewModel.clientip(CLIENTIP);
        }
    });
}

function doSmileLogin(clientip, username, realname) {
    var clientip;
    $.ajax({ 
        cache: false, 
        type: "POST", 
        dataType: "text", 
        url: SMILEROUTES["pushmsg"], 
        data: generateEncodedHail(clientip, username), 
        error: function(xhr, text, err) {
            absoluteAlert('Unable to login.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', DELAY_SHORT,'trace');
            GlobalViewModel.hasSubmitted(false); // Reset this so clicks will work
        }, 
        success: function(data) {
            absoluteAlert('Successfully logged in', DELAY_NORMAL,'green');
            // Move to state 2 now
            statechange(1, 2);
            GlobalViewModel.loginstatusmsg("Logged In");
            // GlobalViewModel.sessionstatus();
            startSmileEventLoop();
        }
    });
}

function doGetResults() {
    //
    // TODO
    //
    $.ajax({ 
        cache: false, 
        type: "GET", // XXX should be POST
        dataType: "json", 
        url: sprintf(SMILEROUTES["getresults"], GlobalViewModel.clientip()), 
        data: {}, 
        error: function(xhr, text, err) {
            absoluteAlert('Cannot obtain results.  Please verify your connection or server status.', DELAY_ERROR,'trace');
        }, 
        success: function(data) {
            displayResults(data);
        }
    });
}

function doPostInquiry(inquirydata, cb) {
    $.ajax({ 
        cache: false, 
        type: "POST", 
        dataType: "text", 
        url: SMILEROUTES["postinquiry"], 
        data: inquirydata, 
        error: function(xhr, text, err) {
            // TODO: XXX Decide what to do if this post fails
            absoluteAlert('Unable to post inquiry.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', DELAY_ERROR,'trace');
        }, 
        success: function(data) {
            absoluteAlert('Sent Inquiry Question', DELAY_NORMAL,'green');
            if (cb) {
                cb(data);
            }
            // We should track a count of successful submits
        }
    });
}

//
// Post the answers
//
// Format:
// {"MYRATING":[1,5,5,5,5,5,5,5,5,5,5,5],"MYANSWER":[1,4,4,4,4,4,4,4,4,4,4,4],
// "NAME":"default.102","TYPE":"ANSWER","IP":"10.0.0.102"}
function doPostAnswers(answersarray, ratingsarray, username, clientip, cb) {
    $.ajax({ 
        cache: false, 
        type: "POST", 
        dataType: "text", 
        url: SMILEROUTES["submitanswers"], 
        data: {
            "MSG": JSON.stringify({
            "MYRATING": ratingsarray,
            "MYANSWER": answersarray,
            "NAME": username,
            "TYPE": "ANSWER",
            "IP": clientip})
        }, 
        error: function(xhr, text, err) {
            // TODO: XXX Decide what to do if this post fails
            absoluteAlert('Unable to submit answers.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', DELAY_ERROR,'trace');
        }, 
        success: function(data) {
            if (data) { }
            if (cb) { cb(data); }
        }
    });
}

function doGetInquiry(qnum, cb) {
    $.ajax({ 
        cache: false, 
        type: "GET", 
        dataType: "json", 
        url: sprintf(SMILEROUTES["getinquiry"], qnum), 
        data: {}, 
        error: function(xhr, text, err) {
            // TODO: XXX Decide what to do if this post fails
            absoluteAlert('Unable to get inquiry.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', DELAY_ERROR,'trace');
        }, 
        success: function(data) {
            if (data) {
                GlobalViewModel.question(data.Q);
                GlobalViewModel.rightanswer(data.A);
                GlobalViewModel.a1(data.O1);
                GlobalViewModel.a2(data.O2);
                GlobalViewModel.a3(data.O3);
                GlobalViewModel.a4(data.O4);
                GlobalViewModel.qidx(qnum);
                GlobalViewModel.othermsg((GlobalViewModel.qidx() + 1) + "/" + GlobalViewModel.numq());
                if (GlobalViewModel.answersarray()[GlobalViewModel.qidx()]) {
                    GlobalViewModel.answer("a" + GlobalViewModel.answersarray()[GlobalViewModel.qidx()]);
                } else {
                    GlobalViewModel.answer("");
                }

                if (data.TYPE === "QUESTION_PIC") {
                    GlobalViewModel.picurl(data.PICURL);
                } else {
                    GlobalViewModel.picurl(SMILEROUTES["defaultpicurl"]);
                }

                if (cb) {
                    cb();
                }
            }
        }
    });
}
/**
 *
 * doSMSG - This handles server side polling.  TODO - get rid of server side polling and use socket.io
 *
 * On success : review incoming messages to see what state we are in
 * On error : absoluteAlert
 */
function doSMSG() {
    $.ajax({ 
        cache: false, 
        type: "GET", 
        dataType: "json", 
        url: SMILEROUTES["smsg"], 
        data: {}, 
        error: function(xhr, text, err) {
            absoluteAlert('Status Msg Error.  Reason: ' + xhr.status + ':' + xhr.responseText + '.', DELAY_SHORT,'trace',true);
        }, 
        success: function(data) {
            if (data) {
                msg = data["TYPE"];

                // console.log(data); // XXX Remove debug
                if (msg === "START_MAKE") {

                    if (SMILESTATE == 5) {
                        statechange(5, 3);
                    }
                    else if (SMILESTATE !== 3) {
                        statechange(2, 3);
                    }
                }
                if (msg === "WAIT_CONNECT") {

                    // TODO: RTC #23 >> Should we call from here a method to update the status on student app?
                    statechange(SMILESTATE, 2);
                }

                if (msg === "START_SOLVE") {
                    statechange(SMILESTATE, 4, data, function() {
                        clearAnswerState();
                        doGetInquiry(0);
                    });
                }
                if (msg === "START_SHOW") {
                    statechange(SMILESTATE, 5, data, function() {
                        GlobalViewModel.sessionstatemsg("Done! Please review your Score.");
                        doGetResults(data);
                    });
                }

                if (msg === "WARN") {
                }

                if (msg === "RESET") {
                    // Only do reset if we aren't just sitting at the login screen
                    if (SMILESTATE !== 1) {
                        statechange(SMILESTATE, 1, { msg: 'RESET' }, function() {
                            console.log("RESET, log out");
                            GlobalViewModel.sessionstatemsg("Session Reset by Teacher.  Logging Out"); // XXX I don't this this is shown
                            absoluteAlert('Session Reset by Teacher.  Logging Out', DELAY_NORMAL,'blue');
                        });
                    }
                }

                if ((msg === "") || (msg === null) || (msg === undefined)) {
                    // XXX Why in the world was I doing this?  I don't think we want to bump back to state 1
                    // Leave this around for a bit until I remember what of this
                    // statechange(SMILESTATE, 1);
                }
                // Ignore anything else that we receive
                // We should have a RESET_GAME
            } else {
                console.log('no data');
            }
        }
    });
}

function statechange(from, to, data, cb) {
    console.log('transition: ' + from + ' : ' + to)
    if (from == 1) { // FROM 1
        if (SMILESTATE != 1) {
            return;
        }
        // We can only loop back to 1 or go to 2 (waiting)
        if (to == 1) {
            restoreLoginState();
            return;
        } // This is effectively a reset, logout the user
        if (to != 2) {
            absoluteAlert('Cannot move to phase ' + to + ' yet.', DELAY_SHORT,'red');
        } else { // Move to 2. Get Ready Phase
            SMILESTATE = 2;
            console.log('SMILESTATE = 2');
            var $next = $('div.section-container section p.title').find('a[href="' + STATEMACHINE["2"].id + '"]');
            if ($next) {
                absoluteAlert('Jump to: ' + STATEMACHINE["2"].label + ' phase.', DELAY_SHORT);
                console.log('go to href = ' + $next.attr('href'));
                $('#logout_button').show();
                // Note, we won't disable the login screen, user can click back to it
                $next.removeClass('disabled');
                var a = $next[0]; // get the dom obj
                var evt = document.createEvent('MouseEvents');
                evt.initEvent('click', true, true);
                a.dispatchEvent(evt);
            }
        }
    } else if (from == 2) { // FROM 2
        if (SMILESTATE != 2) {
            return;
        }
        if (to == 1) {
            restoreLoginState();
            return;
        } // Teacher reset game, we should logout
        if (to == 3) { // Enter Make Questions Phase
            SMILESTATE = 3;
            $('div#inquiry-form-area').unblock();
            var $next = $('div.section-container section p.title').find('a[href="' + STATEMACHINE["3"].id + '"]');
            if ($next) {
                absoluteAlert('Jump to: ' + STATEMACHINE["3"].label + ' phase.', DELAY_SHORT);
                console.log('go to href = ' + $next.attr('href'));
                $next.removeClass('disabled');
                var a = $next[0]; // get the dom obj
                var evt = document.createEvent('MouseEvents');
                evt.initEvent('click', true, true);
                GlobalViewModel.sessionstatemsg("Start Making Questions until the teacher is ready to start Answering Questions")
                a.dispatchEvent(evt);
            }
        }
        if (to == 4) { // Enter Answer Questions Phase
            SMILESTATE = 4;
            $('div#inquiry-form-area').unblock();
            $('div#answer-form-area').unblock();
            var $next = $('div.section-container section p.title').find('a[href="' + STATEMACHINE["4"].id + '"]');
            if ($next) {
                absoluteAlert('Jump to: ' + STATEMACHINE["4"].label + ' phase.', DELAY_SHORT);
                console.log('go to href = ' + $next.attr('href'));
                $next.removeClass('disabled');
                var a = $next[0]; // get the dom obj
                var evt = document.createEvent('MouseEvents');
                evt.initEvent('click', true, true);
                GlobalViewModel.sessionstatemsg("Start Answering Questions until the teacher calls time");
                GlobalViewModel.numq(data.NUMQ);
                GlobalViewModel.qidx(0);
                GlobalViewModel.answersarray([]);
                GlobalViewModel.ratingsarray([]);
                a.dispatchEvent(evt);
                if (cb) {
                    cb();
                }
            }
        }
        if (to == 5) {
            SMILESTATE = 5;
            var $next = $('div.section-container section p.title').find('a[href="' + STATEMACHINE["5"].id + '"]');
            if ($next) {
                // XXX This is a copy paste of the same block of code 'from state == 2', refactor
                absoluteAlert('Jump to: ' + STATEMACHINE["5"].label + ' phase.', DELAY_SHORT);
                console.log('go to href = ' + $next.attr('href'));
                $next.removeClass('disabled');
                var a = $next[0]; // get the dom obj
                var evt = document.createEvent('MouseEvents');
                evt.initEvent('click', true, true);
                a.dispatchEvent(evt);
                if (cb) {
                    cb();
                }
            }
        }
    } else if (from == 3) { // FROM 3
        if (SMILESTATE != 3) {
            return;
        }
        if (to == 1) {
            restoreLoginState();
            return;
        } // Teacher reset game, we should logout
        if (to == 2) {
            return;
        } // Not sure why this would happen
        if (to == 4) { // Enter Answer Questions Phase
            SMILESTATE = 4;
            var $next = $('div.section-container section p.title').find('a[href="' + STATEMACHINE["4"].id + '"]');
            if ($next) {
                // XXX This is a copy paste of the same block of code 'from state == 2', refactor
                absoluteAlert('Jump to: ' + STATEMACHINE["4"].label + ' phase.', DELAY_SHORT);
                console.log('go to href = ' + $next.attr('href'));
                $next.removeClass('disabled');
                var a = $next[0]; // get the dom obj
                var evt = document.createEvent('MouseEvents');
                evt.initEvent('click', true, true);
                GlobalViewModel.sessionstatemsg("Start Answering Questions until the teacher calls time");
                GlobalViewModel.numq(data.NUMQ);
                GlobalViewModel.qidx(0);
                GlobalViewModel.answersarray([]);
                GlobalViewModel.ratingsarray([]);
                a.dispatchEvent(evt);
                if (cb) {
                    cb();
                }
            }
        }
        if (to == 5) { // Enter Show Results Phase
            SMILESTATE = 5;
            var $next = $('div.section-container section p.title').find('a[href="' + STATEMACHINE["5"].id + '"]');
            if ($next) {
                // XXX This is a copy paste of the same block of code 'from state == 2', refactor
                absoluteAlert('Jump to: ' + STATEMACHINE["5"].label + ' phase.', DELAY_SHORT);
                console.log('go to href = ' + $next.attr('href'));
                $next.removeClass('disabled');
                var a = $next[0]; // get the dom obj
                var evt = document.createEvent('MouseEvents');
                evt.initEvent('click', true, true);
                a.dispatchEvent(evt);
                if (cb) {
                    cb();
                }
            }
        }
    } else if (from == 4) { // FROM 4
        if (SMILESTATE != 4) {
            return;
        }
        if (to == 1) {
            restoreLoginState();
            return;
        } // Teacher reset game, we should logout
        if (to == 2) {
            return;
        } // Not sure why this would happen
        if (to == 5) { // Enter Show Results Phase
            SMILESTATE = 5;
            var $next = $('div.section-container section p.title').find('a[href="' + STATEMACHINE["5"].id + '"]');
            if ($next) {
                // XXX This is a copy paste of the same block of code 'from state == 2', refactor
                absoluteAlert('Jump to: ' + STATEMACHINE["5"].label + ' phase.', DELAY_SHORT);
                console.log('go to href = ' + $next.attr('href'));
                $next.removeClass('disabled');
                var a = $next[0]; // get the dom obj
                var evt = document.createEvent('MouseEvents');
                evt.initEvent('click', true, true);
                a.dispatchEvent(evt);
                if (cb) {
                    cb();
                }
            }
        }
    } else if (from == 5) { // FROM 5
        if (SMILESTATE != 5) {
            return;
        }
        if (to == 1) {
            restoreLoginState();
            return;
        } // Teacher reset game, we should logout
        if (to == 2) {

            return;
        }
        if (to == 3) { // Enter Make Questions Phase

            // Disable the popup "please wait for students answering questions"
            $('div#answer-form-area').unblock();

            SMILESTATE = 3;
            $('div#inquiry-form-area').unblock();
            var $next = $('div.section-container section p.title').find('a[href="' + STATEMACHINE["3"].id + '"]');
            if ($next) {
                absoluteAlert('Jump to: ' + STATEMACHINE["3"].label + ' phase.', DELAY_SHORT);
                console.log('go to href = ' + $next.attr('href'));
                $next.removeClass('disabled');
                var a = $next[0]; // get the dom obj
                var evt = document.createEvent('MouseEvents');
                evt.initEvent('click', true, true);
                GlobalViewModel.sessionstatemsg("Start Making Questions until the teacher is ready to start Answering Questions")
                a.dispatchEvent(evt);
            }
        }
        // Not sure why this would happen
        if (to == 5) { // Enter Show Results Phase
            // Ignore
        }
    }

}

function clearAnswerState() {
    GlobalViewModel.question("");
    GlobalViewModel.answer("");
    GlobalViewModel.a1("");
    GlobalViewModel.a2("");
    GlobalViewModel.a3("");
    GlobalViewModel.a4("");
    GlobalViewModel.picurl(SMILEROUTES["defaultpicurl"]);
    GlobalViewModel.rating("5");
    /* $('#star-rating').rating(function(vote, event) {
        console.log(vote, event);
        GlobalViewModel.rating(vote);
    }); */
}

/*
 {"NAME":"vsundoaq8620",
 "MADE":"N","SOLVED":"Y","NUMQ":12,
 "YOUR_ANSWERS":["1","1","4","1","1","4","2","4","3","2","3","4"],
 "RIGHT_ANSWERS":[2,3,4,1,3,3,2,4,1,1,1,3],
 "ANSWER_SCORING":[0,0,1,1,0,0,1,1,0,0,0,0],
 "NUM_RIGHT":4,
 "SCORE_AS_PERCENTAGE":0.3333333333333333}
 */
// XXX Let's refactor this to properly use knockout.js
// Need to read up on the foreach iterator
function displayResults(data) {
    $('#results-area').empty();
    var resultsHTML = "";
    var i = 0;
    var answers = data.YOUR_ANSWERS;
    var rightanswer = data.RIGHT_ANSWERS;
    var answer_scoring = data.ANSWER_SCORING;
    var resultstr;
    var resultclass;

    var percentage;
    if (data.SOLVED === "Y") {
        //
        // Add a Score
        //
        try {
            percentage = (data.SCORE_AS_PERCENTAGE * 100).toFixed(2);
        } catch (e) {
            percentage = 'N/A';
        }
        resultsHTML = resultsHTML + "<H1>Your Score: " + data.NUM_RIGHT + "/" + data.NUMQ + "  (" + percentage + "%)</H1>\n";

        //
        // Show results for each answer
        // XXX Improve this
        for (i = 0; i < answers.length; i++) {
            if (answer_scoring[i] == 1) {
                resultstr = "&#x2713; Right";
                resultclass = 'rightanswer';
            } else {
                resultstr = "&#x2717; Wrong";
                resultclass = 'wronganswer';
            }

            resultsHTML+=
             "<div class=''>\n \
                <div class='row display'><div class='" + resultclass + "'>" + resultstr + " : Your answer: " + answers[i] + "&nbsp;&nbsp;&nbsp;<a class='tiny button' id='iq" + i + "' onclick='showIQ2(" + i + ")' href='javascript:void(0);'>Details</a></div></div> \
             </div><!-- row -->\n";

        }
        resultsHTML = resultsHTML + "</div><!-- 9 columns-->\n";
        console.log(resultsHTML);
    } else {
        resultsHTML = "<H1>No Questions Answered, No Score Available</H1>\n"; // XXX LOCALIZE IT
    }
    $('#results-area').append(resultsHTML);
}

function showIQ2(qnum) {
    doGetInquiry(qnum, function(data) {
        GlobalViewModel.answer("a" + GlobalViewModel.rightanswer());
        $('#iq-area').addClass('reveal-modal').foundation('reveal', 'open');
    });
}

function restoreLoginState() {
    //
    // XXX This needs to clean up the sidebar area too
    //
    GlobalViewModel.doInquiryReset();
    $('#submit-inquiry-area').show();
    $('div#inquiry-form-area').unblock();
    $('div#answer-form-area').unblock();

    var $next = $('div.section-container section p.title').find('a[href="' + STATEMACHINE["1"].id + '"]');
    $('#logout_button').hide();
    if ($next) {
        stopSmileEventLoop();
        absoluteAlert('Jump to: ' + STATEMACHINE["1"].label + ' phase.', DELAY_SHORT);
        console.log('go to href = ' + $next.attr('href'));
        $next.removeClass('disabled');
        var a = $next[0]; // get the dom obj
        var evt = document.createEvent('MouseEvents');
        evt.initEvent('click', true, true);
        a.dispatchEvent(evt);
        GlobalViewModel.hasSubmitted(false);
        GlobalViewModel.sessionstatemsg("Waiting for teacher to begin"); // XXX Need to pull out localization msgs
        GlobalViewModel.loginstatusmsg("Please Login.  Then the teacher will tell you instructions."); // XXX Need to pull out localization msgs
        GlobalViewModel.othermsg("");
    }
    SMILESTATE = 1;
}

/*
 * This is brittle and awful - XXX TODO refactor, inquiry should be an object we pass in
 * We won't validdate anything here, let the server do it
 * That's dangerous, and we should plan to encode any funky unicode input or other malicious attempts to break
 * something
 */
function generateJSONInquiry(clientip, username, question, answer1, answer2, answer3, answer4, rightanswer, picurl, pic) {
    var jsonmsg = {};

    jsonmsg.NAME = username;
    jsonmsg.IP = clientip;
    jsonmsg.O1 = answer1;
    jsonmsg.O2 = answer2;
    jsonmsg.O3 = answer3;
    jsonmsg.O4 = answer4;
    if ((pic === "") || (pic === undefined)) {
        jsonmsg.TYPE = "QUESTION";
    } else {
        jsonmsg.TYPE = "QUESTION_PIC";
        jsonmsg.PIC = pic;
    }
    jsonmsg.Q = question;
    jsonmsg.A = rightanswer[1]; // Drop the leading 'a'

    return jsonmsg;
}
function generateEncodedHail(clientip, username) {
    var key = "MSG";
    var encodedmsg;
    var template = '{"TYPE":"HAIL","IP":"%s","NAME":"%s"}';
    encodedmsg = key + '=' + encodeURIComponent(sprintf(template, clientip, username));
    return encodedmsg;
}

function startSmileEventLoop() {
    DEAMON_UPDATING_BOARD = setInterval(function() {
        doSMSG();
    }, DELAY_UPDATE_BOARD);

    // ADD LISTENER TALK HERE
    DEAMON_LISTENING_PRIVATE_MESSAGE = setInterval(getPrivateMessage, DELAY_PRIVATE_MESSAGE);
}

function getPrivateMessage() {

    //absoluteAlert(GlobalViewModel.clientip(),DELAY_NORMAL);
    var ipJson = {};
    ipJson.IP = GlobalViewModel.clientip();

    $.ajax({ 
        cache: false, 
        type: 'POST', 
        contentType: 'application/json',
        url: SMILEROUTES['getprivatemessage'],
        //async: false,
        data: JSON.stringify(ipJson),
        
        error: function(xhr, text, err) {
            absoluteAlert('Unable to send your message  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', DELAY_ERROR, 'trace');
        }, 
        success: function(data) {
            
            if(data) absoluteAlert('<u>Message from teacher</u>:<br><br><b>'+data.TEXT+'</b>',null,'red',true);
        }
    });
}

function stopSmileEventLoop() {
    if (DEAMON_UPDATING_BOARD) {
        clearInterval(DEAMON_UPDATING_BOARD);
        DEAMON_UPDATING_BOARD = null;
    }
}

$(window).unload(function() {
    // XXX Implement something here to tell the server we've left
    // partSession();
    // setTimeout(partSession(), 60000);  // XXX Give the user a minute to return
});

var SESSION_STATE_START_MAKE_TPL = ' \
    <p>Start Making Questions until the teacher is ready to start Answering Questions</p> \
';
