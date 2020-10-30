$('#btnChangePassword').click(function (event) {
    event.preventDefault();
    var password = $("#password").val();
    var confirm_password = $("#confirm_password").val();
    if( password == "" || password == undefined || confirm_password == "" || confirm_password == undefined){
        $("#messageWrapper").html("<div class='alert alert-danger'> Please enter required fields.</div>")
        $("#messageWrapper").show();
        return false;
    }
    if( password.length < 8 ){
        $("#messageWrapper").html("<div class='alert alert-danger'> Password length should be 8 character or more.</div>")
        $("#messageWrapper").show();
        return false;
    }
    if( password != confirm_password ){
        $("#messageWrapper").html("<div class='alert alert-danger'> Password and confirm password should be same.</div>")
        $("#messageWrapper").show();
        return false;
    }


    $.ajax({
        url : "/api/v1/auth/change_password",
        data : {
            password : password,
            token : $("#forgot_token").val()            
        },
        type:"post",
        success:function(su){
            if( su.status == 200 ){
                $("#messageWrapper").html("<div class='alert alert-success'>"+su.message+"</div>")
                $("#messageWrapper").show();
                $("#frmChangePassword").remove();
                return false;
            }
            if( su.status == 500 ){
                $("#messageWrapper").html("<div class='alert alert-error'>"+su.message+"</div>")
                $("#messageWrapper").show();
                return false;
            }
        },
        error:function(err){
            $("#messageWrapper").html("<div class='alert alert-error'>"+su.message+"</div>")
            $("#messageWrapper").show();
            return false;
        }
    })
});