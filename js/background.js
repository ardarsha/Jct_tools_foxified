/*****************************************************************
*                           Created By
*                        David Aben Athar
*
* Last update: 30/07/2016               email: abenatha@jct.ac.il
******************************************************************/

/*****************************************************************
* FUNCTION
*    chrome.runtime.onMessage.addListener
*
* RETURN VALUE
*		This function will execute the function "onBackgroundEvent" in
*	 all view active
*
* PARAMETERS
*   request - an object with contain:
*             + updatedata  = (true/false/undefined)
*             + changeIcon  = (true/false/undefined)
*
*   This function will get the request maded by anothers
*  pages in the extension and execute backgroundEvent function
*   In case the object received contain true in login
*  then the function will login in moodle.jct.ac.il with
*  the username and password into the object
*   In case the object received contain true in updatedata
*  then the function will update the course and task list
*   In case the object received contain changeIcon
*  the function will change the extension icon
*
* Check too:
*	backgroundEvent
**********************************************************************/

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		console.log("External request");
		console.log(request);

	    //In case that the request is null or not an object return Invalid Parameter
	    if(request == null || typeof request != "object"){
	    	backgroundEvent({type:"Format error",operationCompleted:false,error:"Invalid Parameter",request:request});
	    	return;
	    }

	     //In case that the request is to update the data
	     if(request.updatedata)
			DataAccess.Data(loginAndUpdate);

	    //In case that the request contains changeIcon.
	    if(request.changeIcon != undefined)
	    		changeIcon(request.changeIcon);

		 //setBadge
		 if(request.setBadge != undefined)
			setBadge();

		if(typeof request.message == "string")
		{
			console.log("External message: "+ request.message);
			backgroundEvent({type:"ExternalMessage",operationCompleted:true });
		}
});

/*****************************************************************
* FUNCTION
*    backgroundEvent
*
*
* PARAMETERS
*   eventType - an object with contain:
*							+	type = the event type
*             + operationCompleted  = (true/false)
*             + error  = string with the error
*
* MEANING
*		When the background page run an operation (like update data)
*  the function will check in all active views (page of the extension)
*  if the function "onBackgroundEvent" exist and then run it (sending
*  the eventType)
*
**********************************************************************/
function backgroundEvent(eventType)
{
	// Look through all the pages in this extension to find one we can use.
	var views = chrome.extension.getViews();
	for (var i = 0; i < views.length; i++) {
		var view = views[i];
		// If this view has the right URL and hasn't been used yet...
		if (typeof view["onBackgroundEvent"] == "function") {
			// ...call one of its functions and set a property.
			view["onBackgroundEvent"](eventType);
		}
	}
}
/*****************************************************************
* FUNCTION
*    chrome.runtime.onInstalled
*
* MEANING
*	When the extesion install the function will run and set the default
* settings
**********************************************************************/
chrome.runtime.onInstalled.addListener(onInstalled);
function onInstalled(reason)
{

	if (reason == "install") {
		DataAccess.setData({
			Config:
			{
				HWSecondAlarm	:	"0.5", HWfirstAlarm:	"1",UESecondAlarm:"0.5",UEfirstAlarm:"1",checkLogin:true,hiddeModdelHelp:false,
				hiddeUE:false,hwChanges:true,hwDays:"30",hwUpdate:"1",style:"new",todaysHW:true,updateOnPopup:true
			},
			mo:true,mz:true,wf:true,
			moodleCoursesTable:{}
	});

	}
	else{
		DataAccess.Data(function(data)
		{
			if(data.Config == null)
			{
				DataAccess.setData({
					Config:
					{
						HWSecondAlarm	:	"0.5", HWfirstAlarm:	"1",UESecondAlarm:"0.5",UEfirstAlarm:"1",checkLogin:true,hiddeModdelHelp:false,
						hiddeUE:false,hwChanges:true,hwDays:"30",hwUpdate:"1",style:"new",todaysHW:true,updateOnPopup:true
					},
					mo:true,mz:true,wf:true,
					moodleCoursesTable:{}
				});
			}	
			updateTestDate(data,true);
		})
	}

	DataAccess.Data(function(data)
	{
		if((data["username"] == undefined) && (data["password"] == undefined))
				chrome.runtime.openOptionsPage();
	});
}

