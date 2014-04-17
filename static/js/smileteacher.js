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

var VERSION = '1.0.1';
var SMILESTATE = "1";
var SMILEROUTES = {
    "currentmessage": "/smile/currentmessage",
    "checkserver": "/smile/",
    "createsession": "/smile/createsession"
};


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


var GlobalViewModel = {
    teacher_name: ko.observable(""),
    session_name: ko.observable(""),
    group_name: ko.observable(""),
    hasSubmitted: ko.observable(false),
    version: ko.observable(VERSION)
};

GlobalViewModel.doLogin = function() {
    var self = this;
    
    if (!self.teacher_name() || self.teacher_name() === "") {
        
        self.teacher_name('Default Teacher'); 
    }
    if (!self.session_name() || self.session_name() === "") {
        
        self.session_name('Default Session'); 
    }
    if (!self.group_name() || self.group_name() === "") {
        
        self.group_name('Default Group'); 
    }

    if (!self.hasSubmitted()) {
        console.log('doLogin');
        smileAlert('#globalstatus', 'Logging in ('+self.teacher_name()+','+self.teacher_name()+','+self.teacher_name()+')', 'green', 5000);
        doSmileLogin();
    }

    self.hasSubmitted(true);

    return false;
}


GlobalViewModel.doLoginReset = function() {

    this.teacher_name("");
    this.session_name("");
    this.group_name("");
    this.hasSubmitted(false);

    //
    // XXX This is silly, fix this, cleanup the object model and reset the state
    // For now just reload the page
    //
    window.location.href = window.location.pathname;
    window.location.reload(true);
    return false;
}


$(document).ready(function() {
    
    //
    // Init Data Model
    //
    ko.applyBindings(GlobalViewModel);

});

// NEEDED

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
}

function doSmileLogin() {
    
    var clientip;
    
    $.ajax({ 
        cache: false, 
        type: "POST", 
        dataType: "text", 
        url: SMILEROUTES["createsession"], 
        data: {"teacherName":GlobalViewModel.teacher_name,"groupName":GlobalViewModel.group_name,"sessionName":GlobalViewModel.session_name}, 
        
        error: function(xhr, text, err) {
            smileAlert('#globalstatus', 'Unable to login.  Reason: ' + xhr.status + ':' + xhr.responseText + '.  Please verify your connection or server status.', 'trace');
            GlobalViewModel.hasSubmitted(false); // Reset this so clicks will work
        }, 
        success: function(data) {
            smileAlert('#globalstatus', 'Successfully logged in', 'green', 10000);
            // Move to state 2 now
            SMILESTATE = '2';
        }
    });
}