var username;

$(document).ready(function()
{
	DataAccess.Data(onStart);

});


function onStart(data)
{
	console.log("JCT Tools->Auto login: " + data.enable)
	// Check if the username and password is not empty
	username =  data["username"];

	console.log("JCT Tools->Username: " + username);
	// Decrypting the password
	var password = "";
	if(data["password"] != null)
		password = window.atob(data["password"]);
	// Check current host
	switch(location.host)
	{
    	case "moodle.jct.ac.il":
     	  moodleConnect(password,data);
        break;
  		case "mazak.jct.ac.il":
        case "levnet.jct.ac.il":
  			if(data["mz"] && data.enable)
        		mazakConnect(password);
        break;
        case "1.1.1.1":
        case "10.1.1.1":
        case "wireless-login.jct.ac.il":
        	if(data["wf"] && data.enable)
        		wifiConnect(password);
        break;
        /*case "lev.jct.ac.il":
        	if(data["re"] && data.enable)
        		remoteConnect(password);
        break;*/
	}
}

function wifiConnect(pass)
{


	if(document.title == "Web Authentication Failure")
	{
   		alert("Web Authentication Failure!\nare you already online?\nWrong username or password?")
   		window.close();
    	return;
  	}

	$("input[name='username']").attr("value",username);
    $("input[name='password']").attr("value",pass);
	//document.forms[0].err_flag.value = 1;
    var actualCode = "submitAction();";
    var script = document.createElement('script');
    script.textContent = actualCode;
    (document.head||document.documentElement).appendChild(script);
    script.parentNode.removeChild(script);
}

function mazakConnect(pass)
{
	if($("#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolder1_LoginControl_UserName").length ==0)
		return;
	$("#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolder1_LoginControl_UserName").attr("value",username);
	$("#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolder1_LoginControl_Password").attr("value",pass);
	$("#aspnetForm input[type='submit']").click();
}

function remoteConnect(pass)
{
	if($("#username").length ==0)
		return;
	console.log("hi");
	$("#username").attr("value",username);
	$("#password").attr("value",pass);
	return;
	$("button[type='submit']").click();
}

function moodleConnect(pass,data)
{
	console.log("JCT Tools->" + "Moodle automatic login:" + data["mo"]);
	if($("#login_username").length != 0 && $("#login_password").length != 0)
	{
		if(data["mo"] && data.enable)
		{
			$("#login_username").attr("value",data.username);
			$("#login_password").attr("value",pass);
			$("#login input[value='התחברות'][type='submit']").click();

		}
	}
	else
	{
		console.log("JCT Tools->" + "Moodle hide user events: " + data.Config["MoodleHiddeUE"]);
		//var coursesTable = $("#frontpage-course-list").html();


		if (undefined == data )
			data = {}

		if(data.Config == undefined)
			data.Config = {}

		hideCourses(data.moodleCoursesTable,data.Config.hiddeModdelHelp);
		
		if(data.Config["MoodleHiddeUE"] && data["mo"] && data.enable)
			$(".event").each(function(){
				if($("img[alt='אירוע משתמש']").length > 0)
					$(this).remove();
			});

		if(data.Config["moodleTopic"] && data["mo"] && data.enable)
			$(".sitetopic").remove();

		
	}


}