chrome.alarms.onAlarm.addListener(function (alarm){
		if(alarm.name != "updateData")
		{
			createEventNotification(alarm.name);
			DataAccess.Data(updateTestDate);
		}
		else
		{
			console.log("Alarm of updateData fired at: " + (new Date));
			DataAccess.Data(loginAndUpdate);
		}
});

chrome.notifications.onClicked.addListener(function (id){
	chrome.notifications.clear(id);
	if(id.includes("event") ||  id.includes("updateData") ||  id.includes("update") || id.includes("todaysHW"))
		return;

	window.open("http://moodle.jct.ac.il/mod/assign/view.php?id="+id);
});


/******************************************************
* This funcions will executade when the chrome start
********************************************************/
chrome.alarms.clearAll();
DataAccess.Data(onStart);
/******************************************************/
function onStart(data)
{
	chrome.alarms.clearAll();
	chrome.browserAction.setBadgeBackgroundColor({color:"#043D4E"});
	//Because firefox onInstalled doesn't work, 
	//we check if the data.Config is defined,
	// in case are not the run onInstalled
	if(data.Config == null)
	{
		 onInstalled("install");
		 data.Config = {}
	}

	console.log("Starting background page");
	loginAndUpdate(data);
	
   //Set the icon of the extension status (active/inactive)
   changeIcon(data.enable && data.username != null && data.password != null);
   if(data.Config != null && data.Config.hwUpdate != null)
   		chrome.alarms.create("updatedata", {when:(Date.now()),periodInMinutes:60*data.Config.hwUpdate});
   if(data.Config != null && data.Config.todaysHW)
   		showTodayEvents(data.tasks,data.courses);
   if(data.tasks != undefined && data.Config != null && data.Config.firstAlarm != false);
  		setAlarms(data,true);
}


function showTodayEvents(events,courses)
{
	if(events == null || events.length ==0 || courses == null || courses.length == 0)
		return

	var today = new Date();
	var deadline = new Date();
	var j = 0;
	var list = [];
	for (var i = 0; i < events.length; i++) {
		if(events[i].type == "userEvent")
			return
		deadline = new Date(Date.parse(events[i].deadLine));

		if((deadline.getDate() == today.getDate() || deadline.getDate() == (today.getDate() +1)&& deadline.getHours()< 2) &&  deadline.getMonth() == today.getMonth() && Date.parse(deadline)> Date.now())
			list[j++] = {title: events[i].name, message: ((events[i].type == "homework")?courses[events[i].courseId].name:" אירוע")}
	}

	if(events == null || j == 0)
		return;

	chrome.notifications.create(
		'todaysHW',{
			type: "list",
			title: "ש\"ב להיום",
			iconUrl:  chrome.extension.getURL('image/icons/jct128.png'),
			message: "",
			items: list
		});

}



