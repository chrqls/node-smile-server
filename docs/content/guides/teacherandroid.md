---
title: "Epoch SMILE Teacher Android App Guide"
date: "2014-06-04"
aliases:
    - /doc/teacherandroid/
    - /doc/teacher/
groups: ["guides"]
groups_weight: 20
---

The SMILE Teacher Android App is designed to allow the Teacher to organize the Epoch SMILE learning session.

## Logging In

Every session begins with the Teacher and Students logging in.  The default Server IP address (*10.1.0.1*) will be prefilled for the Teacher.  If the default address doesn't suit you, enter one appropriate to your installation.

![Login Screen](/static/img/smileteacher-login.png)

Your login screen may look slightly different, depending on branding used in your installation, or depending on screen size.

## Session Set Up

The next important step is to set up the Session.  The default information screen has values prefilled.

![Session 1](/static/img/smileteacher-session1.png)

The Teacher can fill in the fields with information relevant to the new session: *Teacher Name*, *Session Title*, *Group Name*.  This information is used later in the session, when the session is saved for later review in the IQManager.

![Session 2](/static/img/smileteacher-session2.png)

## Choose Question Setup

After providing session information, the Teacher will need to choose the Question Setup, either 

1. *Start Making Questions* - This allows students to start making their own questions, thus starting the session
1. *Use Prepared Questions* - This allows students to start a session using previously prepared questions

![Choose Question](/static/img/smileteacher-chooseq.png)

If Teacher chooses to *Use Prepared Questions*, a dialog will open and it will be possible to choose the prepared questions.  The question sets are also known as *IQSets* (Inquiry Sets).  If no prepared questions are available, none will be displayed.  The Teacher should select an IQSet to use in the Session.  Note, the details of each IQSet are present, with information coming from the Session setup details of past sessions.

![Use Prepared Questions](/static/img/smileteacher-preparedq.png)

## Session Phase I - Start Making Questions

During this phase, the students will have the opportunity to start making new Inquiry Questions.  It may take some time for your students to complete the suggested number of questions.  It is recommended to limit the student's time spent submitting questions by asking them each to produce between 1 and 3 questions.  The goal should be in the engagement, group work on questions, and the quality of the Inquiry Questions.

![Make Questions](/static/img/smileteacher-makeq.png)

The session will remain in this phase until you hit the "Start Answering Questions".  It is best to wait until there is a critical mass of students logged into the session before proceeding past this phase.  You can monitor whether a student has submitted questions by looking at their name in the Students tab view.

![Students Tab](/static/img/smileteacher-studentstab.png)

## Session Phase II - Start Answering Questions

During this phase, it will be possible for Students to answer questions.  View the Students Tab to get a complete view of which students are finished answering questions.  The Teacher can end this phase at any time by clicking the "Finish: Show Results".

![Answer Questions](/static/img/smileteacher-answerq.png)

## Session Phase III - Show Results

When a critical mass of students have completed answering questions, go ahead and click "Finish: Show Results".

![Login Screen](/static/img/smileteacher-showresults1.png)

After completing the session and clicking "Finish: Show Results", you will have the results available on the Students Tab page.

![Login Screen](/static/img/smileteacher-showresults2.png)


## Ending the Session

There are a number of options available in the menu which are possible to use at the end of the session. 

![Login Screen](/static/img/smileteacher-chooseq.png)

### Restarting a Session

By clicking the *Restart* menu, the teacher can log out all students and reset the state of the Teacher app and server.  This is ideal for when the session is complete and the Teacher may wish to start a new session.

### Retaking a Session

A Teacher can *Retake* a session by clicking *Retake" in the menu.  This will cause all students to stay in the session, not logged out.  Instead, the Teacher has the opportunity to select a new session from the Prepared Questions.  Once selected, each student will be put into this new sesion with the selected questions.  This is ideal for situations where a Teacher may have multiple sets of questions use in the session.  It's also ideal for when a Teacher wants to reset wihtout kicking all students out of teh session.