function setAlarms(data,onstart = false)
{
	if(data.Config != undefined && data.Config.hwUpdate != undefined && !isNaN(data.Config.hwUpdate) )
	{
		chrome.alarms.create("updateData", {periodInMinutes: (data.Config.hwUpdate*60)});
	}
	else
		console.log("data.Config.hwUpdate is not defined");

	console.log("Setting alarms")
	if(data.Config == undefined)
		return;
	var events = data.tasks;
	if(events == undefined)
		return
	console.log("Total events: " +  events.length);
	//Homework first alarm
	var hwFirstAlarm = parseFloat(data.Config.HWfirstAlarm);
	//User event second alarm
	var ueFirstAlarm = parseFloat(data.Config.UEfirstAlarm);

	console.log("Homework first alarm: " +  hwFirstAlarm + ", event first alarm: " +  hwFirstAlarm);
	//Homework first alarm	
	var hwSecondAlarm = parseFloat(data.Config.HWSecondAlarm);
	//User event second alarm
	var ueSecondAlarm = parseFloat(data.Config.UESecondAlarm);
	console.log("Homework second alarm: " +  hwSecondAlarm + ", event second alarm: " +  ueSecondAlarm );
	var deadLine = Date.now();
	for (var i = 0; i < events.length; i++)
	{
		//events[i].type == "userEvent"
		if((events[i].type == "homework" && isNaN(hwFirstAlarm))|| (events[i].type == "userEvent" && isNaN(ueFirstAlarm)))
			continue;
		if(data.eventDone != null && data.eventDone[events[i].id] != null && (!data.eventDone[events[i].id].notifications || data.eventDone[events[i].id].done || data.eventDone[events[i].id].checked))
			continue;

		if(events[i] == null || (Date.parse(events[i].deadLine) < Date.now()))
			continue;

		deadLine = Date.parse(events[i].deadLine) - ((events[i].type == "homework")?hwFirstAlarm:ueFirstAlarm)*60*60*1000;
		if(deadLine > Date.parse(new Date()))
    {
			chrome.alarms.create(events[i].id + "(1)", {when:deadLine});
		}
		if((events[i].type == "homework" && isNaN(hwSecondAlarm))|| (events[i].type == "userEvent" && isNaN(ueSecondAlarm)))
    		return;
		deadLine = Date.parse(events[i].deadLine) - ((events[i].type == "homework")?hwSecondAlarm:ueSecondAlarm)*60*60*1000;
		if( onstart || !onstart && deadLine > Date.parse(new Date()))
    {
			 	chrome.alarms.create(events[i].id + "(2)", {when:deadLine});
		}
  }
	setBadge();


}

function createEventNotification(eventId,change = false)
{
	DataAccess.Data(function(data){
		if(data.tasks == undefined)
			return;
		var event = null;
		eventId= ((change == true)?eventId:eventId.substring(0, eventId.length - 3));
		if(change != true)
			for (var i = 0; i < data.tasks.length; i++) {
				if(data.tasks[i].id == eventId)
					event = data.tasks[i];
			}
		else
			event = eventId;

		if(event == null)
			return;

		console.log("createEventNotification");

		if(change == true)
			chrome.notifications.create(
				  event.id,{
					type: 'basic',
					requireInteraction:(data.Config != undefined && data.Config.hiddeNofication == true)?false:true,
					iconUrl: chrome.extension.getURL('image/icons/jct128.png'),
					title: "שינוי בשיעורי בית",
					message: ((event.name + "\n" + data.courses[event.courseId].name+"\n") + getDate(new Date(Date.parse(event.deadLine))))
				});
		else
			chrome.notifications.create(
				(event.type == "homework")?eventId:"event " + eventId,{
					type: 'basic',
					requireInteraction:true,
					iconUrl: chrome.extension.getURL('image/icons/jct128.png'),
					title: ("תזכורת" + ((event.type == "homework")?" על שיעורי בית":" אירוע")),
					message: (event.name + "\n" + ((event.type == "homework")?data.courses[event.courseId].name+"\n":"") + getDate(new Date(Date.parse(event.deadLine))))
				});
	});
}

/*****************************************************************
* FUNCTION
*   login
*
* RETURN VALUE
*   This function use the object ajaxAns to return the data
*
* PARAMETERS
*   username  - The username to login
*   password  - The password to login
*   asyncType - True in case we want to use async
*
* MEANING
*    This function will try to login to the moodle page by send it a
*   post that contains the username and password (received)
*
**********************************************************************/
function login(username, password, asyncType = true)
{
    const promise = new Promise(function (resolve, reject) {
		var request =  $.post( "https://moodle.jct.ac.il/login/index.php",
			{username:username,password:password} );

		request.done( function(data){
			// In case the username/password are wrong the moodle return an error that is requiered to
	        // logout before login a new user
	        if($(data).find('#notice').length>0)
	        {	
	        	console.log("wrong password");
	        	backgroundEvent({type:"login",operationCompleted:false,error:"שם המשתמש או הסיסמה שהזנת שגויים" });
	        	reject();
	        	return;
	        }
			console.log("login status ok");
			resolve();
		});

		request.fail(function (xhr, status, error) {
			setBadge();
			console.log("login status failed, status: " + xhr.status);
			backgroundEvent({type:"login",operationCompleted:false,error:"אין חיבור למודל" });
			reject();
		});
	});

	return promise;
}

/*****************************************************************
* FUNCTION
*   wrapAllAttributes
*
* RETURN VALUE
*   This function doesn't return nothing
*
* PARAMETERS
*   html - An html document
*
* MEANING
*    This function wrap all attribute from the html
*
* ATTENTION
*   This function is not in use
*
**********************************************************************/
function wrapAllAttributes(html)
{
	//delete attributes from the main div
	$(html).each(function() {
		var attributes = this.attributes;
		var i = attributes.length;
		while( i-- ){
			this.removeAttributeNode(attributes[i]);
		}
	});
	//delete all attributes from the children of main div
	$(html).children().each(function () {
		$(this).each(function() {
			var attributes = this.attributes;
			var i = attributes.length;
			while( i-- ){
				this.removeAttributeNode(attributes[i]);
			}
		});
	});
}

/*****************************************************************
* FUNCTION
*   updateData
*
* RETURN VALUE
*   This function use the object ajaxAns to return the data
*
* PARAMETERS
*   asyncType - True in case we want to use async
*
* MEANING
*    This function will update the courses and homework list in the
*   database
*
**********************************************************************/
function updateData(asyncType)
{
	console.log("Updating data");
	if(typeof asyncType == undefined)
		asyncType = true;
    // async: false

    const promise = new Promise(function (resolve, reject) {
	    var request =  $.ajax({
	    	url:"http://moodle.jct.ac.il",
	    	type:'GET',
	    	async: asyncType,

	    });

	    request.done( function(data){
	    	console.log("request successfully completed");
	    	if(undefined == data || 0 == data.length)
	    	{
	    		console.log("Error:Data is null");
					backgroundEvent({type:"updateData",operationCompleted:false,error:"Data is null",request:request});
	    		reject();
	    		return;
	    	}

	        // Get htm with div
	        var html = jQuery('<div>').html(data);
	        if(html.find(".courses").length == 0)
	        {
				reject();
	        	console.log("No courses found");
				backgroundEvent({type:"updateData",operationCompleted:false,error:"נדרש חיבור למודל",request:request});
	        	return;
	        }
	        // Get courses list
	        var courses = html.find(".courses");
	        //  wrapAllAttributes(courses);
	        var coursesObject = getAllCourses(courses);
	        // Get homework list
	        var homework = html.find("#inst121811").find(".content");
	        var homeworkObject  = getAllHomeworks(homework);
	        console.log("New data:");
	        console.log({courses:coursesObject.data,coursesIndex:coursesObject.index,tasks:homeworkObject});
					checkChanges(homeworkObject).then(function(){
						DataAccess.setData({courses:coursesObject.data,coursesIndex:coursesObject.index,tasks:homeworkObject})
					}).then(function(){
						console.log("updateData setting new alarms");
						DataAccess.Data(setAlarms);
						backgroundEvent({type:"updateData",operationCompleted:true});
						setBadge();
					});

	        resolve();

	       // Reset the alarms

	   });

	    request.fail(function (data) {
	    	console.log("request failed");
	    	console.log(data);
				setBadge();
				backgroundEvent({type:"updateData",operationCompleted:false,error:data,request:request});
	    	  reject()
	    });
	});

	return promise;

}

/*****************************************************************
* FUNCTION
*   getAllCourses
*
* RETURN VALUE
*    Return an object that contains the courses data (data) and the
*  hash table order(index)
*
* PARAMETERS
*   html - An html document
*
* MEANING
*   This function will take the couse div in the moodle, then insert
*   evey course in an object (with name, id, MoodleId)
*
*  ATTENTION
*   This function help the updateData function
*
**********************************************************************/
function getAllCourses(html)
{
	var data = {};
	var index =[];
	var i = 0;
	$(html).children().each(function () {
        // Find the url of the course (where is contain all data)
        var courseLink = $(this).find('a');
        // Find the course id
        var id = $( this ).attr( "data-courseid" );

        // if there is an error just stop
        if(courseLink.length ==0 || id == undefined ||id.length == 0)
        	return true;

        // copy the text of the url
        var text = courseLink.text();
        // Separe the data by id and name
        var courseDetails = separateCoursesData(text);
        // Save the url
        courseDetails.Url = courseLink.attr('href');
        // Save the moodle id
        courseDetails.moodleId = id;
        // Save the current place of the course in moodle
        index[i] = id;
        i++;
        // Make the id as the hash id and save the courses data
        data[id] = courseDetails;

    });
	return {data:data,index:index};
}
/***************************************
* Separe data from courses
* Example 120221.3.5776 - אלגברה לינארית ב
*
* The function will search for numbers and
* save it as id and then take the rest
* and save as name
*****************************************/
function separateCoursesData(data)
{
	var idNumber = "";
	var character;
	for (var i = 0; i < data.length; i++)
	{
		character = data.charAt(i);
		if(character == '.' || (character != ' ' && !isNaN(character)))
			idNumber += character;
		else
			break;

	}
    // check if is a course
    var name = data.substring((idNumber.length>0)?(idNumber.length+3):0);

    return {id:idNumber,name:name}
}

/*****************************************************************
* FUNCTION
*   getAllHomeworks
*
* RETURN VALUE
*    Return an object that contains all homeworks data
*
* PARAMETERS
*   html - An html document
*
* MEANING
*   This function will take the homeworks div in the moodle, then insert
*   evey course in an object (with name, id,deadline, type)
*
*  ATTENTION
*   This function help the updateData function
*
**********************************************************************/
function getAllHomeworks(html)
{
	var data = [];
	var i = 0;
	$(html).children().each(function () {
		var homeworkDetails;

		if($(this).find("img").attr("alt") == "אירוע משתמש")
			homeworkDetails = userEventData(this);
		else
			homeworkDetails = separateHomeworkData(this);

		if(homeworkDetails == undefined)
			return true;

		if(homeworkDetails.id != undefined)
			data[i] = homeworkDetails;
		else
		{
            //check if the i is not in use
            while(data[i] != undefined){i++};

            homeworkDetails.id = i;
            data[i] = homeworkDetails;
        }
        i++;
    });
	return data;
}
/***************************************
* Separe data from homework div
*
*  The function will search for the name
*  and the date then save it in an object
*  with the type "userEvent"
*****************************************/
function userEventData(usData)
{
	var name = (($(usData).find("a"))[0]).text;
	var deadLine = stringToDate($(usData).find(".date").text());
	deadLine = deadLine.toString();
	return{type:"userEvent",name:name,deadLine:deadLine}
}
//
function separateHomeworkData(hwdata)
{
    /**************************************
    * Search the homework id and name
    ***************************************/
    var datatemp = ($(hwdata).find("a"))[0];
    if(datatemp == undefined || datatemp.length==0)
    	return undefined;
    // Save the homework name
    var homeworkName = $(datatemp).text();
		if(homeworkName.length>33)
			homeworkName =  homeworkName.substring(0,30) + "...";

		datatemp = $(datatemp).attr('href');
    // Get id from href (ex: http://moodle.jct.ac.il/mod/assign/view.php?id=224301)
    datatemp = datatemp.substring(datatemp.lastIndexOf("id")+3);
    // Save the homework id
    var homeworkId = datatemp;

    /**************************************
    * Search the homework course id
    ***************************************/
    datatemp = $(hwdata).find('.course').find('a');
    if(datatemp == undefined || datatemp.length == 0)
    	return undefined;
    datatemp = $(datatemp).attr('href');
    // Get id from href (ex: http://moodle.jct.ac.il/course/view.php?id=28513)
    datatemp = datatemp.substring(datatemp.lastIndexOf("id")+3);
    // Save the course id
    var courseId = datatemp;

    /**************************************
    * Search the homework dead line
    ***************************************/
    datatemp = $(hwdata).find('.date');
    if(datatemp == undefined || datatemp.length == 0)
    	return undefined;


    var homeworkDeadLine = stringToDate($(datatemp).text());
    homeworkDeadLine = homeworkDeadLine.toString();
    if(homeworkDeadLine == undefined)
    	return undefined;

    return {type:"homework",id:homeworkId,name:homeworkName,courseId:courseId,deadLine:homeworkDeadLine}
}

/********************************************
* The function get an day in format DD/MM/YY
* and a time in format HH:MM then return
* a string with the date
*************************************************/
function stringToDate(date)
{

	var dayArray = new Array();
	if(date.includes("מחר"))
	{
		var tomorow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
		dayArray[0] = tomorow.getDate();
		dayArray[1] = tomorow.getMonth();
		dayArray[2] = tomorow.getFullYear();

	}else
	if(date.includes("היום"))
	{
		var today = new Date();
		dayArray[0] = today.getDate();
		dayArray[1] = today.getMonth();
		dayArray[2] = today.getFullYear();
	}
	else
	{
		dayArray = date.split("/");
		dayArray[1] = Number(dayArray[1])-1;
		if(dayArray[2] ==undefined)
			return undefined;
		dayArray[2] = dayArray[2].substring(0,4);
	}


	var timeArray = new Array();
	timeArray = date.split(":");

	if(timeArray[1] == undefined)
		return undefined;

	timeArray[0] = timeArray[0].substring(timeArray[0].length-2);


	return new Date(dayArray[2],dayArray[1],dayArray[0],timeArray[0],timeArray[1],0);

}

function checkChanges(newHomeworks)
{
	return DataAccess.Data(function(data)
	{
		console.log("Check homeworks: " + (data.Config != null && data.Config.hwChanges != false))
		if(data.Config != null && data.Config.hwChanges == false)
			return;
		if(typeof newHomeworks != "object")
			return;
		if(data.tasks == undefined)
			return;
			console.log("Checking changes on homework");
		for (var i = 0; i < newHomeworks.length; i++) {
			if(newHomeworks[i].type != "homework")
				continue;
			for (var j = 0; j < data.tasks.length; j++) {
					if(data.tasks[j].type == "homework" && newHomeworks[i].id == data.tasks[j].id)
					{
						if(Date.parse(data.tasks[j].deadLine) != Date.parse(newHomeworks[i].deadLine))
							createEventNotification(newHomeworks[i],true)
						break;
					}
			}
		}
	});
}

function loginAndUpdate(data)
{
	if(data == null)
		return;
	
	if((data.Config == null || data.Config != null && data.Config.checkLogin != false) && data.username != null && data.password != null)
	 {
		 console.log("trying to make a login in moodle");
		 login(data.username,window.atob(data.password))
		 .then(function(){
			 console.log("updating database");
			 return updateData();
		 });
	 }

}

function setBadge()
{//showBadge
	DataAccess.Data(function (data)
	{

		var counter = 0;
		var events = data.tasks;
		var event;
		var deadLine = new Date();
		var checked;
		var duplicate = {}
		if(events != undefined && data.Config != null && data.Config.showBadge != false)
		for (var i = 0; i <=  events.length  ; i++) {

			// Check if the event already finish
			if(events[i] == null || Date.parse(events[i].deadLine)< Date.now())
				continue;

			// Check if the user want to show user events
			if(data.Config != undefined)
			{
				
				if(events[i].type == "userEvent")
				continue;

				if(data.Config.hwDays != null && Date.parse(events[i].deadLine) > (Date.now()+data.Config.hwDays*24*60*60*1000))
				continue;

				
				if(events[i].type =="homework")
				{

					if(data.Config.hiddeNoSelectedCourseInWindows == true && data.moodleCoursesTable[events[i].courseId] != true)
						continue;

				
					/*
					* In this part the program will check if the user limited the total of homeworks 
					* Is important to remember that the homework are sorted by deadline
					* in this case the program will save the last homework deadline to check with the next.
					*/

					if(duplicate[events[i].courseId] == null)
					{	
						duplicate[events[i].courseId] = {};
						duplicate[events[i].courseId].lastDeadLine = events[i].deadLine;
						duplicate[events[i].courseId].counter = 1;
					}else{	
						
						if(data.Config.hiddeSameDay && Date.parse(events[i].deadLine) == Date.parse(duplicate[events[i].courseId].lastDeadLine))
							continue;
						
						if(data.Config.limitedHw && duplicate[events[i].courseId].counter >= data.Config.limitedHwAmount)
							continue;


						duplicate[events[i].courseId].lastDeadLine = events[i].deadLine;
						duplicate[events[i].courseId].counter++;
					}

				}
			}
			// Check if the user already did the homework
			if(data.eventDone != undefined && data.eventDone[events[i].id] != null && (data.eventDone[events[i].id]["checked"] || data.eventDone[events[i].id]["notifications"] == false ))
				continue;
			

			counter++;
		}
		console.log("setBadge: Total outstanding tasks: " + counter);
		if(counter>0)
			chrome.browserAction.setBadgeText({text:String(counter)});
		else
			chrome.browserAction.setBadgeText({text:""});

	});

	backgroundEvent({type:"setBadge",operationCompleted:true})
}
/***********************************
this function change the extension
icon when the user active/desactive
the extension
************************************/
function changeIcon(flag)
{
	if(flag)
		chrome.browserAction.setIcon({path: "../image/icons/jct128.png"});
	else
		chrome.browserAction.setIcon({path: "../image/icons/jctDisable.png"});
}



function mazakLogin(username,password)
{
	//Mazak inputs
	var input = {
		__EVENTARGUMENT:"",
		__EVENTTARGET:"",
		__EVENTVALIDATION:"/wEdAAetF+uTdeuF9ad4H3Y1oKlMCW8vdzVzmzgmuoYuqTP+fqct0ueWAA0YL7V6O1AochnANEsgx9K9r/2lixUqPdVYOVB//zNqTaUBR/8dOG4iyLATo2l1y7ugf3AadYP1/o1HSZucqxgKJG9VFVk9Fehc9i5wlba+qpEhMW4syJgKQI9Fcbo=",
		__SCROLLPOSITIONX:"0",
		__SCROLLPOSITIONY:"0",
		__VIEWSTATE:"/wEPDwUJODQ1NTExNDM3ZBgCBR5fX0NvbnRyb2xzUmVxdWlyZVBvc3RCYWNrS2V5X18WAgU4Y3RsMDAkY3RsMDAkQ29udGVudFBsYWNlSG9sZGVyMSRMb2dpblN0YXR1c0NvbnRyb2wkY3RsMDEFOGN0bDAwJGN0bDAwJENvbnRlbnRQbGFjZUhvbGRlcjEkTG9naW5TdGF0dXNDb250cm9sJGN0bDAzBSljdGwwMCRjdGwwMCRDb250ZW50UGxhY2VIb2xkZXIxJExvZ2luVmlldw8PZAIBZFaS5PztvvCrKjw5Qdg2KADb8t9m",
		__VIEWSTATEGENERATOR:"1806D926",
		ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$LoginControl$LoginButton:"כניסה",
		ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$LoginControl$Password:password,
		ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$LoginControl$UserName:username,
	};
	


	
	const promise = new Promise(function (resolve, reject) {
		var request =  $.post( "https://mazak.jct.ac.il/Login/Login.aspx",input);

		request.done( function(data){
			// In case the username/password are wrong the moodle return an error that is requiered to
	        // logout before login a new user
	        if($("#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolder1_lErrorFailed").text().length>0)
	        {	
	        	console.log("Mazak wrong password");
	        	backgroundEvent({type:"mazakLogin",operationCompleted:false,error:"שם המשתמש או הסיסמה שהזנת שגויים" });
	        	reject();
	        	return;
	        }
			console.log("login status ok");
			resolve("");
		});

		request.fail(function (xhr, status, error) {
			setBadge();
			console.log("login status failed, status: " + xhr.status);
			backgroundEvent({type:"login",operationCompleted:false,error:"אין חיבור למודל" });
			reject();
		});
	});
	return promise;
}

function updateTestDate(data, doIt)
{
	//Do it only 1 time in 15 days
	if(data.testDate != undefined)
	{
		var nextUpdate = data.testDate["Last update"].split('/');
		var day = parseInt(nextUpdate[0]) + 15;
		if(doIt != true && Date.parse(stringDateToDateObject(day + '/' + nextUpdate[1] + '/'+ nextUpdate[2]))<= Date.now())
			return;
	}

	mazakLogin(data.username,window.atob(data.password))
		.then(function(){
			return getFromMazakTestData();
	}).then(function(MazakData)
	{			
		DataAccess.setData("testsDate",MazakData);
	}).catch(e => {
			console.log("getFromMazakTestData promise error: " + e);
			
	});

}

function getFromMazakTestData()
{
	const promise = new Promise(function (resolve, reject) {
	    var request =  $.ajax({
	    	url:"https://mazak.jct.ac.il/Student/Tests.aspx",
			function(data) {
				var myHTML = $(data).not('script');
				
			}
	    });

	    request.done( function(data){

			var table =$(data).find("#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolder1_grdStudentTests_itemPlaceholderContainer");
			
			if($(table).length==0)
				reject("Table is empty");
			var tr = $(table).find("tr");
			if($(tr).length==0)
				reject("tr is empty");

			var test = {}
			var allTests ={}

			$(tr).each(function()
			{
				var i=0;
				var sTemp = "";
				var iTemp = 0;
				var saTemp;
				var course = "";
				var moed =0;
				$(this).find("td").each(function()
				{
				
					switch(i)
					{
						case 0:
							sTemp = $(this).text().trim();
							saTemp = sTemp.split('.');

							course = saTemp[0];
							if(allTests[course] == undefined)
							{	
								allTests[course]={};
								allTests[course]["courseYear"]=saTemp[2];
							}				
						break;

						case 2:
							if($(this).text().trim() == "מועד א")
								moed = 1;
							if($(this).text().trim() == "מועד ב")
								moed = 2;
							if($(this).text().trim() == "מועד ג")
								moed = 3;	
						break;

						case 3:
						sTemp = $(this).text().trim();
						iTemp = sTemp.indexOf(' ');
						if(Date.parse(stringDateToDateObject(sTemp.substr(0,iTemp),sTemp.substr(iTemp+1)))<Date.now())
							return false;
								allTests[course]["moed" + moed + "day" ] = sTemp.substr(0,iTemp);
								allTests[course]["moed" + moed + "time" ] = sTemp.substr(iTemp+1);
						break;

						case 5:
						sTemp = $(this).find('a').text().trim();
						if(sTemp == "בטל הרשמה")
							allTests[course]["registerToMoedBet"] = true;
						else
							if(allTests[course]["registerToMoedBet"] !=  true)
								allTests[course]["registerToMoedBet"] = false;
						break;						

					}
					i++;
				})
			});
			var date = new Date();
			allTests["Last update"] = date.getDate() + '/' + (date.getMonth()+1) + '/' + date.getFullYear();
			resolve(allTests);
							

	   });

	    request.fail(function (data) {
	    	reject("Test page conection error");
	    });

	});
	return promise;
}

function testNotifications(type)
{
	switch (type)
	{
		case 1:
			chrome.notifications.create(
				"0",{
				type: 'basic',
				requireInteraction:true,
				iconUrl: chrome.extension.getURL('image/icons/reminder.png'),
				title: ("תזכורת על שיעורי בית"),
				message: (("Test" + "\n" + "Course test" +"\n") + new Date())
			});
		break;

		case 2:
		chrome.notifications.create(
				"0",{
				type: 'basic',
				requireInteraction:true,
				iconUrl: chrome.extension.getURL('image/icons/jct128.png'),
				title: "שינוי בשיעורי בית",
				message: (("Test" + "\n" + "Course test" +"\n") + new Date())
			});
		break;
	}
}